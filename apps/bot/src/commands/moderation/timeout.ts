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

export const timeoutCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Temporarily mute/timeout a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The member to timeout").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("duration")
        .setDescription("Duration in minutes (e.g. 5, 10, 60, 1440)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for the timeout").setRequired(false)
    ),
  category: "Moderation",
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const user = interaction.options.getUser("user", true);
    const durationMins = interaction.options.getInteger("duration", true);
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
        embeds: [BotEmbed.error("Hierarchy Error", "You cannot timeout a member with an equal or higher role.")],
        ephemeral: true,
      });
      return;
    }

    const durationMs = durationMins * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs);

    await member.timeout(durationMs, reason);

    const infraction = await DatabaseService.createInfraction({
      guildId: guild.id,
      userId: user.id,
      modId: interaction.user.id,
      action: InfractionAction.TIMEOUT,
      reason: `${reason} (${durationMins}m)`,
      expiresAt,
    });

    await user
      .send(`🔇 You have been timed out in **${guild.name}** for **${durationMins} minutes**.\n**Reason:** ${reason}`)
      .catch(() => null);

    await interaction.reply({
      embeds: [
        BotEmbed.success(
          `Member Timed Out (Case #${infraction?.caseId ?? 1})`,
          `**User:** ${user.tag} (${user.id})\n**Duration:** ${durationMins} minutes\n**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>\n**Reason:** ${reason}`
        ),
      ],
    });
  },
};
