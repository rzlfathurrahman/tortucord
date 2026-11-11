import { prisma } from "@tortuga/database";
import { logger } from "./logger.js";
import {
  ReactionRoleType,
  AutomodAction,
  SuggestionStatus,
  InfractionAction,
} from "@tortuga/config";

// In-memory fallback structures when PostgreSQL is unreachable
const memoryGuilds = new Map<string, any>();
const memoryReactionRoleGroups = new Map<string, any>();
const memoryReactionRoleItems = new Map<string, any[]>();
const memoryStickyMessages = new Map<string, any>();
const memoryUserXp = new Map<string, any>(); // key: `${guildId}:${userId}`
const memoryLevelConfigs = new Map<string, any>();
const memoryLevelRewards = new Map<string, any[]>();
const memoryAutomodConfigs = new Map<string, any>();
const memoryInfractions = new Map<string, any[]>();
const memoryStarboardConfigs = new Map<string, any>();
const memoryStarboardMessages = new Map<string, any>();
const memorySuggestions = new Map<string, any>();
const memoryLoggingConfigs = new Map<string, any>();
const memoryWeblogs: any[] = [];
const memoryCustomCommands = new Map<string, any[]>();

let dbConnected = true;
let warnedDb = false;

function handleDbError(operation: string, err: any): void {
  dbConnected = false;
  if (!warnedDb) {
    logger.warn(`Postgres connection unavailable during ${operation}. Using in-memory database fallback.`);
    warnedDb = true;
  }
}

