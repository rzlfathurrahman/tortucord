import { DiscordGuild, DiscordChannel, DiscordRole, DiscordUser } from './types';
import { MOCK_GUILDS, MOCK_CHANNELS, MOCK_ROLES, MOCK_USER } from './mock-data';

const DISCORD_API = 'https://discord.com/api/v10';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  return null;
}

export function setCached<T>(key: string, data: T, ttlMs = 30000): void {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
}

export async function getBotGuilds(): Promise<DiscordGuild[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return MOCK_GUILDS;
  }

  const cached = getCached<DiscordGuild[]>('bot_guilds');
  if (cached) return cached;

  try {
    const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[DiscordAPI] Failed to fetch bot guilds: ${res.status} ${res.statusText}`);
      return [];
    }

    const guildsData = await res.json();
    if (!Array.isArray(guildsData) || guildsData.length === 0) {
      return [];
    }

    // Fetch counts for each guild in parallel with caching
    const guilds: DiscordGuild[] = await Promise.all(
      guildsData.map(async (g: any) => {
        const guildCacheKey = `guild_count_${g.id}`;
        const cachedCounts = getCached<{ memberCount: number; channelsCount: number }>(guildCacheKey);
        if (cachedCounts) {
          return {
            id: g.id,
            name: g.name,
            icon: g.icon
              ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
              : null,
            owner: g.owner || false,
            permissions: g.permissions || '8',
            botJoined: true,
            memberCount: cachedCounts.memberCount,
            channelsCount: cachedCounts.channelsCount,
            rolesCount: 1,
            prefix: '!',
          };
        }

        let memberCount = 1;
        let channelsCount = 1;

        try {
          const detailRes = await fetch(`${DISCORD_API}/guilds/${g.id}?with_counts=true`, {
            headers: { Authorization: `Bot ${token}` },
            cache: 'no-store',
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            memberCount = detail.approximate_member_count || 1;
          }
        } catch {}

        try {
          const chanRes = await fetch(`${DISCORD_API}/guilds/${g.id}/channels`, {
            headers: { Authorization: `Bot ${token}` },
            cache: 'no-store',
          });
          if (chanRes.ok) {
            const chans = await chanRes.json();
            if (Array.isArray(chans)) channelsCount = chans.length;
          }
        } catch {}

        setCached(guildCacheKey, { memberCount, channelsCount }, 60000);

        return {
          id: g.id,
          name: g.name,
          icon: g.icon
            ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
            : null,
          owner: g.owner || false,
          permissions: g.permissions || '8',
          botJoined: true,
          memberCount,
          channelsCount,
          rolesCount: 1,
          prefix: '!',
        };
      })
    );

    // Cache guilds for 20 seconds
    setCached('bot_guilds', guilds, 20000);
    return guilds;
  } catch (err) {
    console.error('[DiscordAPI] Error fetching bot guilds:', err);
    return [];
  }
}

export async function getGuildDetails(guildId: string): Promise<DiscordGuild> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];
  }

  const cacheKey = `guild_detail_${guildId}`;
  const cached = getCached<DiscordGuild>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=true`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      return MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];
    }

    const data = await res.json();
    const result: DiscordGuild = {
      id: data.id,
      name: data.name,
      icon: data.icon
        ? `https://cdn.discordapp.com/icons/${data.id}/${data.icon}.png?size=128`
        : null,
      owner: false,
      permissions: '8',
      botJoined: true,
      memberCount: data.approximate_member_count || 1,
      channelsCount: (data.channels || []).length || 1,
      rolesCount: (data.roles || []).length || 1,
      prefix: '!',
    };

    setCached(cacheKey, result, 30000);
    return result;
  } catch {
    return MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0];
  }
}

