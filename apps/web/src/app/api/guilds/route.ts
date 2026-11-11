import { NextResponse } from 'next/server';
import { getSession, getPlatformSession, canManageGuild } from '@/lib/auth';
import { getBotGuilds } from '@/lib/discord';
import { DiscordGuild } from '@/lib/types';
import { MOCK_GUILDS } from '@/lib/mock-data';
import { prisma } from '@tortuga/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const [session, platformUser, botGuilds] = await Promise.all([
    getSession(),
    getPlatformSession(),
    getBotGuilds(),
  ]);

  const accessTokens: { token: string; username?: string }[] = [];

  // 1. If active Discord OAuth cookie exists
  if (session?.accessToken) {
    accessTokens.push({ token: session.accessToken, username: session.user.username });
  }

  // 2. If Platform User is logged in, collect tokens from all linked accounts
  if (platformUser) {
    try {
      const linked = await prisma.linkedDiscordAccount.findMany({
        where: { userId: platformUser.userId },
        select: { accessToken: true, username: true },
      });
      for (const acc of linked) {
        if (!accessTokens.some((a) => a.token === acc.accessToken)) {
          accessTokens.push({ token: acc.accessToken, username: acc.username });
        }
      }
    } catch {
      // Ignore DB error
    }
  }

  // 3. If Platform User is not SUPERADMIN, include all explicitly assigned guilds
  const allGuildsMap = new Map<string, DiscordGuild>();

  // If we have tokens, fetch guilds across all accounts
  if (accessTokens.length > 0) {
    for (const acc of accessTokens) {
      try {
        const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bearer ${acc.token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const userGuilds = await res.json();
          if (Array.isArray(userGuilds)) {
            for (const g of userGuilds) {
              if (canManageGuild(g.permissions, g.owner)) {
                const botInGuild = botGuilds.find((bg) => bg.id === g.id);
                allGuildsMap.set(g.id, {
                  id: g.id,
                  name: g.name,
                  icon: g.icon
                    ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
                    : null,
                  owner: g.owner || false,
                  permissions: `${g.permissions}`,
                  botJoined: !!botInGuild,
                  memberCount: botInGuild?.memberCount || 1,
                  channelsCount: botInGuild?.channelsCount || 1,
                  rolesCount: botInGuild?.rolesCount || 1,
                  prefix: '!',
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`[GuildsAPI] Failed fetching guilds for @${acc.username}:`, err);
      }
    }
  }

  // If Platform User is logged in:
  if (platformUser) {
    // Superadmin has full visibility over all bot guilds
    if (platformUser.role === 'SUPERADMIN') {
      for (const bg of botGuilds) {
        if (!allGuildsMap.has(bg.id)) {
          allGuildsMap.set(bg.id, bg);
        }
      }
      return NextResponse.json({
        success: true,
        authenticated: true,
        guilds: Array.from(allGuildsMap.values()),
      });
    }

    // Non-superadmin: fetch explicit GuildDashboardAccess records
    try {
      const explicitAccesses = await prisma.guildDashboardAccess.findMany({
        where: { userId: platformUser.userId },
        include: { guild: true },
      });

      for (const acc of explicitAccesses) {
        if (!allGuildsMap.has(acc.guildId)) {
          const botInGuild = botGuilds.find((bg) => bg.id === acc.guildId);
          allGuildsMap.set(acc.guildId, {
            id: acc.guildId,
            name: botInGuild?.name || `Server ${acc.guildId}`,
            icon: botInGuild?.icon || null,
            owner: false,
            permissions: '0',
            botJoined: !!botInGuild,
            memberCount: botInGuild?.memberCount || 1,
            channelsCount: botInGuild?.channelsCount || 1,
            rolesCount: botInGuild?.rolesCount || 1,
            prefix: acc.guild.prefix || '!',
          });
        }
      }
    } catch (err) {
      console.error('[GuildsAPI] Error fetching explicit guild accesses:', err);
    }

    // For non-superadmin platform users, return only their authorized servers
    return NextResponse.json({
      success: true,
      authenticated: true,
      guilds: Array.from(allGuildsMap.values()),
    });
  }

  // If authenticated via Discord OAuth
  if (session) {
    return NextResponse.json({
      success: true,
      authenticated: true,
      guilds: Array.from(allGuildsMap.values()),
    });
  }

  // If not logged in, require sign in and do not expose server list
  return NextResponse.json({
    success: true,
    authenticated: false,
    guilds: [],
  });
}

