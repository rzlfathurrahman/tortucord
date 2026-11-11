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

export const kickCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The member to kick").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for kicking").setRequired(false)
    ),
  category: "Moderation",
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const guild = interaction.guild!;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({
        embeds: [BotEmbed.error("User Not Found", "The specified user is not in this server.")],
        ephemeral: true,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        embeds: [BotEmbed.error("Permission Error", "I do not have permission to kick this member.")],
        ephemeral: true,
      });
      return;
    }

    if (member.roles.highest.position >= (interaction.member as GuildMember).roles.highest.position) {
      await interaction.reply({
        embeds: [BotEmbed.error("Hierarchy Error", "You cannot kick a member with an equal or higher role.")],
        ephemeral: true,
      });
      return;
    }

    // Attempt DM before kicking
    await user
      .send(`👢 You have been kicked from **${guild.name}**.\n**Reason:** ${reason}`)
      .catch(() => null);

    await member.kick(reason);

    const infraction = await DatabaseService.createInfraction({
      guildId: guild.id,
      userId: user.id,
      modId: interaction.user.id,
      action: InfractionAction.KICK,
      reason,
    });

    await interaction.reply({
      embeds: [
        BotEmbed.success(
          `Member Kicked (Case #${infraction?.caseId ?? 1})`,
          `**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`
        ),
      ],
    });
  },
};