export async function getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return MOCK_CHANNELS[guildId] || MOCK_CHANNELS[MOCK_GUILDS[0].id] || [];
  }

  const cacheKey = `guild_channels_${guildId}`;
  const cached = getCached<DiscordChannel[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const channels: DiscordChannel[] = data
      .filter((c: any) => c.type === 0 || c.type === 2 || c.type === 4 || c.type === 5)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        type: (c.type === 4 ? 'category' : c.type === 2 ? 'voice' : c.type === 5 ? 'announcement' : 'text') as DiscordChannel['type'],
        parentId: c.parent_id,
        position: c.position,
        topic: c.topic,
        permissionOverwrites: c.permission_overwrites || [],
      }));

    setCached(cacheKey, channels, 30000);
    return channels;
  } catch {
    return [];
  }
}

export interface CreateChannelInput {
  name: string;
  type: 'text' | 'voice' | 'category' | 'announcement';
  parentId?: string;
  topic?: string;
  isPrivate?: boolean;
  allowedRoleIds?: string[];
  isReadOnly?: boolean;
}

export async function createGuildChannel(
  guildId: string,
  input: CreateChannelInput
): Promise<{ success: boolean; channel?: DiscordChannel; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'DISCORD_BOT_TOKEN not configured' };

  let discordType = 0; // GUILD_TEXT
  if (input.type === 'voice') discordType = 2; // GUILD_VOICE
  if (input.type === 'category') discordType = 4; // GUILD_CATEGORY
  if (input.type === 'announcement') discordType = 5; // GUILD_ANNOUNCEMENT

  const permissionOverwrites: any[] = [];

  if (input.isPrivate) {
    permissionOverwrites.push({
      id: guildId, // @everyone role ID
      type: 0,
      allow: '0',
      deny: '1024', // VIEW_CHANNEL
    });

    if (input.allowedRoleIds && input.allowedRoleIds.length > 0) {
      for (const roleId of input.allowedRoleIds) {
        permissionOverwrites.push({
          id: roleId,
          type: 0,
          allow: input.type === 'voice' ? '1049600' : '3072',
          deny: '0',
        });
      }
    }
  } else if (input.isReadOnly) {
    permissionOverwrites.push({
      id: guildId,
      type: 0,
      allow: '1024',
      deny: '2048', // SEND_MESSAGES
    });

    if (input.allowedRoleIds && input.allowedRoleIds.length > 0) {
      for (const roleId of input.allowedRoleIds) {
        permissionOverwrites.push({
          id: roleId,
          type: 0,
          allow: '2048',
          deny: '0',
        });
      }
    }
  }

  const payload: any = {
    name: input.name,
    type: discordType,
  };

  if (input.parentId && input.type !== 'category') {
    payload.parent_id = input.parentId;
  }
  if (input.topic && input.type === 'text') {
    payload.topic = input.topic;
  }
  if (permissionOverwrites.length > 0) {
    payload.permission_overwrites = permissionOverwrites;
  }

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `Discord error: ${res.statusText}` };
    }

    const c = await res.json();
    invalidateCache(`guild_channels_${guildId}`);
    invalidateCache(`guild_count_${guildId}`);

    return {
      success: true,
      channel: {
        id: c.id,
        name: c.name,
        type: input.type,
        parentId: c.parent_id,
        position: c.position,
        topic: c.topic,
        permissionOverwrites: c.permission_overwrites || [],
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create channel' };
  }
}

