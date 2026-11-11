import { AutomodAction, PremiumTier } from "./enums.js";

/**
 * Default global bot settings.
 */
export const DEFAULT_PREFIX = "!";
export const DEFAULT_LOCALE = "en-US";

/**
 * Default guild configuration.
 */
export const DEFAULT_GUILD_CONFIG = {
  prefix: DEFAULT_PREFIX,
  locale: DEFAULT_LOCALE,
  premium: false,
  premiumTier: PremiumTier.NONE,
  disabledCommands: [] as string[],
  disabledChannels: [] as string[],
  mutedRoleId: null as string | null,
  autoroleIds: [] as string[],
  botAutoroleIds: [] as string[],
};

/**
 * Default leveling feature configuration.
 */
export const DEFAULT_LEVELING_CONFIG = {
  enabled: false,
  xpRateMultiplier: 1.0,
  levelUpChannelId: null as string | null,
  levelUpMessage: "Congratulations {user.mention}, you leveled up to **level {level}**!",
  minXpPerMsg: 15,
  maxXpPerMsg: 25,
  cooldownSec: 60,
  noXpChannels: [] as string[],
  noXpRoles: [] as string[],
};

/**
 * Default automod feature configuration.
 */
export const DEFAULT_AUTOMOD_CONFIG = {
  antiSpam: false,
  antiInvite: false,
  antiLink: false,
  maxMentions: 5,
  dramaChannelId: null as string | null,
  logChannelId: null as string | null,
  bannedWords: [] as string[],
  whitelistRoles: [] as string[],
  whitelistChannels: [] as string[],
  actionOnSpam: AutomodAction.DELETE_MESSAGE,
  actionOnInvite: AutomodAction.DELETE_MESSAGE,
  actionOnLink: AutomodAction.DELETE_MESSAGE,
  actionOnMentions: AutomodAction.DELETE_MESSAGE,
  actionOnBannedWords: AutomodAction.DELETE_MESSAGE,
};

/**
 * Default starboard feature configuration.
 */
export const DEFAULT_STARBOARD_CONFIG = {
  enabled: false,
  channelId: null as string | null,
  threshold: 3,
  emoji: "⭐",
  selfStar: false,
  ignoredChannels: [] as string[],
};

/**
 * Default logging feature configuration.
 */
export const DEFAULT_LOGGING_CONFIG = {
  modLogChannelId: null as string | null,
  messageLogChannelId: null as string | null,
  memberLogChannelId: null as string | null,
  serverLogChannelId: null as string | null,
  voiceLogChannelId: null as string | null,
  joinLeaveLogChannelId: null as string | null,
  ignoredChannels: [] as string[],
  ignoredRoles: [] as string[],
};

/**
 * Default sticky message configuration.
 */
export const DEFAULT_STICKY_CONFIG = {
  cooldownSec: 5,
  isActive: true,
};

/**
 * Global application metadata and links.
 */
export const APP_CONFIG = {
  name: "TortuCord",
  version: "1.0.0",
  description: "Open-Source Discord Bot Platform & Web Management Dashboard",
  githubUrl: "https://github.com/rzlfathurrahman/tortucord",
  discordSupportUrl: "https://discord.gg/tortucord",
  patreonUrl: "https://patreon.com/rzlfathurrahman",
  kofiUrl: "https://ko-fi.com/rzlfathurrahman",
  saweriaUrl: "https://saweria.co/rzlfathurrahman",
  docsUrl: "/docs",
  botInviteUrl: (guildId?: string) => {
    const clientId =
      (typeof process !== "undefined" &&
        (process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
          process.env.DISCORD_CLIENT_ID)) ||
      "";
    if (!clientId) return "/docs";
    const base = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    return guildId ? `${base}&guild_id=${guildId}` : base;
  },
};

