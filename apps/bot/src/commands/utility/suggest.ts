import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { SuggestionModule } from "../../modules/suggestions/index.js";
import { BotEmbed } from "../../utils/embed-builder.js";
import type { TortugaCommand } from "../../types.js";
import type { TortugaClient } from "../../client.js";

export const suggestCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit a suggestion for community voting and feedback")
    .addStringOption((opt) =>
      opt.setName("suggestion").setDescription("Your idea or suggestion").setRequired(true)
    ),
  category: "Utility",
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const text = interaction.options.getString("suggestion", true);
    const channel = interaction.channel as TextChannel;

    if (!channel || !channel.isTextBased()) {
      await interaction.reply({
        embeds: [BotEmbed.error("Error", "Suggestions can only be submitted in text channels.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const record = await SuggestionModule.submit(channel, interaction.user, text, client);
      await interaction.editReply({
        embeds: [
          BotEmbed.success(
            "Suggestion Submitted",
            `Your suggestion **#${record.suggestionNumber}** has been posted to <#${channel.id}>!`
          ),
        ],
      });
    } catch (err: any) {
      await interaction.editReply({
        embeds: [BotEmbed.error("Submission Failed", err.message || "Could not submit suggestion.")],
      });
    }
  },
};