export async function deleteGuildChannel(
  guildId: string,
  channelId: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'DISCORD_BOT_TOKEN not configured' };

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `Discord error: ${res.statusText}` };
    }

    invalidateCache(`guild_channels_${guildId}`);
    invalidateCache(`guild_count_${guildId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete channel' };
  }
}

export async function updateChannelPermissions(
  guildId: string,
  channelId: string,
  isPrivate: boolean,
  allowedRoleIds: string[],
  isReadOnly = false
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'DISCORD_BOT_TOKEN not configured' };

  try {
    if (isPrivate) {
      await fetch(`${DISCORD_API}/channels/${channelId}/permissions/${guildId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 0,
          allow: '0',
          deny: '1024',
        }),
      });

      for (const rId of allowedRoleIds) {
        await fetch(`${DISCORD_API}/channels/${channelId}/permissions/${rId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 0,
            allow: '3072',
            deny: '0',
          }),
        });
      }
    } else if (isReadOnly) {
      await fetch(`${DISCORD_API}/channels/${channelId}/permissions/${guildId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 0,
          allow: '1024',
          deny: '2048',
        }),
      });

      for (const rId of allowedRoleIds) {
        await fetch(`${DISCORD_API}/channels/${channelId}/permissions/${rId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 0,
            allow: '2048',
            deny: '0',
          }),
        });
      }
    } else {
      await fetch(`${DISCORD_API}/channels/${channelId}/permissions/${guildId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${token}` },
      });
    }

    invalidateCache(`guild_channels_${guildId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update channel permissions' };
  }
}

export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return MOCK_ROLES[guildId] || MOCK_ROLES[MOCK_GUILDS[0].id] || [];
  }

  const cacheKey = `guild_roles_${guildId}`;
  const cached = getCached<DiscordRole[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const roles = data.map((r: any) => ({
      id: r.id,
      name: r.name,
      color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5',
      position: r.position,
      managed: r.managed,
      permissions: r.permissions,
      hoist: Boolean(r.hoist),
      mentionable: Boolean(r.mentionable),
    }));

    setCached(cacheKey, roles, 30000);
    return roles;
  } catch {
    return [];
  }
}

export interface CreateRoleInput {
  name: string;
  color?: string | number;
  hoist?: boolean;
  mentionable?: boolean;
  permissions?: string;
  reason?: string;
}

export interface UpdateRoleInput {
  name?: string;
  color?: string | number;
  hoist?: boolean;
  mentionable?: boolean;
  permissions?: string;
  reason?: string;
}

function parseRoleColorToNumber(color?: string | number): number | undefined {
  if (color === undefined || color === null) return undefined;
  if (typeof color === 'number') return color;
  const clean = color.trim().toLowerCase().replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(clean)) {
    return parseInt(clean, 16);
  }
  return undefined;
}

export async function createGuildRole(
  guildId: string,
  input: CreateRoleInput
): Promise<{ success: boolean; role?: DiscordRole; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'DISCORD_BOT_TOKEN not configured' };

  try {
    const payload: any = {
      name: input.name,
    };
    const numColor = parseRoleColorToNumber(input.color);
    if (numColor !== undefined) payload.color = numColor;
    if (input.hoist !== undefined) payload.hoist = input.hoist;
    if (input.mentionable !== undefined) payload.mentionable = input.mentionable;
    if (input.permissions !== undefined) payload.permissions = input.permissions;

    const headers: Record<string, string> = {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    };
    if (input.reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(input.reason);

    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `Discord API error: ${res.statusText}` };
    }

    const r = await res.json();
    invalidateCache(`guild_roles_${guildId}`);

    return {
      success: true,
      role: {
        id: r.id,
        name: r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5',
        position: r.position,
        managed: r.managed,
        permissions: r.permissions,
        hoist: Boolean(r.hoist),
        mentionable: Boolean(r.mentionable),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create role' };
  }
}

