import {
  MessageReaction,
  User,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import { DatabaseService } from "../../utils/db-fallback.js";
import { EMBED_COLORS } from "../../utils/embed-builder.js";
import { logger } from "../../utils/logger.js";
import type { TortugaClient } from "../../client.js";

export class StarboardModule {
  /**
   * Handle reaction addition for Starboard.
   */
  public static async handleReaction(
    reaction: MessageReaction,
    user: User,
    client: TortugaClient
  ): Promise<void> {
    if (user.bot || !reaction.message.guild) return;

    const guildId = reaction.message.guild.id;
    const config = await DatabaseService.getStarboardConfig(guildId);
    if (!config || !config.enabled || !config.channelId) return;

    // Check emoji match
    const targetEmoji = config.emoji || "⭐";
    if (reaction.emoji.name !== targetEmoji && reaction.emoji.id !== targetEmoji) {
      return;
    }

    const message = reaction.message;
    // Check self-starring
    if (!config.selfStar && message.author?.id === user.id) {
      return;
    }

    // Check ignored channels
    if (config.ignoredChannels && config.ignoredChannels.includes(message.channel.id)) {
      return;
    }

    const starCount = reaction.count ?? 0;
    const threshold = config.threshold || 3;

    const starboardChannel = client.channels.cache.get(config.channelId) as TextChannel | undefined;
    if (!starboardChannel || !starboardChannel.isTextBased()) return;

    const existing = await DatabaseService.getStarboardMessage(guildId, message.id);

    if (starCount >= threshold) {
      const embed = this.buildStarboardEmbed(message, starCount);
      const topContent = `⭐ **${starCount}** <#${message.channel.id}> (ID: ${message.id})`;

      if (existing && existing.starboardMessageId) {
        // Update existing starboard message
        try {
          const starMsg = await starboardChannel.messages.fetch(existing.starboardMessageId).catch(() => null);
          if (starMsg) {
            await starMsg.edit({ content: topContent, embeds: [embed] });
            await DatabaseService.saveStarboardMessage({
              guildId,
              originalMessageId: message.id,
              starboardMessageId: existing.starboardMessageId,
              channelId: message.channel.id,
              authorId: message.author?.id ?? user.id,
              starCount,
            });
            return;
          }
        } catch {
          // If fetch fails, repost below
        }
      }

      // Post new starboard message
      const posted = await starboardChannel.send({
        content: topContent,
        embeds: [embed],
      });

      await DatabaseService.saveStarboardMessage({
        guildId,
        originalMessageId: message.id,
        starboardMessageId: posted.id,
        channelId: message.channel.id,
        authorId: message.author?.id ?? user.id,
        starCount,
      });
    } else if (starCount < threshold && existing && existing.starboardMessageId) {
      // If stars dropped below threshold, remove or update
      try {
        const starMsg = await starboardChannel.messages.fetch(existing.starboardMessageId).catch(() => null);
        if (starMsg) {
          if (starCount <= 0) {
            await starMsg.delete().catch(() => null);
          } else {
            const topContent = `⭐ **${starCount}** <#${message.channel.id}> (ID: ${message.id})`;
            await starMsg.edit({ content: topContent });
          }
        }
      } catch {
        // Ignored
      }
    }
  }

  private static buildStarboardEmbed(message: any, starCount: number): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.gold)
      .setAuthor({
        name: message.author ? message.author.tag : "Unknown User",
        iconURL: message.author ? message.author.displayAvatarURL() : undefined,
      })
      .setDescription(message.content ? message.content : "*[No message text]*")
      .addFields({
        name: "Original Message",
        value: `[Jump to message](${message.url})`,
        inline: false,
      })
      .setTimestamp(message.createdAt);

    // Attach first image if present
    const imageAttachment = message.attachments?.find((att: any) =>
      att.contentType?.startsWith("image/")
    );
    if (imageAttachment) {
      embed.setImage(imageAttachment.url);
    }

    return embed;
  }
}
