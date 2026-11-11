import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { BotEmbed } from "../../utils/embed-builder.js";
import type { TortugaCommand } from "../../types.js";
import type { TortugaClient } from "../../client.js";

export const purgeCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete messages in the current channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Number of messages to delete (1 to 100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Only delete messages from this specific user")
        .setRequired(false)
    ),
  category: "Moderation",
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const amount = interaction.options.getInteger("amount", true);
    const filterUser = interaction.options.getUser("user");
    const channel = interaction.channel as TextChannel;

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        embeds: [BotEmbed.error("Error", "This command can only be used in text channels.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await channel.messages.fetch({ limit: amount });
      const filtered = filterUser
        ? messages.filter((m) => m.author.id === filterUser.id)
        : messages;

      const deleted = await channel.bulkDelete(filtered, true);

      await interaction.editReply({
        embeds: [
          BotEmbed.success(
            "Purge Complete",
            `Successfully deleted **${deleted.size}** message(s)${filterUser ? ` from ${filterUser.tag}` : ""}.`
          ),
        ],
      });
    } catch (err: any) {
      await interaction.editReply({
        embeds: [
          BotEmbed.error(
            "Purge Failed",
            err.message || "Failed to purge messages. Note: Discord does not allow deleting messages older than 14 days."
          ),
        ],
      });
    }
  },
};
