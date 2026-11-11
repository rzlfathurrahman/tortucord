const DISCORD_API = 'https://discord.com/api/v10';

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error(
      'DISCORD_BOT_TOKEN is not configured in environment. Please provide a valid bot token in .env'
    );
  }
  return token;
}

async function discordRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getBotToken();
  const url = `${DISCORD_API}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // not json
    }
    const message = errorJson?.message || errorText || res.statusText;
    throw new Error(`Discord API error [${res.status}] ${endpoint}: ${message}`);
  }

  // Some DELETE endpoints return 204 No Content
  if (res.status === 204) {
    return null as T;
  }

  return (await res.json()) as T;
}

export interface DiscordApiGuild {
  id: string;
  name: string;
  icon: string | null;
  owner?: boolean;
  permissions?: string;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  description?: string | null;
}

export interface DiscordApiChannel {
  id: string;
  name: string;
  type: number;
  guild_id?: string;
  position?: number;
  parent_id?: string | null;
  topic?: string | null;
}

export interface DiscordApiRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

export interface DiscordApiUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  bot?: boolean;
}

export interface DiscordApiMember {
  user?: DiscordApiUser;
  nick?: string | null;
  roles: string[];
  joined_at: string;
  communication_disabled_until?: string | null;
}

export const discord = {
  getBotUser: async (): Promise<DiscordApiUser> => {
    return discordRequest<DiscordApiUser>('/users/@me');
  },

  getBotGuilds: async (): Promise<DiscordApiGuild[]> => {
    return discordRequest<DiscordApiGuild[]>('/users/@me/guilds?with_counts=true');
  },

  getGuild: async (guildId: string): Promise<DiscordApiGuild> => {
    return discordRequest<DiscordApiGuild>(`/guilds/${guildId}?with_counts=true`);
  },

  getGuildChannels: async (guildId: string): Promise<DiscordApiChannel[]> => {
    return discordRequest<DiscordApiChannel[]>(`/guilds/${guildId}/channels`);
  },

  createGuildChannel: async (
    guildId: string,
    payload: {
      name: string;
      type?: number;
      topic?: string;
      parent_id?: string;
    }
  ): Promise<DiscordApiChannel> => {
    return discordRequest<DiscordApiChannel>(`/guilds/${guildId}/channels`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteChannel: async (channelId: string, reason?: string): Promise<void> => {
    await discordRequest(`/channels/${channelId}`, {
      method: 'DELETE',
      headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
    });
  },

  getGuildRoles: async (guildId: string): Promise<DiscordApiRole[]> => {
    return discordRequest<DiscordApiRole[]>(`/guilds/${guildId}/roles`);
  },

  getGuildMembers: async (
    guildId: string,
    limit = 50
  ): Promise<DiscordApiMember[]> => {
    return discordRequest<DiscordApiMember[]>(
      `/guilds/${guildId}/members?limit=${Math.min(limit, 1000)}`
    );
  },

  sendMessage: async (
    channelId: string,
    payload: {
      content?: string;
      embeds?: any[];
    }
  ): Promise<any> => {
    return discordRequest(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getChannelMessages: async (channelId: string, limit = 50): Promise<any[]> => {
    return discordRequest<any[]>(
      `/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`
    );
  },

  bulkDeleteMessages: async (
    channelId: string,
    messageIds: string[]
  ): Promise<void> => {
    await discordRequest(`/channels/${channelId}/messages/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ messages: messageIds }),
    });
  },

  timeoutMember: async (
    guildId: string,
    userId: string,
    durationMinutes: number,
    reason?: string
  ): Promise<void> => {
    const until =
      durationMinutes > 0
        ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
        : null;

    await discordRequest(`/guilds/${guildId}/members/${userId}`, {
      method: 'PATCH',
      headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
      body: JSON.stringify({ communication_disabled_until: until }),
    });
  },

  kickMember: async (
    guildId: string,
    userId: string,
    reason?: string
  ): Promise<void> => {
    await discordRequest(`/guilds/${guildId}/members/${userId}`, {
      method: 'DELETE',
      headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
    });
  },

  banMember: async (
    guildId: string,
    userId: string,
    deleteMessageSeconds = 0,
    reason?: string
  ): Promise<void> => {
    await discordRequest(`/guilds/${guildId}/bans/${userId}`, {
      method: 'PUT',
      headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
      body: JSON.stringify({
        delete_message_seconds: deleteMessageSeconds,
      }),
    });
  },

  addMemberRole: async (
    guildId: string,
    userId: string,
    roleId: string
  ): Promise<void> => {
    await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'PUT',
    });
  },

  removeMemberRole: async (
    guildId: string,
    userId: string,
    roleId: string
  ): Promise<void> => {
    await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  },

  deleteRole: async (
    guildId: string,
    roleId: string,
    reason?: string
  ): Promise<void> => {
    await discordRequest(`/guilds/${guildId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: reason ? { 'X-Audit-Log-Reason': reason } : {},
    });
  },
};
