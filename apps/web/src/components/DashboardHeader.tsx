'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DiscordGuild, DiscordUser } from '@/lib/types';
import {
  ChevronsUpDown,
  Trophy,
  ExternalLink,
  LogOut,
  Sparkles,
  Users,
  Shield,
  Cpu,
  Search,
  Menu,
} from 'lucide-react';
import { TortugaLogo } from '@/components/TortugaLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

interface DashboardHeaderProps {
  guild: DiscordGuild;
}

const SECTION_NAMES: Record<string, string> = {
  '': 'Overview',
  'channels': 'Channels & Role Access',
  'onboarding': 'Onboarding & Welcome',
  'roles': 'Roles & Hierarchy',
  'reaction-roles': 'Reaction Roles',
  'automod': 'AutoMod & Watcher',
  'sticky': 'Sticky Messages',
  'leveling': 'Leveling & XP',
  'suggestions': 'Suggestions & Starboard',
  'weblogs': 'Audit Weblogs',
  'embeds': 'Visual Embed Builder',
  'webhooks': 'Webhook Hub & Gateway',
  'bot-watcher': 'Bot Watcher & Heartbeat',
  'commands': 'Custom Commands Studio',
  'tickets': 'Support & Ticket Desk',
  'schedules': 'Scheduled Dispatches & Cron',
  'snapshots': 'Server Snapshots & Backup Studio',
  'audit': 'Security & Health Auditor',
  'cleaner': 'Bulk Message Cleaner & Purge Studio',
  'broadcast': 'Cross-Server Mass Broadcast',
  'members': 'Member 360° & Moderation CRM',
  'workflows': 'Visual Automation Flows',
  'knowledge': 'Hermes AI Knowledge Base & RAG',
  'settings': 'General Settings',
};

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'MEMBER';
}

export function DashboardHeader({ guild }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);

  // Extract current sub-section from URL
  const pathParts = pathname.split('/').filter(Boolean);
  const subSectionKey = pathParts.length > 2 ? pathParts[2] : '';
  const currentSectionName = SECTION_NAMES[subSectionKey] || 'Overview';

  useEffect(() => {
    // Fetch Discord Session
    fetch('/api/auth/discord')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    // Fetch Platform Session
    fetch('/api/auth/platform/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setPlatformUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await Promise.all([
      fetch('/api/auth/platform/logout', { method: 'POST' }).catch(() => {}),
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}),
    ]);
    window.location.href = '/login';
  };

  return (
    <header className="h-[52px] border-b border-white/[0.08] bg-[#08090d]/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left: Mobile Drawer Trigger + Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          className="lg:hidden p-1.5 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition shrink-0"
          aria-label="Toggle Navigation Sidebar"
          title="Open Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Brand Home Link */}
        <Link
          href="/"
          className="hidden xs:flex items-center gap-1.5 p-1 rounded-md hover:bg-white/[0.06] transition group shrink-0"
          title="Back to Homepage"
        >
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:border-emerald-500/40 group-hover:bg-emerald-500/15 transition">
            <TortugaLogo className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-zinc-100 hidden sm:inline tracking-tight">
            Tortuga
          </span>
        </Link>

        {/* Separator (hidden on extra small screens) */}
        <span className="text-zinc-600 font-light text-xs hidden xs:inline">/</span>

        {/* Server Selector Breadcrumb */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-1.5 sm:px-2 py-1 rounded-md hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition text-xs font-medium text-zinc-200 group shrink-0 max-w-[120px] xs:max-w-[150px] sm:max-w-[180px] md:max-w-[220px]"
          title="Switch Discord Server"
        >
          {guild.icon ? (
            <img
              src={guild.icon}
              alt={guild.name}
              className="w-4 h-4 rounded-full object-cover ring-1 ring-white/10 shrink-0"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-300 flex items-center justify-center shrink-0">
              {guild.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="truncate">{guild.name}</span>
          <ChevronsUpDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition shrink-0" />
        </Link>

        {/* Separator */}
        <span className="text-zinc-600 font-light text-xs">/</span>

        {/* Current Active Section Name */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 min-w-0">
          <span className="truncate">{currentSectionName}</span>
        </div>
      </div>

      {/* Right: Status, Controls & User Account */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* Quick Search Button (⌘K) */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition shadow-sm"
          title="Search or jump to... (⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden md:inline text-zinc-300">Search...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
            ⌘K
          </kbd>
        </button>

        {/* Gateway Connection Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>Online</span>
        </div>

        {/* Command Prefix Pill */}
        <span className="hidden xl:inline-flex items-center text-[10px] font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded">
          prefix: <code className="text-zinc-200 font-bold ml-1">{guild.prefix || '!'}</code>
        </span>

        {/* Public Leaderboard */}
        <Link
          href={`/leaderboard/${guild.id}`}
          target="_blank"
          className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.15] transition"
          title="View Server Leaderboard"
        >
          <Trophy className="w-3 h-3 text-amber-400" />
          <span className="hidden xl:inline">Leaderboard</span>
          <ExternalLink className="w-2.5 h-2.5 text-zinc-500 ml-0.5" />
        </Link>

        {/* Multi-Discord Accounts link */}
        <Link
          href="/dashboard/accounts"
          className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition"
          title="Manage Linked Discord Accounts"
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Accounts</span>
        </Link>

        {/* Platform Users link (Superadmin only) */}
        {platformUser?.role === 'SUPERADMIN' && (
          <Link
            href="/dashboard/users"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 border border-rose-500/20 transition"
            title="Manage Platform Users"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Users</span>
          </Link>
        )}

        <Link
          href="/dashboard/mcp"
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 transition"
          title="Model Context Protocol (MCP) AI Documentation"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>MCP</span>
        </Link>

        <div className="h-3.5 w-px bg-white/[0.08] hidden sm:block"></div>

        {/* Light / Dark Mode Toggle */}
        <ThemeToggle />

        <div className="h-3.5 w-px bg-white/[0.08] hidden sm:block"></div>

        {/* User Account / Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {platformUser ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-200 hidden md:inline truncate max-w-[90px] xl:max-w-[120px]">
                {platformUser.name}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono hidden sm:inline">
                {platformUser.role}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <img
                src={user?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt={user?.username || 'User'}
                className="w-6 h-6 rounded-full ring-1 ring-white/10 object-cover shrink-0"
              />
              <span className="text-xs font-medium text-zinc-300 hidden md:inline truncate max-w-[90px] xl:max-w-[120px]">
                {user?.globalName || user?.username || 'Guest'}
              </span>
            </div>
          )}

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