export class DatabaseService {
  /**
   * Test database connectivity at startup.
   */
  public static async checkConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
      logger.success("Connected to PostgreSQL database successfully.");
      return true;
    } catch (err: any) {
      handleDbError("startup check", err);
      return false;
    }
  }

  // ================= Guild =================
  public static async getGuild(guildId: string, defaultPrefix = "!") {
    if (dbConnected) {
      try {
        return await prisma.guild.upsert({
          where: { id: guildId },
          update: {},
          create: { id: guildId, prefix: defaultPrefix },
        });
      } catch (err) {
        handleDbError("getGuild", err);
      }
    }

    if (!memoryGuilds.has(guildId)) {
      memoryGuilds.set(guildId, {
        id: guildId,
        prefix: defaultPrefix,
        locale: "en-US",
        premium: false,
        premiumTier: 0,
        disabledCommands: [],
        disabledChannels: [],
        mutedRoleId: null,
        autoroleIds: [],
        botAutoroleIds: [],
      });
    }
    return memoryGuilds.get(guildId);
  }

  // ================= Onboarding =================
  public static async getOnboardingConfig(guildId: string) {
    if (dbConnected) {
      try {
        return await prisma.onboardingConfig.findUnique({
          where: { guildId },
        });
      } catch (err) {
        handleDbError("getOnboardingConfig", err);
      }
    }
    return null;
  }

  // ================= Reaction Roles =================
  public static async getReactionRoleGroups(guildId: string, messageId?: string) {
    if (dbConnected) {
      try {
        const where: any = { guildId };
        if (messageId) where.messageId = messageId;
        return await prisma.reactionRoleGroup.findMany({
          where,
          include: { items: true },
        });
      } catch (err) {
        handleDbError("getReactionRoleGroups", err);
      }
    }

    const groups: any[] = [];
    for (const group of memoryReactionRoleGroups.values()) {
      if (group.guildId === guildId && (!messageId || group.messageId === messageId)) {
        const items = memoryReactionRoleItems.get(group.id) || [];
        groups.push({ ...group, items });
      }
    }
    return groups;
  }

  public static async createReactionRoleGroup(data: {
    guildId: string;
    channelId: string;
    messageId: string;
    type: ReactionRoleType;
    maxRoles?: number;
    timedHours?: number;
    items: Array<{ emoji: string; roleId: string; label?: string; style?: string }>;
  }) {
    if (dbConnected) {
      try {
        return await prisma.reactionRoleGroup.create({
          data: {
            guildId: data.guildId,
            channelId: data.channelId,
            messageId: data.messageId,
            type: data.type,
            maxRoles: data.maxRoles ?? 0,
            timedHours: data.timedHours ?? 0,
            items: {
              create: data.items.map((it) => ({
                emoji: it.emoji,
                roleId: it.roleId,
                label: it.label,
                style: it.style,
              })),
            },
          },
          include: { items: true },
        });
      } catch (err) {
        handleDbError("createReactionRoleGroup", err);
      }
    }

    const id = `rr_group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const group = {
      id,
      guildId: data.guildId,
      channelId: data.channelId,
      messageId: data.messageId,
      type: data.type,
      maxRoles: data.maxRoles ?? 0,
      timedHours: data.timedHours ?? 0,
    };
    memoryReactionRoleGroups.set(id, group);

    const items = data.items.map((it, idx) => ({
      id: `rr_item_${id}_${idx}`,
      groupId: id,
      emoji: it.emoji,
      roleId: it.roleId,
      label: it.label ?? null,
      style: it.style ?? null,
    }));
    memoryReactionRoleItems.set(id, items);

    return { ...group, items };
  }

  // ================= Sticky Messages =================
  public static async getStickyMessage(guildId: string, channelId: string) {
    if (dbConnected) {
      try {
        return await prisma.stickyMessage.findUnique({
          where: {
            guildId_channelId: { guildId, channelId },
          },
        });
      } catch (err) {
        handleDbError("getStickyMessage", err);
      }
    }
    return memoryStickyMessages.get(`${guildId}:${channelId}`) ?? null;
  }

  public static async setStickyMessage(guildId: string, channelId: string, content: string, cooldownSec = 5) {
    if (dbConnected) {
      try {
        return await prisma.stickyMessage.upsert({
          where: {
            guildId_channelId: { guildId, channelId },
          },
          update: { content, cooldownSec, isActive: true },
          create: { guildId, channelId, content, cooldownSec, isActive: true },
        });
      } catch (err) {
        handleDbError("setStickyMessage", err);
      }
    }

    const key = `${guildId}:${channelId}`;
    const data = {
      id: `sticky_${Date.now()}`,
      guildId,
      channelId,
      content,
      lastMessageId: null,
      cooldownSec,
      isActive: true,
    };
    memoryStickyMessages.set(key, data);
    return data;
  }

  public static async updateStickyLastMessage(guildId: string, channelId: string, lastMessageId: string) {
    if (dbConnected) {
      try {
        return await prisma.stickyMessage.update({
          where: { guildId_channelId: { guildId, channelId } },
          data: { lastMessageId },
        });
      } catch (err) {
        handleDbError("updateStickyLastMessage", err);
      }
    }

    const key = `${guildId}:${channelId}`;
    const existing = memoryStickyMessages.get(key);
    if (existing) {
      existing.lastMessageId = lastMessageId;
      memoryStickyMessages.set(key, existing);
    }
  }

  public static async deleteStickyMessage(guildId: string, channelId: string) {
    if (dbConnected) {
      try {
        return await prisma.stickyMessage.deleteMany({
          where: { guildId, channelId },
        });
      } catch (err) {
        handleDbError("deleteStickyMessage", err);
      }
    }
    memoryStickyMessages.delete(`${guildId}:${channelId}`);
  }

  // ================= Leveling =================
  public static async getLevelingConfig(guildId: string) {
    if (dbConnected) {
      try {
        return await prisma.levelingConfig.findUnique({
          where: { guildId },
          include: { rewards: true },
        });
      } catch (err) {
        handleDbError("getLevelingConfig", err);
      }
    }

    let config = memoryLevelConfigs.get(guildId);
    if (!config) {
      config = {
        guildId,
        enabled: true,
        xpRateMultiplier: 1.0,
        levelUpChannelId: null,
        levelUpMessage: "Congratulations {user.mention}, you reached **Level {level}**!",
        minXpPerMsg: 15,
        maxXpPerMsg: 25,
        cooldownSec: 60,
        noXpChannels: [],
        noXpRoles: [],
        rewards: memoryLevelRewards.get(guildId) || [],
      };
      memoryLevelConfigs.set(guildId, config);
    }
    return config;
  }

  public static async getUserXp(guildId: string, userId: string) {
    if (dbConnected) {
      try {
        return await prisma.userGuildXp.findUnique({
          where: { guildId_userId: { guildId, userId } },
        });
      } catch (err) {
        handleDbError("getUserXp", err);
      }
    }

    const key = `${guildId}:${userId}`;
    return (
      memoryUserXp.get(key) ?? {
        guildId,
        userId,
        xp: 0n,
        level: 0,
        messagesCount: 0,
        voiceMinutes: 0,
        lastMessageAt: null,
      }
    );
  }

  public static async addUserXp(guildId: string, userId: string, xpGained: number, newLevel?: number, isVoice = false) {
    if (dbConnected) {
      try {
        const updateData: any = {
          xp: { increment: xpGained },
          lastMessageAt: new Date(),
        };
        if (isVoice) {
          updateData.voiceMinutes = { increment: 1 };
        } else {
          updateData.messagesCount = { increment: 1 };
        }
        if (newLevel !== undefined) {
          updateData.level = newLevel;
        }

        return await prisma.userGuildXp.upsert({
          where: { guildId_userId: { guildId, userId } },
          update: updateData,
          create: {
            guildId,
            userId,
            xp: BigInt(xpGained),
            level: newLevel ?? 0,
            messagesCount: isVoice ? 0 : 1,
            voiceMinutes: isVoice ? 1 : 0,
            lastMessageAt: new Date(),
          },
        });
      } catch (err) {
        handleDbError("addUserXp", err);
      }
    }

    const key = `${guildId}:${userId}`;
    const current = memoryUserXp.get(key) || {
      guildId,
      userId,
      xp: 0n,
      level: 0,
      messagesCount: 0,
      voiceMinutes: 0,
      lastMessageAt: null,
    };

    const newXp = BigInt(current.xp) + BigInt(xpGained);
    const updated = {
      ...current,
      xp: newXp,
      level: newLevel !== undefined ? newLevel : current.level,
      messagesCount: current.messagesCount + (isVoice ? 0 : 1),
      voiceMinutes: current.voiceMinutes + (isVoice ? 1 : 0),
      lastMessageAt: new Date(),
    };
    memoryUserXp.set(key, updated);
    return updated;
  }

  public static async getLeaderboard(guildId: string, limit = 10) {
    if (dbConnected) {
      try {
        return await prisma.userGuildXp.findMany({
          where: { guildId },
          orderBy: { xp: "desc" },
          take: limit,
        });
      } catch (err) {
        handleDbError("getLeaderboard", err);
      }
    }

    const list: any[] = [];
    for (const [key, val] of memoryUserXp.entries()) {
      if (key.startsWith(`${guildId}:`)) {
        list.push(val);
      }
    }
    list.sort((a, b) => (BigInt(b.xp) > BigInt(a.xp) ? 1 : -1));
    return list.slice(0, limit);
  }

  public static async getUserRank(guildId: string, userId: string): Promise<number> {
    if (dbConnected) {
      try {
        const user = await prisma.userGuildXp.findUnique({
          where: { guildId_userId: { guildId, userId } },
        });
        if (!user) return 0;
        const higherCount = await prisma.userGuildXp.count({
          where: {
            guildId,
            xp: { gt: user.xp },
          },
        });
        return higherCount + 1;
      } catch (err) {
        handleDbError("getUserRank", err);
      }
    }

    const list = await this.getLeaderboard(guildId, 1000);
    const idx = list.findIndex((u) => u.userId === userId);
    return idx === -1 ? 0 : idx + 1;
  }

  // ================= Automod =================
  public static async getAutomodConfig(guildId: string) {
    if (dbConnected) {
      try {
        return await prisma.automodConfig.findUnique({
          where: { guildId },
        });
      } catch (err) {
        handleDbError("getAutomodConfig", err);
      }
    }

    let config = memoryAutomodConfigs.get(guildId);
    if (!config) {
      config = {
        guildId,
        antiSpam: true,
        antiInvite: true,
        antiLink: false,
        maxMentions: 5,
        dramaChannelId: null,
        logChannelId: null,
        bannedWords: ["discord.gg", "free nitro", "hack"],
        whitelistRoles: [],
        whitelistChannels: [],
        actionOnSpam: AutomodAction.DELETE_MESSAGE,
        actionOnInvite: AutomodAction.DELETE_MESSAGE,
        actionOnLink: AutomodAction.DELETE_MESSAGE,
        actionOnMentions: AutomodAction.DELETE_MESSAGE,
        actionOnBannedWords: AutomodAction.DELETE_MESSAGE,
      };
      memoryAutomodConfigs.set(guildId, config);
    }
    return config;
  }

  // ================= Infractions =================
  public static async createInfraction(data: {
    guildId: string;
    userId: string;
    modId: string;
    action: InfractionAction;
    reason?: string;
    expiresAt?: Date;
  }) {
    if (dbConnected) {
      try {
        const latest = await prisma.infraction.findFirst({
          where: { guildId: data.guildId },
          orderBy: { caseId: "desc" },
        });
        const caseId = (latest?.caseId ?? 0) + 1;

        return await prisma.infraction.create({
          data: {
            guildId: data.guildId,
            caseId,
            userId: data.userId,
            modId: data.modId,
            action: data.action,
            reason: data.reason,
            expiresAt: data.expiresAt,
          },
        });
      } catch (err) {
        handleDbError("createInfraction", err);
      }
    }

    const list = memoryInfractions.get(data.guildId) || [];
    const caseId = list.length + 1;
    const entry = {
      id: `case_${Date.now()}_${caseId}`,
      guildId: data.guildId,
      caseId,
      userId: data.userId,
      modId: data.modId,
      action: data.action,
      reason: data.reason ?? null,
      expiresAt: data.expiresAt ?? null,
      active: true,
      createdAt: new Date(),
    };
    list.push(entry);
    memoryInfractions.set(data.guildId, list);
    return entry;
  }

  // ================= Starboard =================
  public static async getStarboardConfig(guildId: string) {
    if (dbConnected) {
      try {
        return await prisma.starboardConfig.findUnique({
          where: { guildId },
        });
      } catch (err) {
        handleDbError("getStarboardConfig", err);
      }
    }
    return memoryStarboardConfigs.get(guildId) ?? null;
  }

  public static async setStarboardConfig(data: {
    guildId: string;
    channelId: string;
    threshold?: number;
    emoji?: string;
    selfStar?: boolean;
  }) {
    if (dbConnected) {
      try {
        return await prisma.starboardConfig.upsert({
          where: { guildId: data.guildId },
          update: {
            channelId: data.channelId,
            threshold: data.threshold ?? 3,
            emoji: data.emoji ?? "⭐",
            selfStar: data.selfStar ?? false,
            enabled: true,
          },
          create: {
            guildId: data.guildId,
            channelId: data.channelId,
            threshold: data.threshold ?? 3,
            emoji: data.emoji ?? "⭐",
            selfStar: data.selfStar ?? false,
            enabled: true,
          },
        });
      } catch (err) {
        handleDbError("setStarboardConfig", err);
      }
    }

    const cfg = {
      guildId: data.guildId,
      channelId: data.channelId,
      threshold: data.threshold ?? 3,
      emoji: data.emoji ?? "⭐",
      selfStar: data.selfStar ?? false,
      enabled: true,
      ignoredChannels: [],
    };
    memoryStarboardConfigs.set(data.guildId, cfg);
    return cfg;
  }

  public static async getStarboardMessage(guildId: string, originalMessageId: string) {
    if (dbConnected) {
      try {
        return await prisma.starboardMessage.findUnique({
          where: { guildId_originalMessageId: { guildId, originalMessageId } },
        });
      } catch (err) {
        handleDbError("getStarboardMessage", err);
      }
    }
    return memoryStarboardMessages.get(`${guildId}:${originalMessageId}`) ?? null;
  }

  public static async saveStarboardMessage(data: {
    guildId: string;
    originalMessageId: string;
    starboardMessageId: string;
    channelId: string;
    authorId: string;
    starCount: number;
  }) {
    if (dbConnected) {
      try {
        return await prisma.starboardMessage.upsert({
          where: { guildId_originalMessageId: { guildId: data.guildId, originalMessageId: data.originalMessageId } },
          update: { starCount: data.starCount, starboardMessageId: data.starboardMessageId },
          create: data,
        });
      } catch (err) {
        handleDbError("saveStarboardMessage", err);
      }
    }

    const key = `${data.guildId}:${data.originalMessageId}`;
    memoryStarboardMessages.set(key, data);
    return data;
  }

  // ================= Suggestions =================
  public static async createSuggestion(data: {
    guildId: string;
    channelId: string;
    authorId: string;
    suggestionText: string;
    messageId?: string;
  }) {
    if (dbConnected) {
      try {
        const latest = await prisma.suggestion.findFirst({
          where: { guildId: data.guildId },
          orderBy: { suggestionNumber: "desc" },
        });
        const suggestionNumber = (latest?.suggestionNumber ?? 0) + 1;

        return await prisma.suggestion.create({
          data: {
            guildId: data.guildId,
            channelId: data.channelId,
            authorId: data.authorId,
            suggestionText: data.suggestionText,
            messageId: data.messageId,
            suggestionNumber,
            status: SuggestionStatus.PENDING,
          },
        });
      } catch (err) {
        handleDbError("createSuggestion", err);
      }
    }

    let count = 0;
    for (const s of memorySuggestions.values()) {
      if (s.guildId === data.guildId) count++;
    }
    const suggestionNumber = count + 1;
    const id = `sug_${Date.now()}_${suggestionNumber}`;
    const suggestion = {
      id,
      guildId: data.guildId,
      channelId: data.channelId,
      messageId: data.messageId ?? null,
      authorId: data.authorId,
      suggestionNumber,
      suggestionText: data.suggestionText,
      status: SuggestionStatus.PENDING,
      upvotes: 0,
      downvotes: 0,
      upvoters: [] as string[],
      downvoters: [] as string[],
      createdAt: new Date(),
    };
    memorySuggestions.set(id, suggestion);
    return suggestion;
  }

  public static async getSuggestionByMessage(guildId: string, messageId: string) {
    if (dbConnected) {
      try {
        return await prisma.suggestion.findFirst({
          where: { guildId, messageId },
        });
      } catch (err) {
        handleDbError("getSuggestionByMessage", err);
      }
    }

    for (const s of memorySuggestions.values()) {
      if (s.guildId === guildId && s.messageId === messageId) {
        return s;
      }
    }
    return null;
  }

  public static async updateSuggestionVotes(
    suggestionId: string,
    upvotes: number,
    downvotes: number,
    upvoters: string[],
    downvoters: string[]
  ) {
    if (dbConnected) {
      try {
        return await prisma.suggestion.update({
          where: { id: suggestionId },
          data: { upvotes, downvotes, upvoters, downvoters },
        });
      } catch (err) {
        handleDbError("updateSuggestionVotes", err);
      }
    }

    const s = memorySuggestions.get(suggestionId);
    if (s) {
      s.upvotes = upvotes;
      s.downvotes = downvotes;
      s.upvoters = upvoters;
      s.downvoters = downvoters;
      memorySuggestions.set(suggestionId, s);
    }
  }

  // ================= Logging =================
  public static async getLoggingConfig(guildId: string) {
    if (dbConnected) {
      try {
        return await prisma.loggingConfig.findUnique({
          where: { guildId },
        });
      } catch (err) {
        handleDbError("getLoggingConfig", err);
      }
    }
    return memoryLoggingConfigs.get(guildId) ?? null;
  }

  public static async saveWeblog(data: {
    guildId: string;
    eventType: string;
    actorId: string;
    targetId?: string;
    detailsJson: any;
  }) {
    if (dbConnected) {
      try {
        return await prisma.weblogEntry.create({
          data: {
            guildId: data.guildId,
            eventType: data.eventType,
            actorId: data.actorId,
            targetId: data.targetId,
            detailsJson: data.detailsJson,
          },
        });
      } catch (err) {
        handleDbError("saveWeblog", err);
      }
    }

    const entry = {
      id: `log_${Date.now()}`,
      ...data,
      createdAt: new Date(),
    };
    memoryWeblogs.push(entry);
    if (memoryWeblogs.length > 500) memoryWeblogs.shift();
    return entry;
  }

  // ================= Custom Commands =================
  public static async getCustomCommands(guildId: string) {
    if (dbConnected) {
      try {
        return await prisma.customCommand.findMany({
          where: { guildId },
        });
      } catch (err) {
        handleDbError("getCustomCommands", err);
      }
    }
    return memoryCustomCommands.get(guildId) || [];
  }
}
