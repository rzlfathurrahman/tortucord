/**
 * Discord Gateway Intent Flags (number bitfields).
 * Corresponds to Discord API Gateway Intents.
 */
export const IntentFlags = {
  GUILDS: 1 << 0,
  GUILD_MEMBERS: 1 << 1,
  GUILD_MODERATION: 1 << 2,
  GUILD_EMOJIS_AND_STICKERS: 1 << 3,
  GUILD_INTEGRATIONS: 1 << 4,
  GUILD_WEBHOOKS: 1 << 5,
  GUILD_INVITES: 1 << 6,
  GUILD_VOICE_STATES: 1 << 7,
  GUILD_PRESENCES: 1 << 8,
  GUILD_MESSAGES: 1 << 9,
  GUILD_MESSAGE_REACTIONS: 1 << 10,
  GUILD_MESSAGE_TYPING: 1 << 11,
  DIRECT_MESSAGES: 1 << 12,
  DIRECT_MESSAGE_REACTIONS: 1 << 13,
  DIRECT_MESSAGE_TYPING: 1 << 14,
  MESSAGE_CONTENT: 1 << 15,
  GUILD_SCHEDULED_EVENTS: 1 << 16,
  AUTO_MODERATION_CONFIGURATION: 1 << 20,
  AUTO_MODERATION_EXECUTION: 1 << 21,
} as const;

export type IntentName = keyof typeof IntentFlags;

/**
 * Default intents required for Tortuga (Carl-bot clone) features:
 * - Guilds (for server cache)
 * - Guild Members (for autoroles, leveling, mod)
 * - Guild Moderation (for audit logs / bans)
 * - Guild Emojis & Stickers (for reaction roles, starboards)
 * - Guild Voice States (for voice leveling, voice logging)
 * - Guild Messages (for commands, leveling, sticky messages, automod)
 * - Guild Message Reactions (for reaction roles, starboards)
 * - Message Content (privileged intent for command parsing, automod, leveling)
 * - Direct Messages (for mod infraction DM notifications)
 */
export const DEFAULT_BOT_INTENTS: number =
  IntentFlags.GUILDS |
  IntentFlags.GUILD_MEMBERS |
  IntentFlags.GUILD_MODERATION |
  IntentFlags.GUILD_EMOJIS_AND_STICKERS |
  IntentFlags.GUILD_VOICE_STATES |
  IntentFlags.GUILD_MESSAGES |
  IntentFlags.GUILD_MESSAGE_REACTIONS |
  IntentFlags.MESSAGE_CONTENT |
  IntentFlags.DIRECT_MESSAGES;

/**
 * Check if intent bitfield includes specific intent.
 */
export function hasIntent(intents: number, intent: number): boolean {
  return (intents & intent) === intent;
}

/**
 * List active intents from bitfield.
 */
export function getIntentNames(intents: number): IntentName[] {
  return (Object.entries(IntentFlags) as [IntentName, number][])
    .filter(([_, flag]) => (intents & flag) === flag)
    .map(([name]) => name);
}
