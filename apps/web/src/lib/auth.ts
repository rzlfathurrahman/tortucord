import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma, DashboardRole } from '@tortuga/database';

export interface SessionData {
  user: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
  };
  accessToken: string;
  expiresAt: number;
}

export interface PlatformSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'MEMBER';
}

const PLATFORM_SESSION_COOKIE = 'tortuga_platform_session';
const DISCORD_SESSION_COOKIE = 'tortuga_session';
const SECRET = process.env.JWT_SECRET || process.env.DISCORD_CLIENT_SECRET || 'tortuga-master-secret-key-32chars!';

export function serializeSession(session: SessionData): string {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

export function deserializeSession(token: string): SessionData | null {
  try {
    const json = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function createPlatformSessionToken(payload: PlatformSessionPayload): string {
  const data = JSON.stringify(payload);
  const dataB64 = Buffer.from(data).toString('base64url');
  const hmac = crypto.createHmac('sha256', SECRET).update(dataB64).digest('base64url');
  return `${dataB64}.${hmac}`;
}

export function verifyPlatformSessionToken(token: string): PlatformSessionPayload | null {
  try {
    const [dataB64, hmac] = token.split('.');
    if (!dataB64 || !hmac) return null;

    const expectedHmac = crypto.createHmac('sha256', SECRET).update(dataB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return null;
    }

    const jsonStr = Buffer.from(dataB64, 'base64url').toString('utf-8');
    return JSON.parse(jsonStr) as PlatformSessionPayload;
  } catch {
    return null;
  }
}

export async function getPlatformSession(): Promise<PlatformSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyPlatformSessionToken(token);
}

export async function getDiscordSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DISCORD_SESSION_COOKIE)?.value;
  if (!token) return null;
  return deserializeSession(token);
}

export const getSession = getDiscordSession;

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

export async function ensureInitialSuperadmin(): Promise<void> {
  try {
    const count = await prisma.dashboardUser.count();
    if (count === 0) {
      const defaultPassword = process.env.SUPERADMIN_PASSWORD || 'password123';
      await prisma.dashboardUser.create({
        data: {
          email: 'admin@tortuga.local',
          name: 'Super Admin',
          role: DashboardRole.SUPERADMIN,
          passwordHash: hashPassword(defaultPassword),
        },
      });
      console.log('[Auth] Initial Superadmin account provisioned: admin@tortuga.local / password123');
    }
  } catch (err) {
    console.error('[Auth] Failed checking initial superadmin:', err);
  }
}

export const DASHBOARD_FEATURES = [
  { id: 'channels', label: 'Channels & Categories', icon: 'FolderTree', description: 'Create and organize channels & role permissions' },
  { id: 'onboarding', label: 'Onboarding & Welcome', icon: 'UserPlus', description: 'Configure welcome, goodbye, and auto-roles' },
  { id: 'roles', label: 'Roles & Hierarchy', icon: 'Shield', description: 'Manage server roles and hierarchy' },
  { id: 'reaction-roles', label: 'Reaction Roles', icon: 'Smile', description: 'Create self-assignable role panels' },
  { id: 'automod', label: 'AutoMod & Watcher', icon: 'ShieldAlert', description: 'Anti-spam, drama watcher, and word filter' },
  { id: 'weblogs', label: 'Audit Weblogs', icon: 'ScrollText', description: 'Search moderation and server audit logs' },
  { id: 'sticky', label: 'Sticky Messages', icon: 'Pin', description: 'Pin dynamic messages to channel bottoms' },
  { id: 'leveling', label: 'Leveling & XP', icon: 'Trophy', description: 'XP system and level rewards' },
  { id: 'suggestions', label: 'Suggestions & Starboard', icon: 'Lightbulb', description: 'Community suggestions and starboard' },
  { id: 'embeds', label: 'Visual Embed Builder', icon: 'Palette', description: 'Design rich embed announcements' },
  { id: 'webhooks', label: 'Webhook Hub', icon: 'Webhook', description: 'Manage inbound webhooks and payload transformers' },
  { id: 'bot-watcher', label: 'Bot Watcher (Hermes)', icon: 'Bot', description: 'Monitor bot agent status and auto-threading' },
  { id: 'commands', label: 'Custom Commands', icon: 'Terminal', description: 'Create custom TagScript slash/prefix commands' },
  { id: 'tickets', label: 'Support Tickets', icon: 'LifeBuoy', description: 'Manage thread-based support tickets with AI transcripts' },
  { id: 'schedules', label: 'Scheduled Dispatches', icon: 'Calendar', description: 'Cron-based automated broadcasts' },
  { id: 'snapshots', label: 'Server Snapshots & Backup', icon: 'Archive', description: 'Create full backups and 1-click restore server states' },
  { id: 'audit', label: 'Security & Health Audit', icon: 'ShieldCheck', description: 'Scan permission leaks, zombie channels, and auto-fix risks' },
  { id: 'cleaner', label: 'Message Cleaner & Purge', icon: 'Sparkles', description: 'Filter and bulk delete spam messages via Discord API' },
  { id: 'broadcast', label: 'Cross-Server Broadcast', icon: 'Megaphone', description: 'Dispatch announcements to multiple servers and channels simultaneously' },
  { id: 'members', label: 'Member 360 & CRM', icon: 'Users', description: 'Inspect member timeline, infractions, tickets, and inactive users' },
  { id: 'workflows', label: 'Automation Flows', icon: 'Zap', description: 'Build visual Trigger-Condition-Action automation flows' },
  { id: 'knowledge', label: 'Hermes Knowledge Base', icon: 'BrainCircuit', description: 'Ingest server documentation & configure AI auto-responder' },
  { id: 'settings', label: 'General Settings', icon: 'Settings', description: 'Bot command prefix and general settings' },
] as const;