export async function updateGuildRole(
  guildId: string,
  roleId: string,
  input: UpdateRoleInput
): Promise<{ success: boolean; role?: DiscordRole; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'DISCORD_BOT_TOKEN not configured' };

  try {
    const payload: any = {};
    if (input.name !== undefined) payload.name = input.name;
    const numColor = parseRoleColorToNumber(input.color);
    if (numColor !== undefined) payload.color = numColor;
    if (input.hoist !== undefined) payload.hoist = input.hoist;
    if (input.mentionable !== undefined) payload.mentionable = input.mentionable;
    if (input.permissions !== undefined) payload.permissions = input.permissions;

    const headers: Record<string, string> = {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    };
    if (input.reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(input.reason);

    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles/${roleId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `Discord API error: ${res.statusText}` };
    }

    const r = await res.json();
    invalidateCache(`guild_roles_${guildId}`);

    return {
      success: true,
      role: {
        id: r.id,
        name: r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5',
        position: r.position,
        managed: r.managed,
        permissions: r.permissions,
        hoist: Boolean(r.hoist),
        mentionable: Boolean(r.mentionable),
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update role' };
  }
}

export async function deleteGuildRole(
  guildId: string,
  roleId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'DISCORD_BOT_TOKEN not configured' };

  try {
    const headers: Record<string, string> = {
      Authorization: `Bot ${token}`,
    };
    if (reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(reason);

    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles/${roleId}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `Discord API error: ${res.statusText}` };
    }

    invalidateCache(`guild_roles_${guildId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete role' };
  }
}

export async function getBotUser(): Promise<DiscordUser> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return MOCK_USER;

  const cached = getCached<DiscordUser>('bot_user');
  if (cached) return cached;

  try {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return MOCK_USER;
    const u = await res.json();
    const user: DiscordUser = {
      id: u.id,
      username: u.username,
      globalName: u.global_name || u.username,
      avatar: u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
        : null,
    };
    setCached('bot_user', user, 300000); // 5 min cache
    return user;
  } catch {
    return MOCK_USER;
  }
}

export interface DiscordBotMember {
  id: string;
  username: string;
  avatar: string | null;
  nickname: string | null;
  roles: string[];
}

export async function getGuildBots(guildId: string): Promise<DiscordBotMember[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return [];

  const cacheKey = `guild_bots_${guildId}`;
  const cached = getCached<DiscordBotMember[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members?limit=1000`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];

    const members = await res.json();
    if (!Array.isArray(members)) return [];

    const bots: DiscordBotMember[] = members
      .filter((m: any) => m.user?.bot)
      .map((m: any) => ({
        id: m.user.id,
        username: m.user.username,
        avatar: m.user.avatar
          ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=128`
          : null,
        nickname: m.nick || null,
        roles: m.roles || [],
      }));

    setCached(cacheKey, bots, 60000);
    return bots;
  } catch {
    return [];
  }
}

export interface DiscordMessageItem {
  id: string;
  channelId: string;
  author: {
    id: string;
    username: string;
    avatar: string | null;
    bot: boolean;
  };
  content: string;
  timestamp: string;
  attachments: { id: string; url: string; name: string }[];
  embeds: any[];
}

export async function getChannelMessages(
  channelId: string,
  limit = 100
): Promise<DiscordMessageItem[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return [];

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages?limit=${limit}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[DiscordAPI] Failed to fetch channel messages: ${res.status} ${res.statusText}`);
      return [];
    }

    const messages = await res.json();
    if (!Array.isArray(messages)) return [];

    return messages.map((m: any) => ({
      id: m.id,
      channelId: m.channel_id,
      author: {
        id: m.author?.id || '',
        username: m.author?.username || 'Unknown',
        avatar: m.author?.avatar
          ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64`
          : null,
        bot: Boolean(m.author?.bot),
      },
      content: m.content || '',
      timestamp: m.timestamp,
      attachments: (m.attachments || []).map((a: any) => ({
        id: a.id,
        url: a.url,
        name: a.filename || 'attachment',
      })),
      embeds: m.embeds || [],
    }));
  } catch (err) {
    console.error('[DiscordAPI] Error in getChannelMessages:', err);
    return [];
  }
}

export async function bulkDeleteMessages(
  channelId: string,
  messageIds: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, deletedCount: 0, error: 'No bot token' };
  if (!messageIds || messageIds.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  // Discord bulk-delete API only supports messages between 2 and 100 messages, and under 14 days old
  if (messageIds.length === 1) {
    try {
      const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages/${messageIds[0]}`, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${token}` },
      });
      return { success: res.ok || res.status === 204, deletedCount: 1 };
    } catch (err: any) {
      return { success: false, deletedCount: 0, error: err.message };
    }
  }

  try {
    const chunk = messageIds.slice(0, 100);
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages/bulk-delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: chunk }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        deletedCount: 0,
        error: errJson.message || `Discord API returned ${res.status}`,
      };
    }

    return { success: true, deletedCount: chunk.length };
  } catch (err: any) {
    console.error('[DiscordAPI] Error in bulkDeleteMessages:', err);
    return { success: false, deletedCount: 0, error: err.message };
  }
}

export async function sendChannelMessage(
  channelId: string,
  payload: { content?: string; embeds?: any[] }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'No bot token configured' };

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.message || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateRolePermissions(
  guildId: string,
  roleId: string,
  permissions: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'No bot token configured' };

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles/${roleId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ permissions }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.message || `HTTP ${res.status}` };
    }

    invalidateCache(`roles_${guildId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface DiscordGuildMember {
  user: {
    id: string;
    username: string;
    globalName?: string;
    avatar: string | null;
    bot?: boolean;
  };
  nick: string | null;
  roles: string[];
  joinedAt: string;
  premiumSince: string | null;
  communicationDisabledUntil: string | null;
}

export async function getGuildMembers(
  guildId: string,
  limit = 1000
): Promise<DiscordGuildMember[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return [];

  const cacheKey = `members_${guildId}_${limit}`;
  const cached = getCached<DiscordGuildMember[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members?limit=${limit}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[DiscordAPI] Failed to fetch guild members: ${res.status}`);
      return [];
    }

    const rawMembers = await res.json();
    if (!Array.isArray(rawMembers)) return [];

    const members: DiscordGuildMember[] = rawMembers.map((m: any) => ({
      user: {
        id: m.user?.id || '',
        username: m.user?.username || 'Unknown',
        globalName: m.user?.global_name || undefined,
        avatar: m.user?.avatar
          ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64`
          : null,
        bot: Boolean(m.user?.bot),
      },
      nick: m.nick || null,
      roles: m.roles || [],
      joinedAt: m.joined_at,
      premiumSince: m.premium_since || null,
      communicationDisabledUntil: m.communication_disabled_until || null,
    }));

    setCached(cacheKey, members, 30000); // 30s cache
    return members;
  } catch (err) {
    console.error('[DiscordAPI] Error in getGuildMembers:', err);
    return [];
  }
}

export async function timeoutGuildMember(
  guildId: string,
  userId: string,
  durationMinutes: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'No bot token' };

  try {
    const timeoutUntil =
      durationMinutes > 0
        ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        : null;

    const headers: Record<string, string> = {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    };
    if (reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(reason);

    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ communication_disabled_until: timeoutUntil }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `HTTP ${res.status}` };
    }

    invalidateCache(`members_${guildId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function kickGuildMember(
  guildId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'No bot token' };

  try {
    const headers: Record<string, string> = {
      Authorization: `Bot ${token}`,
    };
    if (reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(reason);

    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `HTTP ${res.status}` };
    }

    invalidateCache(`members_${guildId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addMemberRole(
  guildId: string,
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'No bot token' };

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'PUT',
      headers: { Authorization: `Bot ${token}` },
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `HTTP ${res.status}` };
    }

    invalidateCache(`members_${guildId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function removeMemberRole(
  guildId: string,
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'No bot token' };

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${token}` },
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `HTTP ${res.status}` };
    }

    invalidateCache(`members_${guildId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendDirectMessage(
  userId: string,
  payload: { content?: string; embeds?: any[] }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'No bot token' };

  try {
    const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: userId }),
    });

    if (!dmRes.ok) {
      const err = await dmRes.json().catch(() => ({}));
      return { success: false, error: err.message || 'Cannot open DM channel with user' };
    }

    const dmChannel = await dmRes.json();
    return await sendChannelMessage(dmChannel.id, payload);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateMemberNickname(
  guildId: string,
  userId: string,
  nick: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { success: false, error: 'No bot token' };

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nick }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || `HTTP ${res.status}` };
    }

    invalidateCache(`members_${guildId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}




