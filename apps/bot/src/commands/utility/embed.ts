import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import { BotEmbed, EMBED_COLORS } from "../../utils/embed-builder.js";
import type { TortugaCommand } from "../../types.js";
import type { TortugaClient } from "../../client.js";

export const embedCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Build and send a custom rich embed message")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((opt) =>
      opt.setName("title").setDescription("Title of the embed").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("description").setDescription("Body text / description").setRequired(true)
    )
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Target channel to send the embed").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("color").setDescription("Hex color code (e.g. #10b981, #5865F2, #ef4444)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("image").setDescription("Image URL").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("thumbnail").setDescription("Thumbnail URL").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("footer").setDescription("Footer text").setRequired(false)
    ),
  category: "Utility",
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description", true);
    const targetChannel =
      (interaction.options.getChannel("channel") as TextChannel) ||
      (interaction.channel as TextChannel);
    const colorHex = interaction.options.getString("color");
    const imageUrl = interaction.options.getString("image");
    const thumbnailUrl = interaction.options.getString("thumbnail");
    const footerText = interaction.options.getString("footer");

    let color = EMBED_COLORS.primary;
    if (colorHex) {
      const parsed = parseInt(colorHex.replace("#", ""), 16);
      if (!isNaN(parsed)) color = parsed;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description.replace(/\\n/g, "\n"))
      .setTimestamp();

    if (imageUrl) embed.setImage(imageUrl);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
    if (footerText) embed.setFooter({ text: footerText });

    await targetChannel.send({ embeds: [embed] });

    await interaction.reply({
      content: `✅ Embed sent to <#${targetChannel.id}>!`,
      ephemeral: true,
    });
  },
};
