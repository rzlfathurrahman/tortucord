'use client';

import { use, useState, useEffect } from 'react';
import { MOCK_WEBLOGS } from '@/lib/mock-data';
import { WeblogEntry, WeblogActionType } from '@/lib/types';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import {
  ScrollText,
  Search,
  Filter,
  Trash2,
  Edit,
  ShieldAlert,
  UserPlus,
  UserMinus,
  Ban,
  Clock,
  Sparkles,
  ArrowRight,
  Hash,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function WeblogsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [logs, setLogs] = useState<WeblogEntry[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = (filter: string, search: string) => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (filter !== 'ALL') queryParams.set('actionType', filter);
    if (search) queryParams.set('query', search);

    fetch(`/api/guilds/${guildId}/weblogs?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs(selectedFilter, searchQuery);
  }, [guildId, selectedFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(selectedFilter, searchQuery);
  };

  const getActionBadge = (type: WeblogActionType) => {
    switch (type) {
      case 'MESSAGE_DELETE':
        return {
          icon: Trash2,
          label: 'Message Deleted',
          color: 'bg-red-500/15 text-red-400 border-red-500/30',
        };
      case 'MESSAGE_EDIT':
        return {
          icon: Edit,
          label: 'Message Edited',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'AUTOMOD_ALERT':
        return {
          icon: ShieldAlert,
          label: 'AutoMod Triggered',
          color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        };
      case 'TIMEOUT_ADD':
        return {
          icon: Clock,
          label: 'Member Timed Out',
          color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        };
      case 'BAN_ADD':
        return {
          icon: Ban,
          label: 'Member Banned',
          color: 'bg-red-600/20 text-red-300 border-red-500/40',
        };
      case 'MEMBER_JOIN':
        return {
          icon: UserPlus,
          label: 'Member Joined',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'REACTION_ROLE_CLAIM':
        return {
          icon: Sparkles,
          label: 'Role Claimed',
          color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        };
      default:
        return {
          icon: AlertCircle,
          label: type.replace('_', ' '),
          color: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  return (
    <div className="space-y-8 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Weblogs Audit Log Viewer
            </h2>
            <span className="rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
              Permanent History
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete real-time logging for moderation actions, message deletions, edits, and automated security intercepts.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(selectedFilter, searchQuery)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-turtle-400' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Weblogs retention info banner */}
      <div className="rounded-xl border border-border/80 bg-slate-900/60 p-4 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-turtle-500/10 text-turtle-400">
            <ScrollText className="w-4 h-4" />
          </div>
          <p className="text-slate-300">
            <strong className="text-turtle-400">Permanent Audit Retention:</strong> On Tortuga, all message edits, deletions, and moderations are <strong className="text-turtle-400">permanently searchable</strong> without arbitrary expirations or fees.
          </p>
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by mod, target user, keyword, or rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-border text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-turtle-500"
          />
        </form>

        {/* Action Type Filter dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900/90 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
          >
            <option value="ALL">All Event Types</option>
            <option value="AUTOMOD_ALERT">AutoMod Interceptions</option>
            <option value="MESSAGE_DELETE">Message Deletions</option>
            <option value="MESSAGE_EDIT">Message Edits</option>
            <option value="TIMEOUT_ADD">Timeouts & Mutes</option>
            <option value="BAN_ADD">Bans & Kicks</option>
            <option value="MEMBER_JOIN">Member Joins</option>
            <option value="REACTION_ROLE_CLAIM">Reaction Role Claims</option>
          </select>
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="space-y-3">
        {logs.map((log) => {
          const badge = getActionBadge(log.actionType);
          const Icon = badge.icon;

          return (
            <div
              key={log.id}
              className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm hover:border-turtle-500/30 transition space-y-3"
            >
              {/* Event Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase border ${badge.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>

                  {log.channel && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-border">
                      <Hash className="w-3 h-3 text-slate-500" />
                      <span>{log.channel.name}</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span title={formatDate(log.timestamp)}>{formatRelativeTime(log.timestamp)}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-500">{formatDate(log.timestamp)}</span>
                </div>
              </div>

              {/* Actors (Moderator & Target) */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                {/* Moderator */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Actor:</span>
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-border">
                    <img
                      src={log.moderator.avatar}
                      alt={log.moderator.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span className="font-semibold text-white">{log.moderator.name}</span>
                    {log.moderator.bot && (
                      <span className="bg-[#5865F2] text-[9px] font-bold text-white px-1 rounded uppercase">
                        BOT
                      </span>
                    )}
                  </div>
                </div>

                {/* Target User */}
                {log.target && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Target:</span>
                    <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-border">
                      {log.target.avatar && (
                        <img
                          src={log.target.avatar}
                          alt={log.target.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      )}
                      <span className="font-semibold text-slate-200">{log.target.name}</span>
                    </div>
                  </div>
                )}

                {/* Reason */}
                {log.reason && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-slate-500">Reason:</span>
                    <span className="text-slate-200 font-medium">{log.reason}</span>
                  </div>
                )}
              </div>

              {/* Message Details / Diff */}
              {log.details && (
                <div className="rounded-xl bg-slate-900/90 border border-border p-3 text-xs space-y-2 font-mono">
                  {log.details.matchedRule && (
                    <div className="text-[11px] text-turtle-400 font-semibold">
                      Triggered Rule: {log.details.matchedRule}
                    </div>
                  )}

                  {log.details.before && !log.details.after && (
                    <div className="text-red-400/90 whitespace-pre-wrap">
                      <span className="text-red-500 font-bold select-none">- </span>
                      {log.details.before}
                    </div>
                  )}

                  {log.details.before && log.details.after && (
                    <div className="space-y-1">
                      <div className="text-red-400/90 whitespace-pre-wrap">
                        <span className="text-red-500 font-bold select-none">- </span>
                        {log.details.before}
                      </div>
                      <div className="text-emerald-400/90 whitespace-pre-wrap">
                        <span className="text-emerald-500 font-bold select-none">+ </span>
                        {log.details.after}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-slate-900/30">
            <p className="text-sm text-slate-400">No logs found matching criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
