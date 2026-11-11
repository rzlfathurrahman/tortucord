import { Interaction } from "discord.js";
import type { TortugaEvent } from "../types.js";
import { logger } from "../utils/logger.js";
import { BotEmbed } from "../utils/embed-builder.js";
import { ReactionRoleModule } from "../modules/reaction-roles/index.js";
import { AutomodModule } from "../modules/automod/index.js";
import { SuggestionModule } from "../modules/suggestions/index.js";

export const interactionCreateEvent: TortugaEvent<"interactionCreate"> = {
  name: "interactionCreate",
  async execute(client, interaction: Interaction) {
    try {
      // 1. Slash Commands
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          logger.warn(`Received unknown slash command /${interaction.commandName}`);
          return;
        }

        try {
          await command.execute(interaction, client);
        } catch (err: any) {
          logger.error(`Error executing command /${interaction.commandName}`, err);
          const errorEmbed = BotEmbed.error(
            "Execution Error",
            "An error occurred while executing this command."
          );

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
          } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
          }
        }
        return;
      }

      // 2. Buttons
      if (interaction.isButton()) {
        const customId = interaction.customId;

        // Reaction Roles button
        if (customId.startsWith("rr:btn:")) {
          await ReactionRoleModule.handleButton(interaction, client);
          return;
        }

        // Drama Watcher button
        if (customId.startsWith("automod:drama:")) {
          await AutomodModule.handleDramaButton(interaction, client);
          return;
        }

        // Suggestion voting button
        if (customId.startsWith("sug:")) {
          await SuggestionModule.handleButton(interaction, client);
          return;
        }

        // Support Tickets button
        if (customId.startsWith("ticket_open:")) {
          const guildId = customId.split(":")[1];
          const { TicketModule } = await import("../modules/tickets/index.js");
          await TicketModule.handleOpenButton(interaction, client, guildId);
          return;
        }

        if (customId.startsWith("ticket_close:")) {
          const ticketId = customId.split(":")[1];
          const { TicketModule } = await import("../modules/tickets/index.js");
          await TicketModule.handleCloseButton(interaction, client, ticketId);
          return;
        }

        return;
      }

      // 3. Modal Submissions
      if (interaction.isModalSubmit()) {
        return;
      }

      // 4. String Select Menu
      if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;

        // Reaction Roles select menu
        if (customId.startsWith("rr:select:")) {
          await ReactionRoleModule.handleSelectMenu(interaction, client);
          return;
        }

        // Help category select menu
        if (customId === "help:category") {
          const selected = interaction.values[0] || "overview";
          const { buildHelpEmbed, buildHelpComponents } = await import("../commands/utility/help.js");
          const embed = buildHelpEmbed(selected, client.user);
          const [selectRow, buttonRow] = buildHelpComponents();
          await interaction.update({
            embeds: [embed],
            components: [selectRow, buttonRow],
          });
          return;
        }

        return;
      }
    } catch (err) {
      logger.error("Error processing interaction", err);
    }
  },
};
