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

export const stickyCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("sticky")
    .setDescription("Manage sticky messages that stick to the bottom of the channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a sticky message for this channel")
        .addStringOption((opt) =>
          opt.setName("message").setDescription("The message text to keep sticky").setRequired(true)
        )
        .addChannelOption((opt) =>
          opt.setName("channel").setDescription("Target channel (defaults to current)").setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName("cooldown").setDescription("Debounce cooldown in seconds (default 5)").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove sticky message from this channel")
        .addChannelOption((opt) =>
          opt.setName("channel").setDescription("Target channel (defaults to current)").setRequired(false)
        )
    ),
  category: "Utility",
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild!;
    const targetChannel =
      (interaction.options.getChannel("channel") as TextChannel) ||
      (interaction.channel as TextChannel);

    if (subcommand === "set") {
      const messageText = interaction.options.getString("message", true);
      const cooldown = interaction.options.getInteger("cooldown") || 5;

      await DatabaseService.setStickyMessage(guild.id, targetChannel.id, messageText, cooldown);

      // Post initial message
      const posted = await targetChannel.send({ content: messageText });
      await DatabaseService.updateStickyLastMessage(guild.id, targetChannel.id, posted.id);

      await interaction.reply({
        embeds: [
          BotEmbed.success(
            "Sticky Message Activated",
            `Sticky message set in <#${targetChannel.id}> with a **${cooldown}s** debounce cooldown.`
          ),
        ],
        ephemeral: true,
      });
    } else if (subcommand === "remove") {
      const existing = await DatabaseService.getStickyMessage(guild.id, targetChannel.id);
      if (existing && existing.lastMessageId) {
        const oldMsg = await targetChannel.messages.fetch(existing.lastMessageId).catch(() => null);
        if (oldMsg && oldMsg.deletable) {
          await oldMsg.delete().catch(() => null);
        }
      }

      await DatabaseService.deleteStickyMessage(guild.id, targetChannel.id);

      await interaction.reply({
        embeds: [
          BotEmbed.success(
            "Sticky Message Removed",
            `Sticky message removed from <#${targetChannel.id}>.`
          ),
        ],
        ephemeral: true,
      });
    }
  },
};
