export interface DiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  discriminator?: string;
}

export type ChannelType = 'text' | 'voice' | 'category' | 'announcement' | 'forum';

export interface PermissionOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: ChannelType;
  parentId?: string;
  position: number;
  topic?: string;
  permissionOverwrites?: PermissionOverwrite[];
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
  position: number;
  managed?: boolean;
  memberCount?: number;
  permissions?: string;
  hoist?: boolean;
  mentionable?: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  botJoined: boolean;
  memberCount: number;
  channelsCount: number;
  rolesCount: number;
  prefix: string;
}

export function canManageGuild(permissions: string | number, isOwner = false): boolean {
  if (isOwner) return true;
  try {
    const permBigInt = BigInt(permissions);
    const ADMINISTRATOR = 0x8n;
    const MANAGE_GUILD = 0x20n;
    return (permBigInt & ADMINISTRATOR) === ADMINISTRATOR || (permBigInt & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

export type ReactionRoleMode =
  | 'normal'
  | 'unique'
  | 'verify'
  | 'reverse'
  | 'timed'
  | 'dropdown'
  | 'buttons';

export interface ReactionRoleItem {
  id: string;
  emoji: string;
  roleId: string;
  label?: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger';
}

export interface ReactionRoleGroup {
  id: string;
  guildId: string;
  name: string;
  channelId: string;
  messageId: string;
  description?: string;
  mode: ReactionRoleMode;
  maxRoles?: number;
  items: ReactionRoleItem[];
  createdAt: string;
}

export interface AutoModConfig {
  guildId: string;
  antiSpamEnabled: boolean;
  spamThreshold: number; // max messages
  spamIntervalSeconds: number; // in seconds
  antiInvitesEnabled: boolean;
  allowedInviteGuilds: string[];
  antiLinksEnabled: boolean;
  allowedDomains: string[];
  maxMentions: number;
  actionOnViolation: 'delete' | 'timeout' | 'warn' | 'kick' | 'ban';
  timeoutDurationMinutes: number;
  bannedWords: string[];
  dramaWatcherEnabled: boolean;
  dramaWatcherChannelId: string;
  dramaWatcherSensitivity: 'low' | 'medium' | 'high';
  dramaKeywords: string[];
}

export interface StickyMessage {
  id: string;
  guildId: string;
  channelId: string;
  content: string;
  enabled: boolean;
  cooldownSeconds: number;
  lastPostedAt?: string;
}

export interface RoleReward {
  id: string;
  level: number;
  roleId: string;
  roleName: string;
  roleColor: string;
}

export interface LevelingConfig {
  guildId: string;
  enabled: boolean;
  xpMultiplier: number;
  xpCooldownSeconds: number;
  announcementChannelId: string;
  levelUpMessage: string;
  ignoredChannelIds: string[];
  roleRewards: RoleReward[];
}

export interface LeaderboardMember {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  messageCount: number;
  lastActive: string;
}

export type WeblogActionType =
  | 'MEMBER_JOIN'
  | 'MEMBER_LEAVE'
  | 'MESSAGE_DELETE'
  | 'MESSAGE_EDIT'
  | 'ROLE_UPDATE'
  | 'CHANNEL_CREATE'
  | 'CHANNEL_DELETE'
  | 'BAN_ADD'
  | 'BAN_REMOVE'
  | 'TIMEOUT_ADD'
  | 'AUTOMOD_ALERT'
  | 'REACTION_ROLE_CLAIM';

export interface WeblogEntry {
  id: string;
  guildId: string;
  actionType: WeblogActionType;
  moderator: {
    id: string;
    name: string;
    avatar: string;
    bot?: boolean;
  };
  target?: {
    id: string;
    name: string;
    avatar?: string;
  };
  channel?: {
    id: string;
    name: string;
  };
  reason?: string;
  details?: {
    before?: string;
    after?: string;
    changes?: Record<string, { old: any; new: any }>;
    matchedRule?: string;
    count?: number;
  };
  timestamp: string;
}

export interface EmbedField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

export interface EmbedData {
  title: string;
  description: string;
  url: string;
  color: string;
  author: {
    name: string;
    url: string;
    icon_url: string;
  };
  fields: EmbedField[];
  thumbnail: {
    url: string;
  };
  image: {
    url: string;
  };
  footer: {
    text: string;
    icon_url: string;
  };
  timestamp: boolean;
  channelId?: string;
}
