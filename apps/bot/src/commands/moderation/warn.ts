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

export const warnCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a formal warning to a server member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The member to warn").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for the warning").setRequired(false)
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

    if (member.roles.highest.position >= (interaction.member as GuildMember).roles.highest.position) {
      await interaction.reply({
        embeds: [BotEmbed.error("Hierarchy Error", "You cannot warn a member with an equal or higher role.")],
        ephemeral: true,
      });
      return;
    }

    const infraction = await DatabaseService.createInfraction({
      guildId: guild.id,
      userId: user.id,
      modId: interaction.user.id,
      action: InfractionAction.WARN,
      reason,
    });

    // Notify user via DM if possible
    await user
      .send(`⚠️ You were warned in **${guild.name}** for: **${reason}**`)
      .catch(() => null);

    await interaction.reply({
      embeds: [
        BotEmbed.success(
          `Member Warned (Case #${infraction?.caseId ?? 1})`,
          `**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`
        ),
      ],
    });
  },
};
