'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  CreditCard,
  Crown,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowLeft,
  Server,
  Save,
  RefreshCw,
} from 'lucide-react';

interface GuildSubscription {
  id: string;
  premium: boolean;
  premiumTier: number;
  premiumExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    reactionRoleGroups: number;
    stickyMessages: number;
    infractions: number;
    weblogEntries: number;
  };
}

export default function SubscriptionsAdminPage() {
  const [guilds, setGuilds] = useState<GuildSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/subscriptions');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch subscriptions');
      }
      setGuilds(data.guilds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleUpdate = async (guildId: string, tier: number, daysValid: number | null) => {
    setUpdatingId(guildId);
    try {
      const expires =
        daysValid !== null
          ? new Date(Date.now() + daysValid * 86400 * 1000).toISOString()
          : null;

      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          premium: tier > 0,
          premiumTier: tier,
          premiumExpiresAt: expires,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Update failed');
      }

      setGuilds((prev) =>
        prev.map((g) =>
          g.id === guildId
            ? {
                ...g,
                premium: tier > 0,
                premiumTier: tier,
                premiumExpiresAt: expires,
              }
            : g
        )
      );

      setFeedback(`Guild ${guildId} successfully upgraded to Tier ${tier}!`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredGuilds = guilds.filter((g) =>
    g.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* Top Breadcrumb & Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <CreditCard className="w-7 h-7 text-turtle-400" />
              Guild Subscriptions Manager
            </h1>
            <span className="bg-turtle-500/10 text-turtle-400 text-xs font-mono font-bold px-2 py-0.5 rounded border border-turtle-500/20">
              Superadmin Console
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Assign and manage SaaS subscription tiers (Starter, Pro, Enterprise) for active Discord guilds.
          </p>
        </div>

        <button
          onClick={fetchSubscriptions}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          {feedback}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Tier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tier 0</span>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Starter</span>
          </div>
          <p className="text-xl font-bold text-white">$0 / Free</p>
          <p className="text-[11px] text-slate-400">
            Capped reaction roles, 2 sticky messages, 7-day weblogs.
          </p>
        </div>

        <div className="rounded-2xl border border-turtle-500/40 bg-gradient-to-br from-turtle-950/20 via-card to-card p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-turtle-400">Tier 1</span>
            <span className="text-xs font-mono bg-turtle-500/20 text-turtle-300 px-2 py-0.5 rounded font-bold">Pro</span>
          </div>
          <p className="text-xl font-bold text-white">$4.99 / mo</p>
          <p className="text-[11px] text-slate-400">
            Unlimited reaction roles & stickies, Drama Watcher, 90-day retention.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-card to-card p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Tier 2</span>
            <span className="text-xs font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">Enterprise</span>
          </div>
          <p className="text-xl font-bold text-white">$14.99 / mo</p>
          <p className="text-[11px] text-slate-400">
            Multi-guild perks, permanent weblogs, dedicated agent webhooks.
          </p>
        </div>
      </div>

      {/* Guild Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Guild ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <strong>{filteredGuilds.length}</strong> guilds
        </div>
      </div>

      {/* Guild Subscriptions Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-slate-900/60 shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/80 bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
              <th className="py-3.5 px-4">Guild Snowflake</th>
              <th className="py-3.5 px-4">Current Tier</th>
              <th className="py-3.5 px-4">Expires At</th>
              <th className="py-3.5 px-4">Usage Stats</th>
              <th className="py-3.5 px-4 text-right">Quick Tier Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-slate-300">
            {filteredGuilds.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  {loading ? 'Loading guilds...' : 'No guilds found.'}
                </td>
              </tr>
            ) : (
              filteredGuilds.map((g) => (
                <tr key={g.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-4 px-4 font-mono font-medium text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-400" />
                    <span>{g.id}</span>
                  </td>
                  <td className="py-4 px-4">
                    {g.premiumTier === 2 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Crown className="w-3 h-3" /> Tier 2 (Enterprise)
                      </span>
                    ) : g.premiumTier === 1 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-turtle-500/10 text-turtle-400 border border-turtle-500/30">
                        <Sparkles className="w-3 h-3" /> Tier 1 (Pro)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Tier 0 (Free Starter)
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                    {g.premiumExpiresAt
                      ? new Date(g.premiumExpiresAt).toLocaleDateString()
                      : 'Lifetime / None'}
                  </td>
                  <td className="py-4 px-4 text-[11px] text-slate-400">
                    <span>{g._count.reactionRoleGroups} RR</span> •{' '}
                    <span>{g._count.stickyMessages} Stickies</span> •{' '}
                    <span>{g._count.weblogEntries} Logs</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        disabled={updatingId === g.id}
                        onClick={() => handleUpdate(g.id, 0, null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 transition"
                      >
                        Free
                      </button>
                      <button
                        disabled={updatingId === g.id}
                        onClick={() => handleUpdate(g.id, 1, 30)}
                        className="px-2.5 py-1 rounded-lg bg-turtle-600/20 hover:bg-turtle-600/30 text-[11px] text-turtle-400 border border-turtle-500/30 transition font-semibold"
                      >
                        +30d Pro
                      </button>
                      <button
                        disabled={updatingId === g.id}
                        onClick={() => handleUpdate(g.id, 2, 365)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[11px] text-amber-400 border border-amber-500/30 transition font-semibold"
                      >
                        +1y Enterprise
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
