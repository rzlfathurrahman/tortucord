import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { DatabaseService } from "../../utils/db-fallback.js";
import { BotEmbed } from "../../utils/embed-builder.js";
import type { TortugaCommand } from "../../types.js";
import type { TortugaClient } from "../../client.js";

export const starboardCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("starboard")
    .setDescription("Configure the server starboard system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Channel where starred messages are posted").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("threshold").setDescription("Reaction count to qualify (default 3)").setMinValue(1).setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("emoji").setDescription("Reaction emoji (default ⭐)").setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt.setName("self_star").setDescription("Allow authors to star their own messages").setRequired(false)
    ),
  category: "Utility",
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const channel = interaction.options.getChannel("channel", true) as TextChannel;
    const threshold = interaction.options.getInteger("threshold") ?? 3;
    const emoji = interaction.options.getString("emoji") ?? "⭐";
    const selfStar = interaction.options.getBoolean("self_star") ?? false;
    const guild = interaction.guild!;

    await DatabaseService.setStarboardConfig({
      guildId: guild.id,
      channelId: channel.id,
      threshold,
      emoji,
      selfStar,
    });

    await interaction.reply({
      embeds: [
        BotEmbed.success(
          "Starboard Configured",
          `⭐ Starboard channel set to <#${channel.id}>\n**Threshold:** ${threshold} ${emoji}\n**Self-Star:** ${selfStar ? "Allowed" : "Disabled"}`
        ),
      ],
    });
  },
};
