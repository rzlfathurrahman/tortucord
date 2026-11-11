import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Lock, ChevronLeft, LogIn } from 'lucide-react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { GuildAccessProvider } from '@/components/GuildAccessContext';
import { getGuildDetails } from '@/lib/discord';
import {
  getPlatformSession,
  getDiscordSession,
  getUserGuildPermissions,
  canManageGuild,
  DASHBOARD_FEATURES,
} from '@/lib/auth';
import { prisma } from '@tortuga/database';

export default async function GuildDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const currentGuild = await getGuildDetails(guildId);

  const [platformUser, discordSession] = await Promise.all([
    getPlatformSession(),
    getDiscordSession(),
  ]);

  // 1. If not authenticated at all, redirect to /login immediately
  if (!platformUser && !discordSession) {
    redirect(`/login?redirect=/dashboard/${guildId}`);
  }

  // 2. Secure by default: deny until verified
  let canAccessGuild = false;
  let isOwner = false;
  let permissions = {
    canManageAll: false,
    allowedFeatures: [] as string[],
    isSuperadmin: false,
    isOwner: false,
  };

  // 3. Platform User verification
  if (platformUser) {
    if (platformUser.role === 'SUPERADMIN') {
      canAccessGuild = true;
      isOwner = true;
      permissions = {
        canManageAll: true,
        allowedFeatures: DASHBOARD_FEATURES.map((f) => f.id as string),
        isSuperadmin: true,
        isOwner: true,
      };
    } else {
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
              if (g && g.owner) {
                isOwner = true;
              }
              if (g && canManageGuild(g.permissions, g.owner)) {
                canAccessGuild = true;
                const allowed = DASHBOARD_FEATURES.map((f) => f.id as string).filter(
                  (id) => id !== 'broadcast' || isOwner
                );
                permissions = {
                  canManageAll: true,
                  allowedFeatures: allowed,
                  isSuperadmin: false,
                  isOwner,
                };
                break;
              }
            }
          }
        }
      } catch {}

      if (!canAccessGuild) {
        const userPerms = await getUserGuildPermissions(platformUser.userId, guildId);
        if (userPerms.canManageAll || userPerms.allowedFeatures.length > 0) {
          canAccessGuild = true;
          const allowed = (userPerms.canManageAll
            ? DASHBOARD_FEATURES.map((f) => f.id as string)
            : userPerms.allowedFeatures
          ).filter((id) => id !== 'broadcast' || isOwner || userPerms.allowedFeatures.includes('broadcast'));

          permissions = {
            canManageAll: userPerms.canManageAll,
            allowedFeatures: allowed,
            isSuperadmin: false,
            isOwner,
          };
        }
      }
    }
  }

  // 4. Discord OAuth Session verification
  if (!canAccessGuild && discordSession?.accessToken) {
    try {
      const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${discordSession.accessToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const userGuilds = await res.json();
        if (Array.isArray(userGuilds)) {
          const g = userGuilds.find((item: any) => item.id === guildId);
          if (g) {
            isOwner = !!g.owner;
          }
          if (g && canManageGuild(g.permissions, g.owner)) {
            canAccessGuild = true;
            const allowed = DASHBOARD_FEATURES.map((f) => f.id as string).filter(
              (id) => id !== 'broadcast' || isOwner
            );
            permissions = {
              canManageAll: true,
              allowedFeatures: allowed,
              isSuperadmin: false,
              isOwner,
            };
          }
        }
      }
    } catch (err) {
      console.error('[GuildDashboardLayout] Error checking discord user guilds:', err);
    }
  }

  // If user has no access to this guild
  if (!canAccessGuild) {
    return (
      <div className="min-h-screen flex flex-col bg-[#08090d] text-zinc-100 antialiased">
        <DashboardHeader guild={currentGuild} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-8 text-center space-y-4 shadow-2xl animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white">Server Access Restricted</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You do not currently have permission to manage{' '}
              <span className="text-white font-semibold">{currentGuild.name}</span>.
              Please contact your platform Superadmin to grant you server permissions in User Management.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Return to Server List</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-zinc-100 antialiased">
      {/* 1. Single Unified Topbar */}
      <DashboardHeader guild={currentGuild} />

      {/* 2. Workspace Body: Left Sidebar + Main Content */}
      <div className="flex-1 flex min-h-[calc(100vh-52px)]">
        {/* Left Sidebar Navigation */}
        <DashboardSidebar guild={currentGuild} permissions={permissions} />

        {/* Right Main Content Area with RBAC Route Guard */}
        <main className="flex-1 min-w-0 p-3.5 sm:p-5 md:p-6 lg:p-8 2xl:p-10 overflow-y-auto bg-[#08090d]">
          <div className="w-full max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1920px] 4xl:max-w-[2200px] mx-auto">
            <GuildAccessProvider guild={currentGuild} permissions={permissions}>
              {children}
            </GuildAccessProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
