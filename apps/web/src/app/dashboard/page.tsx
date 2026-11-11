'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MOCK_GUILDS, MOCK_USER } from '@/lib/mock-data';
import { DiscordGuild, DiscordUser, canManageGuild } from '@/lib/types';
import { APP_CONFIG } from '@tortuga/config';
import {
  Search,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Crown,
  Sparkles,
  Users,
  Hash,
  RefreshCw,
  Loader2,
  LogIn,
  Shield,
  Layers,
  Megaphone,
  Lock,
  CreditCard,
} from 'lucide-react';

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'MEMBER';
}

export default function ServerSelectorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [user, setUser] = useState<DiscordUser>(MOCK_USER);
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [linkedAccountsCount, setLinkedAccountsCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRealData = async () => {
    setIsRefreshing(true);
    try {
      const [guildsRes, userRes, platformRes] = await Promise.all([
        fetch('/api/guilds'),
        fetch('/api/auth/discord'),
        fetch('/api/auth/platform/me'),
      ]);
      const guildsData = await guildsRes.json();
      const userData = await userRes.json();
      const platformData = await platformRes.json();

      const userIsAuth = !!(userData.authenticated && userData.user);
      const platformIsAuth = !!(platformData.authenticated && platformData.user);

      if (userIsAuth) {
        setUser(userData.user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }

      if (platformIsAuth) {
        setPlatformUser(platformData.user);
        setLinkedAccountsCount(platformData.linkedAccounts?.length || 0);
      } else {
        setPlatformUser(null);
        setLinkedAccountsCount(0);
      }

      if (userIsAuth || platformIsAuth) {
        setGuilds(guildsData.guilds || []);
      } else {
        setGuilds([]);
      }
    } catch {
      setGuilds([]);
      setIsAuthenticated(false);
      setPlatformUser(null);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealData();

    const onFocus = () => {
      fetchRealData();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const filteredGuilds = guilds.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    fetchRealData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1920px] 4xl:max-w-[2200px] mx-auto w-full px-3.5 sm:px-6 lg:px-8 2xl:px-10 py-6 sm:py-8 lg:py-10">
        {/* User Welcome / Login Banner */}
        <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card-subtle to-slate-900 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 lg:mb-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-turtle-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 relative">
            {platformUser ? (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-2xl shrink-0">
                  🛡️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">
                      Welcome, {platformUser.name}!
                    </h1>
                    <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide font-mono">
                      {platformUser.role}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    Managing servers across <span className="text-emerald-400 font-semibold">{linkedAccountsCount}</span> connected Discord account(s).
                  </p>
                </div>
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-4">
                <img
                  src={user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt={user.username}
                  className="w-14 h-14 rounded-2xl border-2 border-emerald-500/40 shadow-md object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">
                      Welcome back, {user.globalName || user.username}!
                    </h1>
                    <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide font-mono">
                      Discord User
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    Select a server to configure reaction roles, automod, leveling, and webhooks.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-3xl shrink-0">
                  🔒
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      Authentication Required
                    </h1>
                    <span className="rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono px-2 py-0.5">
                      Guest
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Sign in with Discord or your Platform Account to view and configure your servers.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              {platformUser ? (
                <>
                  <Link
                    href="/dashboard/accounts"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] transition"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Linked Accounts ({linkedAccountsCount})</span>
                  </Link>

                  {platformUser.role === 'SUPERADMIN' && (
                    <>
                      <Link
                        href="/dashboard/subscriptions"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-turtle-500/10 hover:bg-turtle-500/15 text-turtle-300 border border-turtle-500/20 transition"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Manage Subscriptions</span>
                      </Link>
                      <Link
                        href="/dashboard/users"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 border border-rose-500/20 transition"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Platform Users</span>
                      </Link>
                    </>
                  )}

                  {guilds.length > 0 && (
                    <Link
                      href={`/dashboard/${guilds[0].id}/broadcast`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 transition"
                      title="Multi-Server Broadcast Console"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Broadcast</span>
                    </Link>
                  )}
                </>
              ) : isAuthenticated ? (
                <>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#0d0f17] hover:bg-white/[0.06] text-zinc-300 hover:text-white border border-white/[0.08] transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/api/auth/discord/login"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-md transition"
                  >
                    <span>Discord Login</span>
                  </a>

                  <Link
                    href="/login?redirect=/dashboard"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] transition"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </Link>
                </>
              )}

              {(isAuthenticated || platformUser) && (
                <a
                  href={APP_CONFIG.botInviteUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bot</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Body Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs text-zinc-400 font-mono">Loading server dashboard...</p>
          </div>
        ) : !isAuthenticated && !platformUser ? (
          /* Unauthenticated Banner and Sign-In CTA */
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17]/90 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#5865F2]/15 border border-[#5865F2]/25 flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg">
              🛡️
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Sign In to Manage Your Servers
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mb-8 leading-relaxed">
              You are currently viewing Tortuga as a guest. Sign in with Discord or your platform credentials to access server configurations, reaction roles, AutoMod, and analytics.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <a
                href="/api/auth/discord/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold shadow-lg transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in with Discord</span>
              </a>
              <Link
                href="/login?redirect=/dashboard"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.1] text-xs font-medium transition"
              >
                <span>Platform Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Authenticated: Search & Stats Bar + Servers Grid */
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter servers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 rounded-lg bg-[#0d0f17] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/[0.2] transition"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                <span>
                  {filteredGuilds.length} servers
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {guilds.filter((g) => g.botJoined).length} active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-4 sm:gap-5">
              {filteredGuilds.map((guild) => {
                const isOwner = guild.owner;
                const isAdmin = canManageGuild(guild.permissions, isOwner) || platformUser?.role === 'SUPERADMIN';
                const canManage = isOwner || isAdmin || !!platformUser;

                return (
                  <div
                    key={guild.id}
                    className="group rounded-xl border border-white/[0.08] bg-[#0d0f17] hover:border-white/[0.16] hover:bg-[#10131d] p-5 flex flex-col justify-between transition duration-150"
                  >
                    <div>
                      {/* Guild Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {guild.icon ? (
                            <img
                              src={guild.icon}
                              alt={guild.name}
                              className="w-11 h-11 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-white/[0.08] flex items-center justify-center font-bold text-zinc-200 text-sm shrink-0">
                              {guild.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition truncate">
                              {guild.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isOwner ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                  <Crown className="w-2.5 h-2.5" /> owner
                                </span>
                              ) : isAdmin ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> admin
                                </span>
                              ) : platformUser ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                  <Shield className="w-2.5 h-2.5" /> staff
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                                  member
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {guild.botJoined ? (
                          <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Active
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-zinc-500 border border-white/[0.06]">
                            Not Joined
                          </span>
                        )}
                      </div>

                      {/* Guild Stats */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-zinc-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-zinc-500" />
                          <span>{guild.memberCount.toLocaleString()} members</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Hash className="w-3 h-3 text-zinc-500" />
                          <span>{guild.channelsCount} channels</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-2">
                      {guild.botJoined ? (
                        canManage ? (
                          <Link
                            href={`/dashboard/${guild.id}`}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs transition duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                          >
                            <span>Configure Dashboard</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                          </Link>
                        ) : (
                          <div className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.03] text-zinc-500 border border-white/[0.06] text-xs font-medium cursor-not-allowed">
                            <Lock className="w-3.5 h-3.5 text-zinc-500" />
                            <span>No Manage Access</span>
                          </div>
                        )
                      ) : (
                        <a
                          href={APP_CONFIG.botInviteUrl(guild.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white border border-white/[0.08] text-xs font-medium transition duration-150"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Invite Bot</span>
                          <ExternalLink className="w-3 h-3 text-zinc-500" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredGuilds.length === 0 && (
              <div className="text-center py-12 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02]">
                <p className="text-xs text-zinc-500">
                  {searchQuery ? `No servers matching "${searchQuery}"` : 'No servers found. Invite Tortuga bot to your Discord server!'}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
