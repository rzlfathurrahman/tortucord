import { Message, TextChannel } from "discord.js";
import { DatabaseService } from "../../utils/db-fallback.js";
import { logger } from "../../utils/logger.js";
import type { TortugaClient } from "../../client.js";

export class StickyModule {
  /**
   * Check and repost sticky message at the bottom of the channel.
   */
  public static async onMessage(
    message: Message,
    client: TortugaClient
  ): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const channelId = message.channel.id;
    const guildId = message.guild.id;

    // Check if channel has an active sticky message
    const sticky = await DatabaseService.getStickyMessage(guildId, channelId);
    if (!sticky || !sticky.isActive || !sticky.content) return;

    // Avoid self-triggering
    if (sticky.lastMessageId === message.id) return;

    // Distributed Redis Lock/Cooldown to prevent rate limits
    const lockKey = `sticky:lock:${channelId}`;
    const acquired = await client.redis.acquireLock(lockKey, sticky.cooldownSec || 5);
    if (!acquired) {
      // Cooldown in effect, do not spam reposts
      return;
    }

    try {
      const channel = message.channel as TextChannel;
      if (!channel.isTextBased()) return;

      // 1. Delete previous sticky message if found
      if (sticky.lastMessageId) {
        try {
          const oldMsg = await channel.messages.fetch(sticky.lastMessageId).catch(() => null);
          if (oldMsg && oldMsg.deletable) {
            await oldMsg.delete().catch(() => null);
          }
        } catch {
          // Ignored
        }
      }

      // 2. Repost the sticky message
      const newMsg = await channel.send({
        content: sticky.content,
      });

      // 3. Update lastMessageId in store
      await DatabaseService.updateStickyLastMessage(guildId, channelId, newMsg.id);
    } catch (err) {
      logger.error(`Failed to handle sticky message in channel ${channelId}`, err);
    }
  }
}