export async function getUserGuildPermissions(userId: string, guildId: string): Promise<{
  canManageAll: boolean;
  allowedFeatures: string[];
  isSuperadmin: boolean;
}> {
  try {
    const user = await prisma.dashboardUser.findUnique({
      where: { id: userId },
      include: {
        guildAccesses: {
          where: { guildId },
        },
      },
    });

    if (!user || !user.isActive) {
      return { canManageAll: false, allowedFeatures: [], isSuperadmin: false };
    }

    if (user.role === DashboardRole.SUPERADMIN) {
      return {
        canManageAll: true,
        allowedFeatures: DASHBOARD_FEATURES.map((f) => f.id),
        isSuperadmin: true,
      };
    }

    const access = user.guildAccesses[0];
    if (!access) {
      return { canManageAll: false, allowedFeatures: [], isSuperadmin: false };
    }

    // Security: 'broadcast' is strictly reserved for superadmin/owner unless explicitly granted in features
    const allowed = access.canManageAll
      ? DASHBOARD_FEATURES.map((f) => f.id).filter((id) => id !== 'broadcast' || access.features.includes('broadcast'))
      : access.features;

    return {
      canManageAll: access.canManageAll,
      allowedFeatures: allowed,
      isSuperadmin: false,
    };
  } catch (err) {
    console.error('[Auth] Failed to get user guild permissions:', err);
    return { canManageAll: false, allowedFeatures: [], isSuperadmin: false };
  }
}

export interface UserGuildAuthorization {
  isSuperadmin: boolean;
  canBroadcast: boolean;
  broadcastGuildIds: Set<string>;
  guildMap: Map<string, { isOwner: boolean; canManage: boolean; isExplicitAssigned: boolean }>;
}

