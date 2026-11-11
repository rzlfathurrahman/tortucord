import {
  Message,
  GuildMember,
  TextChannel,
  User,
  EmbedBuilder,
} from "discord.js";
import { DatabaseService } from "../../utils/db-fallback.js";
import { BotEmbed, EMBED_COLORS } from "../../utils/embed-builder.js";
import { XpCalculator } from "./xp-calculator.js";
import { logger } from "../../utils/logger.js";
import type { TortugaClient } from "../../client.js";

export class LevelingModule {
  private static voiceIntervalStarted = false;

  /**
   * Handle XP rewards on message creation with cooldown.
   */
  public static async onMessage(
    message: Message,
    client: TortugaClient
  ): Promise<void> {
    if (!message.guild || message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const member = message.member;
    if (!member) return;

    const config = await DatabaseService.getLevelingConfig(guildId);
    if (!config || !config.enabled) return;

    // Check channel and role blacklists
    if (config.noXpChannels && config.noXpChannels.includes(message.channel.id)) return;
    if (config.noXpRoles && member.roles.cache.some((r) => config.noXpRoles.includes(r.id))) return;

    // Check 60-second cooldown via Redis
    const cooldownKey = `xp:cd:${guildId}:${userId}`;
    const acquired = await client.redis.acquireLock(cooldownKey, config.cooldownSec || 60);
    if (!acquired) {
      return; // Under cooldown
    }

    // Calculate XP to grant
    const min = config.minXpPerMsg || 15;
    const max = config.maxXpPerMsg || 25;
    const base = Math.floor(Math.random() * (max - min + 1)) + min;
    const multiplier = config.xpRateMultiplier || 1.0;
    const xpToAdd = Math.round(base * multiplier);

    // Fetch existing XP
    const record = await DatabaseService.getUserXp(guildId, userId);
    const oldXp = Number(record.xp);
    const newXp = oldXp + xpToAdd;

    const oldProgress = XpCalculator.getLevelProgress(oldXp);
    const newProgress = XpCalculator.getLevelProgress(newXp);

    const didLevelUp = newProgress.level > oldProgress.level;

    // Save XP
    await DatabaseService.addUserXp(
      guildId,
      userId,
      xpToAdd,
      didLevelUp ? newProgress.level : undefined,
      false
    );

    if (didLevelUp) {
      await this.handleLevelUp(message, member, newProgress.level, config, client);
    }
  }

  /**
   * Handle level up announcements and role rewards.
   */
  private static async handleLevelUp(
    message: Message,
    member: GuildMember,
    newLevel: number,
    config: any,
    client: TortugaClient
  ): Promise<void> {
    // 1. Send Level-up announcement
    const template =
      config.levelUpMessage ||
      "Congratulations {user.mention}, you leveled up to **level {level}**! 🎉";
    const announcement = template
      .replace(/\{user\.mention\}/g, member.toString())
      .replace(/\{user\}/g, member.user.username)
      .replace(/\{level\}/g, String(newLevel));

    let targetChannel = message.channel as TextChannel;
    if (config.levelUpChannelId) {
      const specified = client.channels.cache.get(config.levelUpChannelId) as TextChannel;
      if (specified && specified.isTextBased()) {
        targetChannel = specified;
      }
    }

    await targetChannel.send({ content: announcement }).catch(() => null);

    // 2. Check and assign Role Rewards
    if (config.rewards && Array.isArray(config.rewards)) {
      for (const reward of config.rewards) {
        if (reward.level === newLevel) {
          await member.roles.add(reward.roleId).catch(() => null);
        } else if (reward.removeOnHigher && reward.level < newLevel) {
          // Remove lower rewards if removeOnHigher is true
          if (member.roles.cache.has(reward.roleId)) {
            await member.roles.remove(reward.roleId).catch(() => null);
          }
        }
      }
    }
  }

  /**
   * Start background tracking for voice XP.
   */
  public static startVoiceXpTracking(client: TortugaClient): void {
    if (this.voiceIntervalStarted) return;
    this.voiceIntervalStarted = true;

    // Check voice states every 60 seconds
    setInterval(async () => {
      try {
        for (const guild of client.guilds.cache.values()) {
          const config = await DatabaseService.getLevelingConfig(guild.id);
          if (!config || !config.enabled) continue;

          for (const channel of guild.channels.cache.values()) {
            if (!channel.isVoiceBased()) continue;
            // Channel must have at least 2 non-bot members to prevent AFK solo farming
            const activeMembers = channel.members.filter(
              (m) => !m.user.bot && !m.voice.deaf && !m.voice.mute
            );
            if (activeMembers.size < 2) continue;

            for (const member of activeMembers.values()) {
              const voiceXp = Math.round(10 * (config.xpRateMultiplier || 1.0));
              const record = await DatabaseService.getUserXp(guild.id, member.id);
              const oldXp = Number(record.xp);
              const newXp = oldXp + voiceXp;

              const oldProg = XpCalculator.getLevelProgress(oldXp);
              const newProg = XpCalculator.getLevelProgress(newXp);

              await DatabaseService.addUserXp(
                guild.id,
                member.id,
                voiceXp,
                newProg.level > oldProg.level ? newProg.level : undefined,
                true
              );
            }
          }
        }
      } catch (err) {
        logger.error("Error during voice XP cycle", err);
      }
    }, 60_000).unref();
  }

  /**
   * Generate Rank Card embed for a user.
   */
  public static async getRankEmbed(
    guildId: string,
    user: User,
    member?: GuildMember | null
  ): Promise<EmbedBuilder> {
    const record = await DatabaseService.getUserXp(guildId, user.id);
    const rank = await DatabaseService.getUserRank(guildId, user.id);
    const progress = XpCalculator.getLevelProgress(record.xp);
    const bar = XpCalculator.generateProgressBar(progress.percent);

    return BotEmbed.base()
      .setColor(EMBED_COLORS.primary)
      .setAuthor({
        name: `${user.username}'s Rank Card`,
        iconURL: user.displayAvatarURL(),
      })
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "🏆 Rank", value: rank > 0 ? `#${rank}` : "Unranked", inline: true },
        { name: "⭐ Level", value: `${progress.level}`, inline: true },
        { name: "✨ Total XP", value: `${record.xp.toLocaleString()}`, inline: true },
        {
          name: "📈 Progress to Next Level",
          value: `${bar}\n${progress.currentLevelXp.toLocaleString()} / ${progress.neededLevelXp.toLocaleString()} XP`,
          inline: false,
        },
        {
          name: "💬 Messages Sent",
          value: `${record.messagesCount.toLocaleString()}`,
          inline: true,
        },
        {
          name: "🎙️ Voice Time",
          value: `${record.voiceMinutes} mins`,
          inline: true,
        }
      );
  }

  /**
   * Generate Leaderboard embed for a guild.
   */
  public static async getLeaderboardEmbed(
    guildId: string,
    guildName: string
  ): Promise<EmbedBuilder> {
    const topUsers = await DatabaseService.getLeaderboard(guildId, 10);

    const embed = BotEmbed.base()
      .setColor(EMBED_COLORS.gold)
      .setTitle(`🏆 ${guildName} — Leveling Leaderboard`)
      .setDescription("Top active members ranked by accumulated experience points.");

    if (topUsers.length === 0) {
      embed.setDescription("No ranked members found in this server yet.");
      return embed;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = topUsers.map((entry, index) => {
      const medal = medals[index] || `\`#${index + 1}\``;
      const progress = XpCalculator.getLevelProgress(entry.xp);
      return `${medal} <@${entry.userId}> — **Level ${progress.level}** (${Number(entry.xp).toLocaleString()} XP)`;
    });

    embed.setDescription(lines.join("\n\n"));
    return embed;
  }
}
