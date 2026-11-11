import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import {
  getPlatformSession,
  getDiscordSession,
  getUserGuildPermissions,
  canManageGuild,
  DASHBOARD_FEATURES,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const [platformUser, discordSession] = await Promise.all([
      getPlatformSession(),
      getDiscordSession(),
    ]);

    // 1. Platform User check
    if (platformUser) {
      if (platformUser.role === 'SUPERADMIN') {
        return NextResponse.json({
          success: true,
          authenticated: true,
          isSuperadmin: true,
          isOwner: true,
          canManageAll: true,
          allowedFeatures: DASHBOARD_FEATURES.map((f) => f.id),
        });
      }

      // Check linked discord accounts for this platform user to see if they're Discord admin/owner
      let isOwner = false;
      const linked = await prisma.linkedDiscordAccount.findMany({
        where: { userId: platformUser.userId },
        select: { accessToken: true },
      });

      for (const acc of linked) {
        try {
          const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: { Authorization: `Bearer ${acc.accessToken}` },
            cache: 'no-store',
          });
          if (res.ok) {
            const userGuilds = await res.json();
            if (Array.isArray(userGuilds)) {
              const g = userGuilds.find((item) => item.id === guildId);
              if (g && g.owner) {
                isOwner = true;
              }
              if (g && canManageGuild(g.permissions, g.owner)) {
                const allowed = DASHBOARD_FEATURES.map((f) => f.id).filter(
                  (id) => id !== 'broadcast' || isOwner
                );
                return NextResponse.json({
                  success: true,
                  authenticated: true,
                  isSuperadmin: false,
                  isOwner,
                  canManageAll: true,
                  allowedFeatures: allowed,
                });
              }
            }
          }
        } catch {
          // ignore error fetching discord guilds
        }
      }

      // Check explicit guild permissions for this platform user
      const userPerms = await getUserGuildPermissions(platformUser.userId, guildId);
      if (userPerms.canManageAll || userPerms.allowedFeatures.length > 0) {
        const allowed = (userPerms.canManageAll
          ? DASHBOARD_FEATURES.map((f) => f.id)
          : userPerms.allowedFeatures
        ).filter((id) => id !== 'broadcast' || isOwner || userPerms.allowedFeatures.includes('broadcast'));

        return NextResponse.json({
          success: true,
          authenticated: true,
          isSuperadmin: false,
          isOwner,
          canManageAll: userPerms.canManageAll,
          allowedFeatures: allowed,
        });
      }

      // User has no access to this guild
      return NextResponse.json({
        success: true,
        authenticated: true,
        isSuperadmin: false,
        isOwner: false,
        canManageAll: false,
        allowedFeatures: [],
      });
    }

    // 2. Discord Session (OAuth cookie) check
    if (discordSession?.accessToken) {
      let isOwner = false;
      let hasManagePerm = false;

      // Check direct Discord admin permissions
      try {
        const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bearer ${discordSession.accessToken}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const userGuilds = await res.json();
          if (Array.isArray(userGuilds)) {
            const g = userGuilds.find((item) => item.id === guildId);
            if (g) {
              isOwner = !!g.owner;
              hasManagePerm = canManageGuild(g.permissions, g.owner);
            }
          }
        }
      } catch {
        // ignore error fetching discord guilds
      }

      // Check if this Discord user is linked to a platform user
      const linked = await prisma.linkedDiscordAccount.findFirst({
        where: { discordId: discordSession.user.id },
      });
      if (linked) {
        const userPerms = await getUserGuildPermissions(linked.userId, guildId);
        if (userPerms.canManageAll || userPerms.allowedFeatures.length > 0) {
          const allowed = (userPerms.canManageAll
            ? DASHBOARD_FEATURES.map((f) => f.id)
            : userPerms.allowedFeatures
          ).filter((id) => id !== 'broadcast' || isOwner || userPerms.isSuperadmin);

          return NextResponse.json({
            success: true,
            authenticated: true,
            isSuperadmin: userPerms.isSuperadmin,
            isOwner,
            canManageAll: userPerms.canManageAll,
            allowedFeatures: allowed,
          });
        }
      }

      if (hasManagePerm) {
        const allowed = DASHBOARD_FEATURES.map((f) => f.id).filter(
          (id) => id !== 'broadcast' || isOwner
        );
        return NextResponse.json({
          success: true,
          authenticated: true,
          isSuperadmin: false,
          isOwner,
          canManageAll: true,
          allowedFeatures: allowed,
        });
      }

      return NextResponse.json({
        success: true,
        authenticated: true,
        isSuperadmin: false,
        isOwner: false,
        canManageAll: false,
        allowedFeatures: [],
      });
    }

    // 3. Unauthenticated / Guest fallback
    return NextResponse.json({
      success: true,
      authenticated: false,
      isSuperadmin: false,
      isOwner: false,
      canManageAll: false,
      allowedFeatures: [],
    });
  } catch (err: any) {
    console.error('[GuildAccessAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