export async function getUserAuthorizedGuilds(): Promise<UserGuildAuthorization> {
  const [platformUser, discordSession] = await Promise.all([
    getPlatformSession(),
    getDiscordSession(),
  ]);

  const result: UserGuildAuthorization = {
    isSuperadmin: platformUser?.role === 'SUPERADMIN',
    canBroadcast: false,
    broadcastGuildIds: new Set(),
    guildMap: new Map(),
  };

  if (!platformUser && !discordSession) {
    return result;
  }

  // Platform SUPERADMIN has unrestricted broadcast access to all guilds
  if (result.isSuperadmin) {
    result.canBroadcast = true;
    return result;
  }

  const accessTokens: string[] = [];
  if (discordSession?.accessToken) {
    accessTokens.push(discordSession.accessToken);
  }

  if (platformUser) {
    try {
      const linked = await prisma.linkedDiscordAccount.findMany({
        where: { userId: platformUser.userId },
        select: { accessToken: true },
      });
      for (const acc of linked) {
        if (!accessTokens.includes(acc.accessToken)) {
          accessTokens.push(acc.accessToken);
        }
      }
    } catch (err) {
      console.error('[Auth] Error fetching linked discord accounts:', err);
    }
  }

  // Fetch Discord guilds for user OAuth tokens
  for (const token of accessTokens) {
    try {
      const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const userGuilds = await res.json();
        if (Array.isArray(userGuilds)) {
          for (const g of userGuilds) {
            const isOwner = !!g.owner;
            const canManage = canManageGuild(g.permissions, g.owner);
            if (canManage || isOwner) {
              const existing = result.guildMap.get(g.id);
              result.guildMap.set(g.id, {
                isOwner: isOwner || !!existing?.isOwner,
                canManage: canManage || !!existing?.canManage,
                isExplicitAssigned: false,
              });
              // Server owners can broadcast within their owned servers
              if (isOwner) {
                result.broadcastGuildIds.add(g.id);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[Auth] Error fetching discord guilds:', err);
    }
  }

  // Platform user explicit guild dashboard assignments
  if (platformUser) {
    try {
      const explicitAccesses = await prisma.guildDashboardAccess.findMany({
        where: { userId: platformUser.userId },
      });
      for (const acc of explicitAccesses) {
        const existing = result.guildMap.get(acc.guildId);
        result.guildMap.set(acc.guildId, {
          isOwner: existing?.isOwner || false,
          canManage: true,
          isExplicitAssigned: true,
        });
        if (acc.features.includes('broadcast')) {
          result.broadcastGuildIds.add(acc.guildId);
        }
      }
    } catch (err) {
      console.error('[Auth] Error fetching explicit guild access:', err);
    }
  }

  result.canBroadcast = result.broadcastGuildIds.size > 0;
  return result;
}

export async function checkFeatureAccess(
  guildId: string,
  featureId: string
): Promise<{
  allowed: boolean;
  status: number;
  error?: string;
  platformUser?: PlatformSessionPayload | null;
}> {
  try {
    const [platformUser, discordSession] = await Promise.all([
      getPlatformSession(),
      getDiscordSession(),
    ]);

    // 1. Reject unauthenticated requests
    if (!platformUser && !discordSession) {
      return {
        allowed: false,
        status: 401,
        error: 'Authentication required. Please sign in.',
        platformUser: null,
      };
    }

    // 2. Superadmin has full access to all guilds
    if (platformUser?.role === 'SUPERADMIN') {
      return { allowed: true, status: 200, platformUser };
    }

    // Special check for 'broadcast': strictly require Superadmin, Server Owner, or explicit assignment
    if (featureId === 'broadcast') {
      const authGuilds = await getUserAuthorizedGuilds();
      if (authGuilds.isSuperadmin || authGuilds.broadcastGuildIds.has(guildId)) {
        return { allowed: true, status: 200, platformUser };
      }
      return {
        allowed: false,
        status: 403,
        error: 'Access denied: Cross-Server Broadcast is restricted to Superadmin and Server Owners.',
        platformUser,
      };
    }

    // 3. Platform User permissions
    if (platformUser) {
      const perms = await getUserGuildPermissions(platformUser.userId, guildId);
      if (perms.canManageAll || perms.allowedFeatures.includes(featureId)) {
        return { allowed: true, status: 200, platformUser };
      }

      // Check linked discord accounts
      try {
        const linked = await prisma.linkedDiscordAccount.findMany({
          where: { userId: platformUser.userId },
          select: { accessToken: true },
        });
        for (const acc of linked) {
          const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: { Authorization: `Bearer ${acc.accessToken}` },
            cache: 'no-store',
          });
          if (res.ok) {
            const userGuilds = await res.json();
            if (Array.isArray(userGuilds)) {
              const g = userGuilds.find((item: any) => item.id === guildId);
              if (g && canManageGuild(g.permissions, g.owner)) {
                return { allowed: true, status: 200, platformUser };
              }
            }
          }
        }
      } catch {}
    }

    // 4. Discord OAuth session check
    if (discordSession) {
      try {
        const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bearer ${discordSession.accessToken}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const userGuilds = await res.json();
          if (Array.isArray(userGuilds)) {
            const g = userGuilds.find((item: any) => item.id === guildId);
            if (g && canManageGuild(g.permissions, g.owner)) {
              return { allowed: true, status: 200, platformUser: null };
            }
          }
        }
      } catch (err) {
        console.error('[Auth] Error checking discord user guilds:', err);
      }
    }

    return {
      allowed: false,
      status: 403,
      error: 'Access denied: You do not have permission to manage this server.',
      platformUser,
    };
  } catch (e: any) {
    return {
      allowed: false,
      status: 500,
      error: `Auth check failed: ${e.message}`,
      platformUser: null,
    };
  }
}


