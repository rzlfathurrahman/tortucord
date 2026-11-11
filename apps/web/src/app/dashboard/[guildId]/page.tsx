'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  Smile,
  Hash,
  ArrowRight,
  ShieldAlert,
  Palette,
  Pin,
  Trophy,
  UserPlus,
  Activity,
  Terminal,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function GuildOverviewPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [guild, setGuild] = useState<any>({
    id: guildId,
    name: 'Discord Server',
    icon: null,
    memberCount: 1,
    channelsCount: 1,
    rolesCount: 1,
    prefix: '!',
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [topMembers, setTopMembers] = useState<any[]>([]);
  const [rrCount, setRrCount] = useState<number>(0);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.guild) setGuild(data.guild);
      })
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/weblogs`)
      .then((r) => r.json())
      .then((d) => {
        if (d.logs) setRecentLogs(d.logs.slice(0, 5));
      })
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/leaderboard`)
      .then((r) => r.json())
      .then((d) => {
        if (d.members) setTopMembers(d.members.slice(0, 3));
      })
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/reaction-roles`)
      .then((r) => r.json())
      .then((d) => {
        if (d.reactionRoles) setRrCount(d.reactionRoles.length);
      })
      .catch(() => {});
  }, [guildId]);

  const quickModules = [
    {
      title: 'Onboarding & Welcome',
      desc: 'Greet new members with custom cards, direct messages, and auto-roles.',
      href: `/dashboard/${guildId}/onboarding`,
      icon: UserPlus,
      tag: 'Auto Welcome',
    },
    {
      title: 'Roles & Hierarchy',
      desc: 'Inspect role hierarchy, permission safety, and 1-click auto-role setup.',
      href: `/dashboard/${guildId}/roles`,
      icon: Shield,
      tag: 'Auto-Role',
    },
    {
      title: 'Reaction Roles',
      desc: 'Create interactive buttons and reaction prompts for self-assignable roles.',
      href: `/dashboard/${guildId}/reaction-roles`,
      icon: Smile,
      tag: `${rrCount} Active`,
    },
    {
      title: 'AutoMod & Drama Watcher',
      desc: 'Automated anti-spam, link filters, and toxicity monitoring.',
      href: `/dashboard/${guildId}/automod`,
      icon: ShieldAlert,
      tag: 'Core Defense',
    },
    {
      title: 'Visual Embed Builder',
      desc: 'Publish rich embed announcements directly to channels with live preview.',
      href: `/dashboard/${guildId}/embeds`,
      icon: Palette,
      tag: 'Live Dispatch',
    },
    {
      title: 'Leveling & XP Leaderboard',
      desc: 'Gamify your community with chat/voice XP rewards and public leaderboards.',
      href: `/dashboard/${guildId}/leveling`,
      icon: Trophy,
      tag: 'Progression',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 w-full pb-16">
      {/* Top Welcome Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-white/[0.07]">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
            Server Dashboard
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time control center for <span className="text-zinc-200 font-medium">{guild.name}</span>. Synchronized with Discord Gateway.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/${guildId}/settings`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-white/[0.08] hover:border-white/[0.15] text-zinc-300 hover:text-white text-xs font-medium transition"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Prefix: {guild.prefix || '!'}</span>
          </Link>

          <Link
            href={`/dashboard/${guildId}/onboarding`}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-sm transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Setup Onboarding</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-4 rounded-xl border border-white/[0.07] bg-[#0e111a] space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Members</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-100 tracking-tight">
            {guild.memberCount ? guild.memberCount.toLocaleString() : '1'}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Synchronized</p>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.07] bg-[#0e111a] space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Channels</span>
            <Hash className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-100 tracking-tight">
            {guild.channelsCount || '3'}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Text & Voice</p>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.07] bg-[#0e111a] space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Server Roles</span>
            <Shield className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-zinc-100 tracking-tight">
            {guild.rolesCount || '2'}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">In Hierarchy</p>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.07] bg-[#0e111a] space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium tracking-wide uppercase">Reaction Menus</span>
            <Smile className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 tracking-tight">
            {rrCount}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Interactive Prompts</p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Management & Plugins</h3>
          <span className="text-xs text-zinc-500 font-mono">6 active modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-6 gap-3 sm:gap-4">
          {quickModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group p-4 rounded-xl border border-white/[0.07] hover:border-white/[0.18] bg-[#0e111a] hover:bg-[#121622] transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-white/[0.05] text-zinc-300 group-hover:text-emerald-400 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                      {mod.tag}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-400 transition">
                      {mod.title}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition pt-1 border-t border-white/[0.04]">
                  <span>Configure Module</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Recent Events & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Events / Weblogs */}
        <div className="rounded-xl border border-white/[0.07] bg-[#0e111a] p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-400" />
              <h4 className="text-xs font-semibold text-zinc-200">Recent Audit Events</h4>
            </div>
            <Link
              href={`/dashboard/${guildId}/weblogs`}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono"
            >
              View all →
            </Link>
          </div>

          <div className="space-y-2">
            {recentLogs.map((log) => {
              const actionLabel = log.action || log.actionType || 'LOG';
              const detailText =
                typeof log.details === 'object' && log.details !== null
                  ? log.details.description ||
                    log.details.reason ||
                    log.details.matchedRule ||
                    log.reason ||
                    'Audit event logged'
                  : String(log.details || log.reason || 'Audit event logged');
              const modName =
                log.moderator?.name || log.moderatorName || 'System';

              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#121622] text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.2 rounded border border-white/[0.05]">
                        {actionLabel}
                      </span>
                      <span className="font-medium text-zinc-200 truncate">
                        {detailText}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      by {modName}
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                    {formatRelativeTime(log.timestamp)}
                  </span>
                </div>
              );
            })}

            {recentLogs.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No recent audit log entries.
              </div>
            )}
          </div>
        </div>

        {/* Top Chatters / Leaderboard */}
        <div className="rounded-xl border border-white/[0.07] bg-[#0e111a] p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-zinc-200">Top Community Chatters</h4>
            </div>
            <Link
              href={`/leaderboard/${guildId}`}
              target="_blank"
              className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono"
            >
              Leaderboard →
            </Link>
          </div>

          <div className="space-y-2">
            {topMembers.map((member, idx) => (
              <div
                key={member.id || member.userId || idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#121622] text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono font-bold text-xs text-zinc-400 w-5">
                    #{idx + 1}
                  </span>
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.username || 'User'}
                      className="w-7 h-7 rounded-full ring-1 ring-white/10 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                      {(member.username || 'U').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-200 truncate">
                      {member.globalName || member.username || `User ${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-zinc-500">Level {member.level || 0}</p>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-emerald-400">
                  {member.xp ? Number(member.xp).toLocaleString() : '0'} XP
                </div>
              </div>
            ))}

            {topMembers.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No chat XP recorded yet. Chat in Discord to gain XP!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
