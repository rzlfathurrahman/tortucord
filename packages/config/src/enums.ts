/**
 * Carl-bot clone reaction role modes.
 * - NORMAL: Toggle mode. Reacting adds the role, unreacting removes it.
 * - UNIQUE: Mutually exclusive. Reacting gives this role and removes any other role from the group.
 * - VERIFY: React once to gain role. Removing the reaction does nothing.
 * - REVERSE: Reverse toggle. Reacting removes the role, unreacting adds it.
 * - BINDING: One-way binding. Reacting adds the role and reaction cannot be undone to revoke role.
 * - DROP: One-way drop. Reacting removes the role and reaction cannot be undone to regain role.
 * - LIMIT: User can select up to a maximum number of roles defined in maxRoles.
 */
export enum ReactionRoleType {
  NORMAL = "NORMAL",
  UNIQUE = "UNIQUE",
  VERIFY = "VERIFY",
  REVERSE = "REVERSE",
  BINDING = "BINDING",
  DROP = "DROP",
  LIMIT = "LIMIT",
}

/**
 * Automod enforcement action types.
 */
export enum AutomodAction {
  WARN = "WARN",
  TIMEOUT = "TIMEOUT",
  MUTE = "MUTE",
  KICK = "KICK",
  BAN = "BAN",
  DELETE_MESSAGE = "DELETE_MESSAGE",
}

/**
 * Suggestion lifecycle status.
 */
export enum SuggestionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DENIED = "DENIED",
  CONSIDERED = "CONSIDERED",
}

/**
 * Moderation infraction types.
 */
export enum InfractionAction {
  WARN = "WARN",
  TIMEOUT = "TIMEOUT",
  MUTE = "MUTE",
  KICK = "KICK",
  BAN = "BAN",
  UNBAN = "UNBAN",
  UNMUTE = "UNMUTE",
}

/**
 * Logging event types for Carl-bot style server audit logging.
 */
export enum LogEventType {
  // Channel events
  CHANNEL_CREATE = "CHANNEL_CREATE",
  CHANNEL_UPDATE = "CHANNEL_UPDATE",
  CHANNEL_DELETE = "CHANNEL_DELETE",

  // Role events
  ROLE_CREATE = "ROLE_CREATE",
  ROLE_UPDATE = "ROLE_UPDATE",
  ROLE_DELETE = "ROLE_DELETE",

  // Member events
  MEMBER_JOIN = "MEMBER_JOIN",
  MEMBER_LEAVE = "MEMBER_LEAVE",
  MEMBER_UPDATE = "MEMBER_UPDATE",
  MEMBER_ROLE_UPDATE = "MEMBER_ROLE_UPDATE",

  // Message events
  MESSAGE_EDIT = "MESSAGE_EDIT",
  MESSAGE_DELETE = "MESSAGE_DELETE",
  MESSAGE_BULK_DELETE = "MESSAGE_BULK_DELETE",

  // Voice events
  VOICE_JOIN = "VOICE_JOIN",
  VOICE_LEAVE = "VOICE_LEAVE",
  VOICE_MOVE = "VOICE_MOVE",

  // Moderation events
  MOD_WARN = "MOD_WARN",
  MOD_TIMEOUT = "MOD_TIMEOUT",
  MOD_MUTE = "MOD_MUTE",
  MOD_KICK = "MOD_KICK",
  MOD_BAN = "MOD_BAN",
  MOD_UNBAN = "MOD_UNBAN",
  MOD_UNMUTE = "MOD_UNMUTE",

  // Server events
  SERVER_UPDATE = "SERVER_UPDATE",
  INVITE_CREATE = "INVITE_CREATE",
  INVITE_DELETE = "INVITE_DELETE",
  EMOJI_UPDATE = "EMOJI_UPDATE",
}

/**
 * Premium tiers for unlocked features (e.g. multiple reaction role groups, higher star threshold configs, etc.).
 */
export enum PremiumTier {
  NONE = 0,
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
}
