'use client';

import React, { createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Lock, ChevronLeft, ShieldAlert } from 'lucide-react';
import { DiscordGuild } from '@/lib/types';

export interface GuildPermissionsState {
  canManageAll: boolean;
  allowedFeatures: string[];
  isSuperadmin: boolean;
}

interface GuildAccessContextType {
  guild: DiscordGuild;
  permissions: GuildPermissionsState;
  hasFeature: (featureId: string) => boolean;
}

const GuildAccessContext = createContext<GuildAccessContextType | null>(null);

const FEATURE_NAMES: Record<string, string> = {
  channels: 'Channels & Role Access',
  onboarding: 'Onboarding & Welcome',
  roles: 'Roles & Hierarchy',
  'reaction-roles': 'Reaction Roles',
  automod: 'AutoMod & Watcher',
  weblogs: 'Audit Weblogs',
  sticky: 'Sticky Messages',
  leveling: 'Leveling & XP',
  suggestions: 'Suggestions & Starboard',
  embeds: 'Visual Embed Builder',
  webhooks: 'Webhook Hub',
  'bot-watcher': 'Bot Watcher (Hermes)',
  commands: 'Custom Commands',
  tickets: 'Support Tickets & Transcripts',
  schedules: 'Scheduled Dispatches',
  snapshots: 'Server Snapshots & Backup',
  audit: 'Security & Health Audit',
  cleaner: 'Message Cleaner & Purge',
  broadcast: 'Cross-Server Broadcast',
  members: 'Member 360 & CRM',
  workflows: 'Automation Flows',
  knowledge: 'Hermes Knowledge Base',
  settings: 'General Settings',
};

interface GuildAccessProviderProps {
  children: React.ReactNode;
  guild: DiscordGuild;
  permissions: GuildPermissionsState;
}

export function GuildAccessProvider({
  children,
  guild,
  permissions,
}: GuildAccessProviderProps) {
  const pathname = usePathname();

  const hasFeature = (featureId: string): boolean => {
    if (permissions.canManageAll || permissions.isSuperadmin) return true;
    return permissions.allowedFeatures.includes(featureId);
  };

  // Inspect current route to see if it targets a feature sub-route
  const pathParts = pathname.split('/').filter(Boolean);
  // URL format: /dashboard/[guildId]/[featureId]
  const currentFeatureId = pathParts.length >= 3 ? pathParts[2] : null;

  const isFeatureRestricted =
    currentFeatureId &&
    FEATURE_NAMES[currentFeatureId] &&
    !hasFeature(currentFeatureId);

  return (
    <GuildAccessContext.Provider value={{ guild, permissions, hasFeature }}>
      {isFeatureRestricted ? (
        <div className="max-w-xl mx-auto py-16 px-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-8 text-center space-y-5 shadow-2xl animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono uppercase tracking-wider font-bold">
                Permission Restricted
              </span>
              <h2 className="text-lg font-bold text-white mt-2">
                Access Denied to {FEATURE_NAMES[currentFeatureId] || currentFeatureId}
              </h2>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Your account does not currently have permission to access the{' '}
                <span className="text-zinc-200 font-semibold">
                  {FEATURE_NAMES[currentFeatureId] || currentFeatureId}
                </span>{' '}
                module on <span className="text-emerald-400 font-semibold">{guild.name}</span>.
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Please contact your platform Superadmin to grant you permissions for this module in User Management.
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-center gap-3">
              <Link
                href={`/dashboard/${guild.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs transition shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Return to Server Overview</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </GuildAccessContext.Provider>
  );
}

export function useGuildAccess() {
  const context = useContext(GuildAccessContext);
  if (!context) {
    throw new Error('useGuildAccess must be used within a GuildAccessProvider');
  }
  return context;
}
