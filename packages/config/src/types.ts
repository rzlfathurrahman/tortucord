import {
  AutomodAction,
  InfractionAction,
  LogEventType,
  PremiumTier,
  ReactionRoleType,
  SuggestionStatus,
} from "./enums.js";

/**
 * Embed Field representation matching Discord API.
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Embed Author representation matching Discord API.
 */
export interface DiscordEmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
}

/**
 * Embed Footer representation matching Discord API.
 */
export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
}

/**
 * Embed Media representation matching Discord API.
 */
export interface DiscordEmbedMedia {
  url: string;
}

/**
 * Comprehensive Discord Embed representation.
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: DiscordEmbedFooter;
  image?: DiscordEmbedMedia;
  thumbnail?: DiscordEmbedMedia;
  author?: DiscordEmbedAuthor;
  fields?: DiscordEmbedField[];
}

/**
 * Guild settings interface.
 */
export interface GuildSettings {
  id: string;
  prefix: string;
  locale: string;
  premium: boolean;
  premiumTier: PremiumTier;
  premiumExpiresAt?: Date | null;
  disabledCommands: string[];
  disabledChannels: string[];
  mutedRoleId?: string | null;
  autoroleIds: string[];
  botAutoroleIds: string[];
}

/**
 * Reaction Role Group definition.
 */
export interface ReactionRoleGroupData {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  type: ReactionRoleType;
  maxRoles: number;
  timedHours: number;
  items: ReactionRoleItemData[];
}

/**
 * Single emoji-to-role binding.
 */
export interface ReactionRoleItemData {
  id: string;
  groupId: string;
  emoji: string;
  roleId: string;
  style?: string | null;
  label?: string | null;
}

/**
 * Leveling configuration interface.
 */
export interface LevelingSettings {
  guildId: string;
  enabled: boolean;
  xpRateMultiplier: number;
  levelUpChannelId?: string | null;
  levelUpMessage?: string | null;
  minXpPerMsg: number;
  maxXpPerMsg: number;
  cooldownSec: number;
  noXpChannels: string[];
  noXpRoles: string[];
}

/**
 * Level reward role mapping.
 */
export interface LevelRewardData {
  id: string;
  configId: string;
  level: number;
  roleId: string;
  removeOnHigher: boolean;
}

/**
 * Automod settings interface.
 */
export interface AutomodSettings {
  guildId: string;
  antiSpam: boolean;
  antiInvite: boolean;
  antiLink: boolean;
  maxMentions: number;
  dramaChannelId?: string | null;
  logChannelId?: string | null;
  bannedWords: string[];
  whitelistRoles: string[];
  whitelistChannels: string[];
  actionOnSpam: AutomodAction;
  actionOnInvite: AutomodAction;
  actionOnLink: AutomodAction;
  actionOnMentions: AutomodAction;
  actionOnBannedWords: AutomodAction;
}

/**
 * Starboard settings interface.
 */
export interface StarboardSettings {
  guildId: string;
  enabled: boolean;
  channelId?: string | null;
  threshold: number;
  emoji: string;
  selfStar: boolean;
  ignoredChannels: string[];
}

/**
 * Logging settings interface.
 */
export interface LoggingSettings {
  guildId: string;
  modLogChannelId?: string | null;
  messageLogChannelId?: string | null;
  memberLogChannelId?: string | null;
  serverLogChannelId?: string | null;
  voiceLogChannelId?: string | null;
  joinLeaveLogChannelId?: string | null;
  ignoredChannels: string[];
  ignoredRoles: string[];
}

/**
 * Infraction data interface.
 */
export interface InfractionData {
  id: string;
  guildId: string;
  caseId: number;
  userId: string;
  modId: string;
  action: InfractionAction;
  reason?: string | null;
  expiresAt?: Date | null;
  active: boolean;
  createdAt: Date;
}

/**
 * Suggestion data interface.
 */
export interface SuggestionData {
  id: string;
  guildId: string;
  channelId: string;
  messageId?: string | null;
  authorId: string;
  suggestionNumber: number;
  suggestionText: string;
  status: SuggestionStatus;
  modReason?: string | null;
  modId?: string | null;
  upvotes: number;
  downvotes: number;
  upvoters: string[];
  downvoters: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom command data interface.
 */
export interface CustomCommandData {
  id: string;
  guildId: string;
  name: string;
  response: string;
  description?: string | null;
  isSlash: boolean;
  aliases: string[];
  allowedRoles: string[];
  deniedRoles: string[];
  allowedChannels: string[];
  deniedChannels: string[];
  cooldownSec: number;
}
