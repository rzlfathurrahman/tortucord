'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Command } from 'cmdk';
import Fuse from 'fuse.js';
import {
  Search,
  FolderTree,
  UserPlus,
  Shield,
  Smile,
  ShieldAlert,
  ScrollText,
  Pin,
  Trophy,
  Lightbulb,
  Palette,
  Webhook,
  Bot,
  Terminal,
  LifeBuoy,
  Calendar,
  Archive,
  ShieldCheck,
  Sparkles,
  Megaphone,
  Users,
  Zap,
  BrainCircuit,
  Settings,
  Sun,
  Moon,
  Copy,
  ExternalLink,
  LogOut,
  Check,
  ArrowRight,
  Server,
  Hash,
  AtSign,
  Cpu,
  Layers,
  Home,
  Loader2,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { DiscordGuild, DiscordChannel, DiscordRole } from '@/lib/types';
import { APP_CONFIG } from '@tortuga/config';

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Servers' | 'Channels' | 'Roles' | 'Actions' | 'Database';
  keywords?: string[];
  icon: React.ReactNode;
  badge?: string;
  onSelect: () => void;
}

const FEATURE_DEFINITIONS = [
  { id: 'channels', label: 'Channels & Role Access', icon: FolderTree, keywords: ['channels', 'categories', 'permissions', 'lock', 'voice', 'text', 'channel'] },
  { id: 'onboarding', label: 'Onboarding & Welcome', icon: UserPlus, keywords: ['welcome', 'goodbye', 'autoroles', 'join', 'leave', 'dm welcome', 'onboarding'] },
  { id: 'roles', label: 'Roles & Hierarchy', icon: Shield, keywords: ['roles', 'permissions', 'hierarchy', 'color', 'hoist', 'admin', 'mod', 'role'] },
  { id: 'reaction-roles', label: 'Reaction Roles', icon: Smile, keywords: ['reaction roles', 'self roles', 'role buttons', 'assign', 'verify', 'rr'] },
  { id: 'automod', label: 'AutoMod & Watcher', icon: ShieldAlert, keywords: ['automod', 'anti-spam', 'anti-nuke', 'bad words', 'moderation', 'filter', 'drama', 'am'] },
  { id: 'weblogs', label: 'Audit Weblogs', icon: ScrollText, keywords: ['audit logs', 'weblogs', 'moderation logs', 'history', 'events'] },
  { id: 'sticky', label: 'Sticky Messages', icon: Pin, keywords: ['sticky messages', 'pin', 'dynamic message', 'channel footer'] },
  { id: 'leveling', label: 'Leveling & XP', icon: Trophy, keywords: ['leveling', 'xp', 'ranks', 'leaderboard', 'rewards', 'levels'] },
  { id: 'suggestions', label: 'Suggestions & Starboard', icon: Lightbulb, keywords: ['suggestions', 'starboard', 'ideas', 'voting', 'community'] },
  { id: 'embeds', label: 'Visual Embed Builder', icon: Palette, keywords: ['embeds', 'visual builder', 'rich message', 'announcement design'] },
  { id: 'webhooks', label: 'Webhook Hub & Gateway', icon: Webhook, keywords: ['webhooks', 'github webhook', 'inbound', 'gateway', 'integrations'] },
  { id: 'bot-watcher', label: 'Bot Watcher (Hermes)', icon: Bot, keywords: ['bot watcher', 'hermes', 'heartbeat', 'monitor', 'uptime', 'auto thread'] },
  { id: 'commands', label: 'Custom Commands Studio', icon: Terminal, keywords: ['custom commands', 'tagscript', 'slash commands', 'prefix', 'cc'] },
  { id: 'tickets', label: 'Support Tickets & Transcripts', icon: LifeBuoy, keywords: ['tickets', 'support desk', 'ai transcripts', 'support role'] },
  { id: 'schedules', label: 'Scheduled Dispatches', icon: Calendar, keywords: ['schedules', 'cron', 'automated announcements', 'broadcasts'] },
  { id: 'snapshots', label: 'Server Snapshots & Backup', icon: Archive, keywords: ['snapshots', 'backups', 'restore', 'server template', 'export'] },
  { id: 'audit', label: 'Security & Health Audit', icon: ShieldCheck, keywords: ['security audit', 'permission scanner', 'vulnerabilities', 'zombie channels'] },
  { id: 'cleaner', label: 'Bulk Message Cleaner & Purge', icon: Sparkles, keywords: ['cleaner', 'purge', 'clear messages', 'prune', 'bulk delete', 'cw'] },
  { id: 'broadcast', label: 'Cross-Server Mass Broadcast', icon: Megaphone, keywords: ['broadcast', 'cross server', 'mass announce', 'multi guild'] },
  { id: 'members', label: 'Member 360° & Moderation CRM', icon: Users, keywords: ['members', 'crm', 'infractions', 'user lookup', 'notes'] },
  { id: 'workflows', label: 'Visual Automation Flows', icon: Zap, keywords: ['workflows', 'automation', 'triggers', 'actions', 'zapier'] },
  { id: 'knowledge', label: 'Hermes AI Knowledge Base', icon: BrainCircuit, keywords: ['knowledge base', 'hermes', 'ai', 'rag', 'faq', 'documentation', 'kb'] },
  { id: 'settings', label: 'General Settings', icon: Settings, keywords: ['settings', 'prefix', 'bot settings', 'config'] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [copied, setCopied] = useState(false);
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  // Determine if currently in a guild dashboard: /dashboard/[guildId]/...
  const pathParts = pathname.split('/').filter(Boolean);
  const currentGuildId =
    pathParts.length >= 2 && pathParts[0] === 'dashboard' && pathParts[1] !== 'accounts' && pathParts[1] !== 'users' && pathParts[1] !== 'mcp'
      ? pathParts[1]
      : null;

  // Toggle Command Palette on Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    window.addEventListener('keydown', down);
    window.addEventListener('open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, []);

  // Fetch accessible guilds
  useEffect(() => {
    if (!open) return;

    fetch('/api/guilds')
      .then((res) => res.json())
      .then((data) => {
        if (data.guilds && Array.isArray(data.guilds)) {
          setGuilds(data.guilds);
        }
      })
      .catch(() => {});
  }, [open]);

  // Fetch channels & roles if in a guild
  useEffect(() => {
    if (!open || !currentGuildId) {
      setChannels([]);
      setRoles([]);
      return;
    }

    fetch(`/api/guilds/${currentGuildId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channels && Array.isArray(data.channels)) {
          setChannels(data.channels);
        }
        if (data.roles && Array.isArray(data.roles)) {
          setRoles(data.roles);
        }
      })
      .catch(() => {});
  }, [open, currentGuildId]);

  // Deep database search with debounce
  useEffect(() => {
    if (!open || !search || search.trim().length < 2) {
      setDbResults([]);
      setIsSearchingDb(false);
      return;
    }

    setIsSearchingDb(true);
    const timer = setTimeout(() => {
      const url = currentGuildId
        ? `/api/search?q=${encodeURIComponent(search.trim())}&guildId=${currentGuildId}`
        : `/api/search?q=${encodeURIComponent(search.trim())}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.results && Array.isArray(data.results)) {
            setDbResults(data.results);
          } else {
            setDbResults([]);
          }
        })
        .catch(() => setDbResults([]))
        .finally(() => setIsSearchingDb(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [search, open, currentGuildId]);

  // Handle item navigation & close
  const executeSelect = (callback: () => void) => {
    setOpen(false);
    setSearch('');
    callback();
  };

  // Build the base list of all searchable items
  const allItems: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = [];

    // 1. Navigation Modules
    FEATURE_DEFINITIONS.forEach((feat) => {
      // Security: Cross-Server Broadcast should never appear for non-superadmin/non-owner
      if (feat.id === 'broadcast') {
        const currentGuild = guilds.find((g) => g.id === currentGuildId);
        const isOwner = !!currentGuild?.owner;
        const isSuperadmin = guilds.some((g) => g.owner && (g.permissions === '8' || g.permissions === '2147483647'));
        if (!isOwner && !isSuperadmin) {
          return;
        }
      }

      const Icon = feat.icon;
      const targetUrl = currentGuildId
        ? `/dashboard/${currentGuildId}/${feat.id}`
        : `/dashboard`;

      list.push({
        id: `nav-${feat.id}`,
        title: feat.label,
        subtitle: currentGuildId ? `Open ${feat.label} settings` : 'Dashboard module',
        category: 'Navigation',
        keywords: feat.keywords,
        badge: 'Module',
        icon: <Icon className="w-4 h-4 text-emerald-400" />,
        onSelect: () => executeSelect(() => router.push(targetUrl)),
      });
    });

    // Overview link
    if (currentGuildId) {
      list.unshift({
        id: 'nav-overview',
        title: 'Server Overview & Analytics',
        subtitle: 'Dashboard landing & quick metrics',
        category: 'Navigation',
        keywords: ['overview', 'stats', 'analytics', 'dashboard', 'home'],
        badge: 'Home',
        icon: <Layers className="w-4 h-4 text-emerald-400" />,
        onSelect: () => executeSelect(() => router.push(`/dashboard/${currentGuildId}`)),
      });
    }

    // 2. Global Platforms & Tools
    list.push(
      {
        id: 'global-servers',
        title: 'Server Selector',
        subtitle: 'Switch between Discord servers',
        category: 'Navigation',
        keywords: ['servers', 'guilds', 'switch', 'selector', 'all'],
        badge: 'Platform',
        icon: <Server className="w-4 h-4 text-emerald-400" />,
        onSelect: () => executeSelect(() => router.push('/dashboard')),
      },
      {
        id: 'global-mcp',
        title: 'Model Context Protocol (MCP) Hub',
        subtitle: 'Connect Claude Code, OpenCode, Hermes, Codex',
        category: 'Navigation',
        keywords: ['mcp', 'claude code', 'opencode', 'hermes agent', 'codex', 'openclaw', 'ai agent', 'tools'],
        badge: 'AI Tools',
        icon: <Cpu className="w-4 h-4 text-purple-400" />,
        onSelect: () => executeSelect(() => router.push('/dashboard/mcp')),
      },
      {
        id: 'global-accounts',
        title: 'Linked Discord Accounts',
        subtitle: 'Connect multiple Discord profiles',
        category: 'Navigation',
        keywords: ['accounts', 'discord accounts', 'link', 'oauth', 'profile'],
        badge: 'Platform',
        icon: <Users className="w-4 h-4 text-sky-400" />,
        onSelect: () => executeSelect(() => router.push('/dashboard/accounts')),
      },
      {
        id: 'global-users',
        title: 'Platform Users & RBAC',
        subtitle: 'Superadmin user management',
        category: 'Navigation',
        keywords: ['platform users', 'superadmin', 'rbac', 'staff', 'members'],
        badge: 'Admin',
        icon: <Shield className="w-4 h-4 text-rose-400" />,
        onSelect: () => executeSelect(() => router.push('/dashboard/users')),
      },
      {
        id: 'global-home',
        title: 'Tortuga Landing Page',
        subtitle: 'Return to public marketing site',
        category: 'Navigation',
        keywords: ['home', 'landing', 'features', 'marketing'],
        badge: 'Public',
        icon: <Home className="w-4 h-4 text-zinc-400" />,
        onSelect: () => executeSelect(() => router.push('/')),
      }
    );

    // 3. Discord Servers Switcher
    guilds.forEach((g) => {
      list.push({
        id: `server-${g.id}`,
        title: g.name,
        subtitle: `${g.memberCount?.toLocaleString() || 1} members • ${g.botJoined ? 'Bot Active' : 'Not Joined'}`,
        category: 'Servers',
        keywords: ['server', 'guild', g.name, g.id],
        badge: g.botJoined ? 'Joined' : 'Invite',
        icon: g.icon ? (
          <img src={g.icon} alt={g.name} className="w-4 h-4 rounded-full object-cover" />
        ) : (
          <Server className="w-4 h-4 text-zinc-400" />
        ),
        onSelect: () =>
          executeSelect(() => {
            if (g.botJoined) {
              router.push(`/dashboard/${g.id}`);
            } else {
              window.open(APP_CONFIG.botInviteUrl(g.id), '_blank');
            }
          }),
      });
    });

    // 4. Live Channels (if in guild)
    if (channels.length > 0 && currentGuildId) {
      channels.slice(0, 15).forEach((ch) => {
        list.push({
          id: `ch-${ch.id}`,
          title: `#${ch.name}`,
          subtitle: `Channel • ${ch.type}`,
          category: 'Channels',
          keywords: ['channel', ch.name, ch.type],
          badge: `#${ch.type}`,
          icon: <Hash className="w-4 h-4 text-emerald-400" />,
          onSelect: () => executeSelect(() => router.push(`/dashboard/${currentGuildId}/channels`)),
        });
      });
    }

    // 5. Live Roles (if in guild)
    if (roles.length > 0 && currentGuildId) {
      roles.slice(0, 15).forEach((r) => {
        list.push({
          id: `role-${r.id}`,
          title: `@${r.name}`,
          subtitle: `Server Role • Color: ${r.color || 'Default'}`,
          category: 'Roles',
          keywords: ['role', r.name, 'permissions'],
          badge: '@role',
          icon: (
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/20"
              style={{ backgroundColor: r.color || '#99aab5' }}
            />
          ),
          onSelect: () => executeSelect(() => router.push(`/dashboard/${currentGuildId}/roles`)),
        });
      });
    }

    // 6. Quick Actions
    list.push(
      {
        id: 'action-theme',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: `Currently using ${theme} theme`,
        category: 'Actions',
        keywords: ['theme', 'dark mode', 'light mode', 'color', 'appearance'],
        badge: 'UI',
        icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        onSelect: () => {
          toggleTheme();
          setOpen(false);
        },
      },
      {
        id: 'action-invite',
        title: 'Invite Tortuga Bot to a Server',
        subtitle: 'Open Discord OAuth Bot Invite Gateway',
        category: 'Actions',
        keywords: ['invite bot', 'add bot', 'oauth', 'join server'],
        badge: 'Bot',
        icon: <ExternalLink className="w-4 h-4 text-emerald-400" />,
        onSelect: () => executeSelect(() => window.open(APP_CONFIG.botInviteUrl(), '_blank')),
      }
    );

    if (currentGuildId) {
      list.push(
        {
          id: 'action-copy-id',
          title: 'Copy Server Snowflake ID',
          subtitle: `ID: ${currentGuildId}`,
          category: 'Actions',
          keywords: ['copy id', 'snowflake', 'guild id', 'server id'],
          badge: copied ? 'Copied!' : 'Copy',
          icon: copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />,
          onSelect: () => {
            navigator.clipboard.writeText(currentGuildId);
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
              setOpen(false);
            }, 800);
          },
        },
        {
          id: 'action-leaderboard',
          title: 'View Public Leaderboard',
          subtitle: 'Open live leveling XP leaderboard in new tab',
          category: 'Actions',
          keywords: ['leaderboard', 'rank', 'xp', 'public'],
          badge: 'Open',
          icon: <Trophy className="w-4 h-4 text-amber-400" />,
          onSelect: () => executeSelect(() => window.open(`/leaderboard/${currentGuildId}`, '_blank')),
        }
      );
    }

    list.push({
      id: 'action-logout',
      title: 'Sign Out of Tortuga',
      subtitle: 'Terminate active platform and Discord sessions',
      category: 'Actions',
      keywords: ['logout', 'sign out', 'exit', 'disconnect'],
      badge: 'Auth',
      icon: <LogOut className="w-4 h-4 text-rose-400" />,
      onSelect: () =>
        executeSelect(async () => {
          await Promise.all([
            fetch('/api/auth/platform/logout', { method: 'POST' }).catch(() => {}),
            fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}),
          ]);
          window.location.href = '/login';
        }),
    });

    return list;
  }, [currentGuildId, guilds, channels, roles, theme, toggleTheme, copied, router]);

  // Configure Fuse.js fuzzy engine with typo tolerance & weighted fields
  const fuse = useMemo(() => {
    return new Fuse(allItems, {
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'keywords', weight: 0.3 },
        { name: 'subtitle', weight: 0.15 },
        { name: 'category', weight: 0.05 },
      ],
      threshold: 0.35, // Balanced typo tolerance
      ignoreLocation: true,
      includeScore: true,
    });
  }, [allItems]);

  // Filter items using Fuse.js
  const filteredItems = useMemo(() => {
    if (!search || !search.trim()) {
      return allItems;
    }
    return fuse.search(search.trim()).map((res) => res.item);
  }, [search, fuse, allItems]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, PaletteItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const CATEGORY_ORDER = ['Navigation', 'Servers', 'Channels', 'Roles', 'Actions'];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Tortuga Spotlight Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm transition-all"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border/90 bg-card text-foreground shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Top Search Input */}
        <div className="flex items-center px-4 border-b border-border/80 bg-card-subtle/50">
          <Search className="w-4 h-4 text-zinc-400 shrink-0 mr-3" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder={
              currentGuildId
                ? 'Type a command, server, channel, or search database (e.g. "automod", "#general", "!help")...'
                : 'Type a page, server, or action (e.g. "mcp", "servers", "theme")...'
            }
            className="w-full bg-transparent py-3.5 text-sm text-foreground placeholder:text-zinc-500 focus:outline-none"
          />
          {isSearchingDb && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin mr-2 shrink-0" />}
          <kbd
            onClick={() => setOpen(false)}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card-hover text-zinc-400 border border-border shrink-0 cursor-pointer hover:text-white transition"
          >
            ESC
          </kbd>
        </div>

        {/* Scrollable Results List */}
        <Command.List className="max-h-[380px] overflow-y-auto p-2 space-y-3">
          <Command.Empty className="py-12 text-center text-xs text-zinc-500 font-mono">
            No matching items found for &ldquo;{search}&rdquo;
          </Command.Empty>

          {/* Render Deep Database Results First if available */}
          {dbResults.length > 0 && (
            <Command.Group heading="Database Matches (Deep Search)">
              <div className="space-y-1">
                {dbResults.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.title} ${item.subtitle}`}
                    onSelect={() => executeSelect(() => router.push(item.url))}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition text-zinc-200 hover:text-white hover:bg-card-hover aria-selected:bg-card-hover aria-selected:text-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Search className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-100 truncate">{item.title}</div>
                        <div className="text-[11px] text-zinc-400 truncate">{item.subtitle}</div>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 ml-2">
                        {item.badge}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </div>
            </Command.Group>
          )}

          {/* Render Fuse.js Grouped Items */}
          {CATEGORY_ORDER.map((category) => {
            const items = groupedItems[category];
            if (!items || items.length === 0) return null;

            return (
              <Command.Group key={category} heading={category}>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 py-1 select-none">
                  {category}
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.title} ${item.subtitle} ${item.keywords?.join(' ')}`}
                      onSelect={item.onSelect}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition text-zinc-300 hover:text-white hover:bg-card-hover aria-selected:bg-card-hover aria-selected:text-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-card-subtle border border-border flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-100 truncate">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-[11px] text-zinc-400 truncate">{item.subtitle}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.badge && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card-subtle text-zinc-400 border border-border">
                            {item.badge}
                          </span>
                        )}
                        <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 opacity-60" />
                      </div>
                    </Command.Item>
                  ))}
                </div>
              </Command.Group>
            );
          })}
        </Command.List>

        {/* Bottom Footer & Shortcut Legend */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/80 bg-card-subtle/40 text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-card-hover text-zinc-300 border border-border">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-card-hover text-zinc-300 border border-border">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-card-hover text-zinc-300 border border-border">esc</kbd> close
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span>Fuzzy Index + Deep Search</span>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}
