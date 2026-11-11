'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Trash2,
  Check,
  Shield,
  ExternalLink,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface LinkedDiscordAccount {
  id: string;
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  connectedAt: string;
}

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'MEMBER';
}

export default function ConnectedAccountsPage() {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [accounts, setAccounts] = useState<LinkedDiscordAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadData = async () => {
    try {
      const res = await fetch('/api/auth/platform/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
        setAccounts(data.linkedAccounts || []);
      }
    } catch {
      showFeedback('Failed to load connected accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check if redirected from link
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('linked') === 'true') {
        showFeedback('Discord account successfully connected!');
        window.history.replaceState({}, '', '/dashboard/accounts');
      }
    }
  }, []);

  const handleUnlink = async (account: LinkedDiscordAccount) => {
    if (!confirm(`Unlink Discord account @${account.username}?`)) return;

    try {
      const res = await fetch(`/api/auth/platform/unlink?id=${account.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(`Unlinked @${account.username}.`);
        loadData();
      } else {
        showFeedback(data.error || 'Failed to unlink account.');
      }
    } catch {
      showFeedback('Network error unlinking account.');
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-500 text-black px-4 py-2.5 shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="border-b border-white/[0.08] bg-[#0d0f17]/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1920px] 4xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-200">{user.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                  {user.role}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1920px] 4xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Connected Discord Accounts
              </h1>
              <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
                {accounts.length} linked
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Link multiple Discord accounts (Personal, Studio, Alt Bot Testing) into this master platform user.
            </p>
          </div>

          <a
            href="/api/auth/discord/login?link=true"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Link Discord Account</span>
          </a>
        </div>

        {/* Explaination Banner */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">How Multi-Account Aggregation Works</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              When you link Account 1, 2, or 3, Tortuga aggregates the servers accessible by all your connected accounts into your master dashboard. You no longer need to log out of Discord or open incognito tabs to manage different servers!
            </p>
          </div>
        </div>

        {/* Accounts List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Active Connected Accounts ({accounts.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 flex items-center justify-between gap-4 transition hover:border-white/[0.16]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {acc.avatar ? (
                    <img
                      src={acc.avatar}
                      alt={acc.username}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0">
                      {acc.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {acc.globalName || acc.username}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold">
                        CONNECTED
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 truncate">
                      @{acc.username} • ID: {acc.discordId}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleUnlink(acc)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                  title="Unlink account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {accounts.length === 0 && (
            <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] space-y-3">
              <Users className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">No Discord accounts linked yet.</p>
              <a
                href="/api/auth/discord/login?link=true"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect First Discord Account</span>
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
