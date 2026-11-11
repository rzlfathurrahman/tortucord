/**
 * Discord Permission Flags (as BigInt constants).
 * Matches Discord API permission bitshifts.
 */
export const PermissionFlags = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  PRIORITY_SPEAKER: 1n << 8n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  VIEW_GUILD_INSIGHTS: 1n << 19n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_GUILD_EXPRESSIONS: 1n << 30n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  REQUEST_TO_SPEAK: 1n << 32n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  USE_EMBEDDED_ACTIVITIES: 1n << 39n,
  MODERATE_MEMBERS: 1n << 40n,
  VIEW_CREATOR_MONETIZATION_ANALYTICS: 1n << 41n,
  USE_SOUNDBOARD: 1n << 42n,
  CREATE_GUILD_EXPRESSIONS: 1n << 43n,
  CREATE_EVENTS: 1n << 44n,
  USE_EXTERNAL_SOUNDS: 1n << 45n,
  SEND_VOICE_MESSAGES: 1n << 46n,
} as const;

export type PermissionName = keyof typeof PermissionFlags;

/**
 * Check whether a bitfield of permissions contains a specific permission.
 * Automatically accounts for ADMINISTRATOR granting all permissions.
 */
export function hasPermission(
  userPermissions: bigint | string | number,
  permission: bigint
): boolean {
  const perms = BigInt(userPermissions);
  if ((perms & PermissionFlags.ADMINISTRATOR) === PermissionFlags.ADMINISTRATOR) {
    return true;
  }
  return (perms & permission) === permission;
}

/**
 * Check if a bitfield has all of the required permissions.
 */
export function hasAllPermissions(
  userPermissions: bigint | string | number,
  requiredPermissions: bigint[]
): boolean {
  const perms = BigInt(userPermissions);
  if ((perms & PermissionFlags.ADMINISTRATOR) === PermissionFlags.ADMINISTRATOR) {
    return true;
  }
  return requiredPermissions.every((p) => (perms & p) === p);
}

/**
 * Check if a bitfield has at least one of the given permissions.
 */
export function hasAnyPermission(
  userPermissions: bigint | string | number,
  permissions: bigint[]
): boolean {
  const perms = BigInt(userPermissions);
  if ((perms & PermissionFlags.ADMINISTRATOR) === PermissionFlags.ADMINISTRATOR) {
    return true;
  }
  return permissions.some((p) => (perms & p) === p);
}

/**
 * Convert a permission bitfield into an array of readable string permission names.
 */
export function getPermissionNames(permissions: bigint | string | number): PermissionName[] {
  const perms = BigInt(permissions);
  return (Object.entries(PermissionFlags) as [PermissionName, bigint][])
    .filter(([_, flag]) => (perms & flag) === flag)
    .map(([name]) => name);
}

/**
 * Combine multiple permission flags into a single bitfield string.
 */
export function combinePermissions(...permissions: bigint[]): string {
  const combined = permissions.reduce((acc, curr) => acc | curr, 0n);
  return combined.toString();
}
