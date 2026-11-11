import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { InfractionAction } from "@tortuga/config";
import { DatabaseService } from "../../utils/db-fallback.js";
import { BotEmbed } from "../../utils/embed-builder.js";
import type { TortugaCommand } from "../../types.js";
import type { TortugaClient } from "../../client.js";

export const banCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for the ban").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("delete_days")
        .setDescription("Days of messages to delete (0 to 7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),
  category: "Moderation",
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
    const guild = interaction.guild!;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member) {
      if (!member.bannable) {
        await interaction.reply({
          embeds: [BotEmbed.error("Permission Error", "I do not have permission to ban this member.")],
          ephemeral: true,
        });
        return;
      }

      if (member.roles.highest.position >= (interaction.member as GuildMember).roles.highest.position) {
        await interaction.reply({
          embeds: [BotEmbed.error("Hierarchy Error", "You cannot ban a member with an equal or higher role.")],
          ephemeral: true,
        });
        return;
      }

      await user
        .send(`🔨 You have been banned from **${guild.name}**.\n**Reason:** ${reason}`)
        .catch(() => null);
    }

    await guild.members.ban(user.id, {
      reason,
      deleteMessageSeconds: deleteDays * 86400,
    });

    const infraction = await DatabaseService.createInfraction({
      guildId: guild.id,
      userId: user.id,
      modId: interaction.user.id,
      action: InfractionAction.BAN,
      reason,
    });

    await interaction.reply({
      embeds: [
        BotEmbed.success(
          `User Banned (Case #${infraction?.caseId ?? 1})`,
          `**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag}\n**Delete Messages:** ${deleteDays} days\n**Reason:** ${reason}`
        ),
      ],
    });
  },
};
