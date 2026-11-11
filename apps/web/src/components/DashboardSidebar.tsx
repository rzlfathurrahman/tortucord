'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserPlus,
  Shield,
  Smile,
  ShieldAlert,
  Pin,
  Trophy,
  Lightbulb,
  ScrollText,
  Palette,
  Settings,
  ExternalLink,
  LifeBuoy,
  FolderTree,
  Webhook,
  Bot,
  Terminal,
  Calendar,
  Lock,
  Archive,
  ShieldCheck,
  Sparkles,
  Megaphone,
  Users,
  Zap,
  BrainCircuit,
  Cpu,
  Search,
  GraduationCap,
  X,
} from 'lucide-react';
import { DiscordGuild } from '@/lib/types';
import { APP_CONFIG } from '@tortuga/config';

export interface SidebarPermissions {
  canManageAll: boolean;
  allowedFeatures: string[];
  isSuperadmin?: boolean;
  isOwner?: boolean;
}

interface DashboardSidebarProps {
  guild: DiscordGuild;
  permissions?: SidebarPermissions;
}

export function DashboardSidebar({ guild, permissions: initialPermissions }: DashboardSidebarProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/${guild.id}`;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    window.addEventListener('close-mobile-sidebar', handleClose);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('toggle-mobile-sidebar', handleToggle);
      window.removeEventListener('close-mobile-sidebar', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const [permissions, setPermissions] = useState<SidebarPermissions>(
    initialPermissions || {
      canManageAll: true,
      allowedFeatures: [],
      isSuperadmin: false,
      isOwner: guild.owner || false,
    }
  );

  useEffect(() => {
    if (initialPermissions) {
      setPermissions(initialPermissions);
      return;
    }

    // Fallback: fetch permissions dynamically if not passed from SSR layout
    fetch(`/api/guilds/${guild.id}/access`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setPermissions({
            canManageAll: data.canManageAll,
            allowedFeatures: data.allowedFeatures || [],
            isSuperadmin: data.isSuperadmin,
            isOwner: data.isOwner ?? guild.owner ?? false,
          });
        }
      })
      .catch(() => {});
  }, [guild.id, guild.owner, initialPermissions]);

  const isOwner = !!(permissions.isOwner || guild.owner);

  const canAccessFeature = (featureId?: string): boolean => {
    if (!featureId) return true; // Overview or items without featureId are always visible
    if (featureId === 'broadcast') {
      return !!(permissions.isSuperadmin || isOwner);
    }
    if (permissions.canManageAll || permissions.isSuperadmin) return true;
    return permissions.allowedFeatures.includes(featureId);
  };

  const navSections = [
    {
      title: 'CORE',
      items: [
        {
          label: 'Overview',
          icon: LayoutDashboard,
          href: `${basePath}`,
          exact: true,
          featureId: '',
        },
        {
          label: 'Settings',
          icon: Settings,
          href: `${basePath}/settings`,
          featureId: 'settings',
        },
      ],
    },
    {
      title: 'SERVER MANAGEMENT',
      items: [
        {
          label: 'Channels & Access',
          icon: FolderTree,
          href: `${basePath}/channels`,
          featureId: 'channels',
        },
        {
          label: 'Onboarding & Welcome',
          icon: UserPlus,
          href: `${basePath}/onboarding`,
          featureId: 'onboarding',
        },
        {
          label: 'Roles & Hierarchy',
          icon: Shield,
          href: `${basePath}/roles`,
          featureId: 'roles',
        },
        {
          label: 'Reaction Roles',
          icon: Smile,
          href: `${basePath}/reaction-roles`,
          featureId: 'reaction-roles',
        },
        {
          label: 'Server Snapshots',
          icon: Archive,
          href: `${basePath}/snapshots`,
          featureId: 'snapshots',
        },
      ],
    },
    {
      title: 'MODERATION & LOGS',
      items: [
        {
          label: 'Member 360 & CRM',
          icon: Users,
          href: `${basePath}/members`,
          featureId: 'members',
        },
        {
          label: 'AutoMod & Watcher',
          icon: ShieldAlert,
          href: `${basePath}/automod`,
          featureId: 'automod',
        },
        {
          label: 'Security & Health Audit',
          icon: ShieldCheck,
          href: `${basePath}/audit`,
          featureId: 'audit',
        },
        {
          label: 'Purge & Cleaner Studio',
          icon: Sparkles,
          href: `${basePath}/cleaner`,
          featureId: 'cleaner',
        },
        {
          label: 'Audit Weblogs',
          icon: ScrollText,
          href: `${basePath}/weblogs`,
          featureId: 'weblogs',
        },
      ],
    },
    {
      title: 'ENGAGEMENT & UTILITY',
      items: [
        {
          label: 'Sticky Messages',
          icon: Pin,
          href: `${basePath}/sticky`,
          featureId: 'sticky',
        },
        {
          label: 'Leveling & XP',
          icon: Trophy,
          href: `${basePath}/leveling`,
          featureId: 'leveling',
        },
        {
          label: 'Suggestions & Starboard',
          icon: Lightbulb,
          href: `${basePath}/suggestions`,
          featureId: 'suggestions',
        },
        {
          label: 'Embed Builder',
          icon: Palette,
          href: `${basePath}/embeds`,
          featureId: 'embeds',
        },
      ],
    },
    {
      title: 'AGENT & INTEGRATIONS',
      items: [
        {
          label: 'Automation Flows',
          icon: Zap,
          href: `${basePath}/workflows`,
          featureId: 'workflows',
        },
        {
          label: 'Hermes Knowledge Base',
          icon: BrainCircuit,
          href: `${basePath}/knowledge`,
          featureId: 'knowledge',
        },
        {
          label: 'Webhook Hub',
          icon: Webhook,
          href: `${basePath}/webhooks`,
          featureId: 'webhooks',
        },
        {
          label: 'Bot Watcher (Hermes)',
          icon: Bot,
          href: `${basePath}/bot-watcher`,
          featureId: 'bot-watcher',
        },
        {
          label: 'Custom Commands',
          icon: Terminal,
          href: `${basePath}/commands`,
          featureId: 'commands',
        },
        {
          label: 'Support Tickets',
          icon: LifeBuoy,
          href: `${basePath}/tickets`,
          featureId: 'tickets',
        },
        {
          label: 'Scheduled Dispatches',
          icon: Calendar,
          href: `${basePath}/schedules`,
          featureId: 'schedules',
        },
        {
          label: 'Cross-Server Broadcast',
          icon: Megaphone,
          href: `${basePath}/broadcast`,
          featureId: 'broadcast',
        },
        {
          label: 'MCP Server & AI Docs',
          icon: Cpu,
          href: '/dashboard/mcp',
          featureId: '',
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-white/[0.08] bg-[#08090d] flex flex-col justify-between h-full lg:h-[calc(100vh-52px)] lg:static lg:top-[52px] lg:w-60 xl:w-64 lg:shrink-0 select-none transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header with close button */}
        <div className="lg:hidden flex items-center justify-between px-3.5 py-3 border-b border-white/[0.08] bg-[#0b0c12]">
          <div className="flex items-center gap-2 min-w-0">
            {guild.icon ? (
              <img
                src={guild.icon}
                alt={guild.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10 shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                {guild.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-bold text-white truncate">{guild.name}</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Quick Search Button (⌘K) */}
          <button
            onClick={() => {
              setMobileOpen(false);
              window.dispatchEvent(new CustomEvent('open-command-palette'));
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition text-xs group"
            title="Search or jump to... (⌘K)"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition" />
              <span className="text-zinc-400 group-hover:text-zinc-200">Search menu...</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
              ⌘K
            </kbd>
          </button>

          {/* Navigation Sections */}
          <div className="space-y-4">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-2.5 text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono">
                  {section.title}
                </p>

                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const hasAccess = canAccessFeature(item.featureId);

                    // Security: Cross-Server Broadcast should never appear for non-superadmin/non-owner
                    if (item.featureId === 'broadcast' && !hasAccess) {
                      return null;
                    }

                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                    const Icon = item.icon;

                    if (!hasAccess) {
                      return (
                        <div
                          key={item.href}
                          title="Permission required: Contact Superadmin to access this module"
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-zinc-600 cursor-not-allowed select-none opacity-40 hover:bg-white/[0.01] transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="w-4 h-4 text-zinc-600 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <Lock className="w-3 h-3 text-zinc-600 shrink-0" />
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition group ${
                          isActive
                            ? 'bg-white/[0.08] text-white font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-emerald-400" />
                        )}
                        <Icon
                          className={`w-4 h-4 transition shrink-0 ${
                            isActive
                              ? 'text-emerald-400'
                              : 'text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Footer info */}
        <div className="p-3 border-t border-white/[0.07] bg-[#07080c] space-y-2">
          <div className="flex items-center justify-between px-2 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="font-mono text-[10px] text-zinc-400">GATEWAY ONLINE</span>
            </div>
            <span className="font-mono text-[10px] text-zinc-500">v1.0.0</span>
          </div>

          <a
            href={APP_CONFIG.discordSupportUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition"
          >
            <div className="flex items-center gap-1.5">
              <LifeBuoy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Support & Docs</span>
            </div>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>
      </aside>
    </>
  );
}
