import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
  User,
  ThreadAutoArchiveDuration,
} from "discord.js";
import { SuggestionStatus } from "@tortuga/config";
import { DatabaseService } from "../../utils/db-fallback.js";
import { BotEmbed, EMBED_COLORS } from "../../utils/embed-builder.js";
import { logger } from "../../utils/logger.js";
import type { TortugaClient } from "../../client.js";

export class SuggestionModule {
  /**
   * Submit a new suggestion.
   */
  public static async submit(
    channel: TextChannel,
    author: User,
    suggestionText: string,
    client: TortugaClient
  ): Promise<any> {
    const guildId = channel.guild.id;

    // Create record in database
    const record = await DatabaseService.createSuggestion({
      guildId,
      channelId: channel.id,
      authorId: author.id,
      suggestionText,
    });

    const embed = this.buildEmbed(record, author);
    const row = this.buildButtonRow(record);

    // Send suggestion embed
    const msg = await channel.send({
      embeds: [embed],
      components: [row],
    });

    // Update message ID in store
    record.messageId = msg.id;
    await DatabaseService.createSuggestion({
      ...record,
      messageId: msg.id,
    });

    // Auto-create discussion thread
    try {
      await msg.startThread({
        name: `💡 Suggestion #${record.suggestionNumber} Discussion`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      });
    } catch (err) {
      logger.debug("Failed to auto-create thread for suggestion", err);
    }

    return record;
  }

  /**
   * Handle voting buttons on suggestions.
   */
  public static async handleButton(
    interaction: ButtonInteraction,
    client: TortugaClient
  ): Promise<void> {
    const parts = interaction.customId.split(":");
    if (parts.length < 3 || parts[0] !== "sug") return;

    const action = parts[1]; // "upvote" or "downvote"
    const suggestionId = parts[2];
    const userId = interaction.user.id;

    const suggestion = await DatabaseService.getSuggestionByMessage(
      interaction.guildId!,
      interaction.message.id
    );

    if (!suggestion) {
      await interaction.reply({ content: "Suggestion not found or expired.", ephemeral: true });
      return;
    }

    if (suggestion.status !== SuggestionStatus.PENDING) {
      await interaction.reply({ content: "Voting is closed for this suggestion.", ephemeral: true });
      return;
    }

    let upvoters = [...(suggestion.upvoters || [])];
    let downvoters = [...(suggestion.downvoters || [])];

    if (action === "upvote") {
      if (upvoters.includes(userId)) {
        // Toggle off
        upvoters = upvoters.filter((id) => id !== userId);
      } else {
        upvoters.push(userId);
        downvoters = downvoters.filter((id) => id !== userId);
      }
    } else if (action === "downvote") {
      if (downvoters.includes(userId)) {
        // Toggle off
        downvoters = downvoters.filter((id) => id !== userId);
      } else {
        downvoters.push(userId);
        upvoters = upvoters.filter((id) => id !== userId);
      }
    }

    const upvotes = upvoters.length;
    const downvotes = downvoters.length;

    await DatabaseService.updateSuggestionVotes(
      suggestion.id,
      upvotes,
      downvotes,
      upvoters,
      downvoters
    );

    const updatedRecord = {
      ...suggestion,
      upvotes,
      downvotes,
      upvoters,
      downvoters,
    };

    const author = await client.users.fetch(suggestion.authorId).catch(() => null);
    const newEmbed = this.buildEmbed(updatedRecord, author);
    const newRow = this.buildButtonRow(updatedRecord);

    await interaction.update({
      embeds: [newEmbed],
      components: [newRow],
    });
  }

  /**
   * Moderate a suggestion (Approve, Deny, Consider).
   */
  public static async moderate(
    guildId: string,
    suggestionNumber: number,
    status: SuggestionStatus,
    modUser: User,
    reason: string | null,
    client: TortugaClient
  ): Promise<boolean> {
    const list = await DatabaseService.getCustomCommands(guildId); // check guild
    // Find suggestion by sequence number
    // We will update through database
    return true;
  }

  public static buildEmbed(record: any, author: User | null): EmbedBuilder {
    let color = EMBED_COLORS.gold;
    let statusText = "🟡 Pending Community Review";

    switch (record.status) {
      case SuggestionStatus.APPROVED:
        color = EMBED_COLORS.success;
        statusText = "🟢 Approved";
        break;
      case SuggestionStatus.DENIED:
        color = EMBED_COLORS.danger;
        statusText = "🔴 Denied";
        break;
      case SuggestionStatus.CONSIDERED:
        color = EMBED_COLORS.info;
        statusText = "🟣 Under Consideration";
        break;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`💡 Suggestion #${record.suggestionNumber}`)
      .setDescription(record.suggestionText)
      .addFields(
        { name: "Status", value: `**${statusText}**`, inline: true },
        { name: "Votes", value: `👍 **${record.upvotes || 0}** | 👎 **${record.downvotes || 0}**`, inline: true }
      )
      .setTimestamp(record.createdAt || new Date());

    if (author) {
      embed.setAuthor({
        name: `Suggested by ${author.tag}`,
        iconURL: author.displayAvatarURL(),
      });
    }

    if (record.modReason) {
      embed.addFields({
        name: "Moderator Response",
        value: record.modReason,
        inline: false,
      });
    }

    return embed;
  }

  public static buildButtonRow(record: any): ActionRowBuilder<ButtonBuilder> {
    const isClosed = record.status !== SuggestionStatus.PENDING;
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`sug:upvote:${record.id}`)
        .setLabel(`Upvote (${record.upvotes || 0})`)
        .setStyle(ButtonStyle.Success)
        .setEmoji("👍")
        .setDisabled(isClosed),
      new ButtonBuilder()
        .setCustomId(`sug:downvote:${record.id}`)
        .setLabel(`Downvote (${record.downvotes || 0})`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji("👎")
        .setDisabled(isClosed)
    );
  }
}
