'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Users,
  Search,
  Shield,
  Clock,
  MessageSquare,
  AlertTriangle,
  Ghost,
  Trophy,
  Calendar,
  Eye,
  RefreshCw,
  Tag,
  FileText,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Copy,
  ChevronRight,
  ShieldAlert,
  UserX,
  Plus,
  X,
  Loader2,
} from 'lucide-react';

interface MemberSummary {
  id: string;
  username: string;
  globalName?: string;
  avatar: string | null;
  bot?: boolean;
  nick: string | null;
  roles: string[];
  joinedAt: string;
  level: number;
  xp: number;
  messagesCount: number;
  lastMessageAt: string | null;
  infractionCount: number;
  ticketCount: number;
  isTimedOut: boolean;
  communicationDisabledUntil: string | null;
  isGhost: boolean;
}

interface Member360Detail {
  member: {
    user: {
      id: string;
      username: string;
      globalName?: string;
      avatar: string | null;
      bot?: boolean;
    };
    nick: string | null;
    roles: string[];
    joinedAt: string;
    communicationDisabledUntil: string | null;
  };
  activity: {
    level: number;
    xp: number;
    messagesCount: number;
    voiceMinutes: number;
    lastMessageAt: string | null;
  };
  infractions: {
    id: string;
    caseId: number;
    action: string;
    reason: string | null;
    modId: string;
    createdAt: string;
    active: boolean;
  }[];
  tickets: {
    id: string;
    status: string;
    summary: string | null;
    createdAt: string;
    closedAt: string | null;
  }[];
  notes: {
    id: string;
    authorId: string;
    note: string;
    createdAt: string;
  }[];
}

interface RoleOption {
  id: string;
  name: string;
  color: string;
  managed?: boolean;
  isHigherThanBot?: boolean;
}

export default function MembersPage() {
  const { guildId } = useParams() as { guildId: string };
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    active30d: 0,
    ghostMembers: 0,
    flaggedMembers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Member 360 Drawer State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Member360Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'infractions' | 'tickets' | 'notes'>('overview');

  // Moderation / Note Actions State
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [modActionLoading, setModActionLoading] = useState(false);
  const [modStatusMsg, setModStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [warnReason, setWarnReason] = useState('');
  const [showWarnPrompt, setShowWarnPrompt] = useState(false);

  // Member Role Assignment State
  const [roleActionLoading, setRoleActionLoading] = useState(false);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState('');

  const fetchMembers = async (searchVal = search, filterVal = filter) => {
    try {
      const res = await fetch(
        `/api/guilds/${guildId}/members?search=${encodeURIComponent(searchVal)}&filter=${filterVal}`
      );
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles`);
      if (res.ok) {
        const data = await res.json();
        setRoles(
          (data.roles || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            managed: r.managed,
            isHigherThanBot: r.isHigherThanBot,
          }))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignRoleToMember = async (roleId: string) => {
    if (!selectedUserId || !roleId) return;
    setRoleActionLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, roleId, action: 'add' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDetailData((prev) =>
          prev
            ? {
                ...prev,
                member: {
                  ...prev.member,
                  roles: [...prev.member.roles, roleId],
                },
              }
            : null
        );
        fetchMembers();
        setSelectedRoleToAdd('');
      } else {
        alert(data.error || 'Gagal menambahkan role');
      }
    } catch {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleRemoveRoleFromMember = async (roleId: string) => {
    if (!selectedUserId || !roleId) return;
    setRoleActionLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, roleId, action: 'remove' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDetailData((prev) =>
          prev
            ? {
                ...prev,
                member: {
                  ...prev.member,
                  roles: prev.member.roles.filter((id) => id !== roleId),
                },
              }
            : null
        );
        fetchMembers();
      } else {
        alert(data.error || 'Gagal mencabut role');
      }
    } catch {
      alert('Terjadi kesalahan jaringan');
    } finally {
      setRoleActionLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchMembers(), fetchRoles()]).finally(() => setLoading(false));
  }, [guildId]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    fetchMembers(val, filter);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    fetchMembers(search, newFilter);
  };

  const openMember360 = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setDetailData(null);
    setActiveModalTab('overview');
    setModStatusMsg(null);
    setShowWarnPrompt(false);

    try {
      const res = await fetch(`/api/guilds/${guildId}/members/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleModerateAction = async (action: string, payload: any = {}) => {
    if (!selectedUserId) return;
    setModActionLoading(true);
    setModStatusMsg(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/members/${selectedUserId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModStatusMsg({ success: true, text: `Action ${action} executed successfully.` });
        setShowWarnPrompt(false);
        // Refresh detail
        openMember360(selectedUserId);
        fetchMembers();
      } else {
        setModStatusMsg({ success: false, text: data.error || 'Action failed.' });
      }
    } catch (err: any) {
      setModStatusMsg({ success: false, text: err.message });
    } finally {
      setModActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !newNoteText.trim()) return;
    setAddingNote(true);

    try {
      const res = await fetch(`/api/guilds/${guildId}/members/${selectedUserId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNoteText.trim() }),
      });
      if (res.ok) {
        setNewNoteText('');
        openMember360(selectedUserId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedUserId) return;
    try {
      const res = await fetch(
        `/api/guilds/${guildId}/members/${selectedUserId}/notes?noteId=${noteId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        openMember360(selectedUserId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const roleMap = new Map<string, RoleOption>();
  roles.forEach((r) => roleMap.set(r.id, r));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Member 360° & Moderation CRM</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Deep member activity inspection, cross-referencing infractions, support tickets, ghost user detection, and staff CRM notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMembers()}
            className="p-2 text-zinc-400 hover:text-white rounded-lg bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] transition-all"
            title="Refresh Members"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Total Members</span>
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.totalMembers}</span>
            <span className="text-xs text-zinc-500">synced</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Active Members (30d)</span>
            <span className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
              <Trophy className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.active30d}</span>
            <span className="text-xs text-zinc-500">chatting or joined</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Ghost Members</span>
            <span className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-400">
              <Ghost className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.ghostMembers}</span>
            <span className="text-xs text-zinc-500">&gt;14d with 0 msgs</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0a0a0c] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Flagged / Infractions</span>
            <span className="p-1.5 rounded-md bg-red-500/10 text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{metrics.flaggedMembers}</span>
            <span className="text-xs text-zinc-500">moderated users</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search username, nickname, or ID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0a0a0c] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Members' },
            { id: 'ghost', label: 'Ghost Users' },
            { id: 'staff', label: 'Roles / Staff' },
            { id: 'timeout', label: 'Timed Out' },
            { id: 'infractions', label: 'With Infractions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-white/[0.02] text-zinc-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member Table */}
      <div className="rounded-xl bg-[#0a0a0c] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500">Loading server member directory...</div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">No members found matching filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400 text-[11px] font-mono">
                  <th className="py-3 px-4">MEMBER</th>
                  <th className="py-3 px-4">JOINED</th>
                  <th className="py-3 px-4">ACTIVITY</th>
                  <th className="py-3 px-4">INFRACTIONS</th>
                  <th className="py-3 px-4">TICKETS</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Member Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {m.avatar ? (
                            <img src={m.avatar} alt={m.username} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                              {m.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          {m.bot && (
                            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-indigo-500 text-[8px] font-bold text-white uppercase">
                              BOT
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{m.globalName || m.username}</span>
                            {m.nick && <span className="text-[10px] text-zinc-500">({m.nick})</span>}
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">@{m.username}</span>
                        </div>
                      </div>
                    </td>

                    {/* Joined Column */}
                    <td className="py-3 px-4 text-zinc-400">
                      <div>{new Date(m.joinedAt).toLocaleDateString()}</div>
                      <span className="text-[10px] text-zinc-600">
                        {Math.floor((Date.now() - new Date(m.joinedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                      </span>
                    </td>

                    {/* Activity Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] font-bold text-emerald-400 border border-white/[0.06]">
                          LVL {m.level}
                        </span>
                        <span className="text-zinc-400 font-mono text-[11px]">{m.messagesCount} msgs</span>
                      </div>
                    </td>

                    {/* Infractions Column */}
                    <td className="py-3 px-4">
                      {m.infractionCount > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                          {m.infractionCount} cases
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-600">Clean</span>
                      )}
                    </td>

                    {/* Tickets Column */}
                    <td className="py-3 px-4">
                      {m.ticketCount > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                          {m.ticketCount} tickets
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-600">None</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-4">
                      {m.isTimedOut ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">
                          TIMED OUT
                        </span>
                      ) : m.isGhost ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
                          GHOST USER
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                          ACTIVE
                        </span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openMember360(m.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-white transition-all cursor-pointer ml-auto border border-white/[0.08]"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Inspect 360°</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deep Member 360 Modal / Drawer */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-[#0d0e12] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Top Bar */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Member 360° Intelligence Profile</h3>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {detailLoading || !detailData ? (
              <div className="py-24 text-center text-xs text-zinc-500">
                Retrieving member activity, infractions, and CRM notes...
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* User Identity Card */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {detailData.member.user.avatar ? (
                      <img
                        src={detailData.member.user.avatar}
                        alt="User Avatar"
                        className="w-14 h-14 rounded-full border-2 border-emerald-500/30"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                        {detailData.member.user.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white">
                          {detailData.member.user.globalName || detailData.member.user.username}
                        </h2>
                        {detailData.member.nick && (
                          <span className="text-xs text-zinc-500">({detailData.member.nick})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                        <span>@{detailData.member.user.username}</span>
                        <span>•</span>
                        <span className="text-[11px] text-zinc-500">{detailData.member.user.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Joined & Timeout status */}
                  <div className="text-right text-xs text-zinc-400 space-y-1">
                    <div>Joined: {new Date(detailData.member.joinedAt).toLocaleDateString()}</div>
                    {detailData.member.communicationDisabledUntil && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-400">
                        TIMEOUT ACTIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Roles Chips & Assign Section */}
                <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-zinc-400 font-medium mr-1">Assigned Roles:</span>
                    {detailData.member.roles.length === 0 ? (
                      <span className="text-[11px] text-zinc-600">@everyone</span>
                    ) : (
                      detailData.member.roles.map((rId) => {
                        const r = roleMap.get(rId);
                        const canRevoke = r && !r.managed && !r.isHigherThanBot;
                        return (
                          <span
                            key={rId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 border border-white/[0.08] text-zinc-300"
                          >
                            <span>@{r ? r.name : rId}</span>
                            {canRevoke && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRoleFromMember(rId)}
                                disabled={roleActionLoading}
                                title="Cabut role ini dari member"
                                className="text-zinc-500 hover:text-rose-400 p-0.5 rounded cursor-pointer transition disabled:opacity-40"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Add Role Dropdown */}
                  {roles.filter(
                    (r) =>
                      !detailData.member.roles.includes(r.id) &&
                      r.id !== guildId &&
                      !r.managed &&
                      !r.isHigherThanBot
                  ).length > 0 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                      <select
                        value={selectedRoleToAdd}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedRoleToAdd(val);
                          if (val) handleAssignRoleToMember(val);
                        }}
                        disabled={roleActionLoading}
                        className="px-2.5 py-1 text-xs rounded-lg bg-black/50 border border-white/[0.08] text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="">+ Berikan Role ke Member ini...</option>
                        {roles
                          .filter(
                            (r) =>
                              !detailData.member.roles.includes(r.id) &&
                              r.id !== guildId &&
                              !r.managed &&
                              !r.isHigherThanBot
                          )
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              @{r.name}
                            </option>
                          ))}
                      </select>
                      {roleActionLoading && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Tabs */}
                <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
                  {[
                    { id: 'overview', label: 'Activity Stats' },
                    { id: 'infractions', label: `Infractions (${detailData.infractions.length})` },
                    { id: 'tickets', label: `Tickets (${detailData.tickets.length})` },
                    { id: 'notes', label: `CRM Notes (${detailData.notes.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveModalTab(tab.id as any)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                        activeModalTab === tab.id
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab: Overview */}
                {activeModalTab === 'overview' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] text-xs">
                      <span className="text-zinc-500 text-[10px] font-semibold uppercase">Level</span>
                      <div className="text-lg font-bold text-white mt-1">{detailData.activity.level}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] text-xs">
                      <span className="text-zinc-500 text-[10px] font-semibold uppercase">Total XP</span>
                      <div className="text-lg font-bold text-emerald-400 mt-1">
                        {detailData.activity.xp.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] text-xs">
                      <span className="text-zinc-500 text-[10px] font-semibold uppercase">Messages Sent</span>
                      <div className="text-lg font-bold text-white mt-1">
                        {detailData.activity.messagesCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] text-xs">
                      <span className="text-zinc-500 text-[10px] font-semibold uppercase">Voice Minutes</span>
                      <div className="text-lg font-bold text-white mt-1">
                        {detailData.activity.voiceMinutes}m
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Infractions */}
                {activeModalTab === 'infractions' && (
                  <div className="space-y-2">
                    {detailData.infractions.length === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-500">
                        No infractions or warnings on record for this member.
                      </div>
                    ) : (
                      detailData.infractions.map((inf) => (
                        <div
                          key={inf.id}
                          className="p-3 rounded-lg bg-black/40 border border-white/[0.04] flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                                #{inf.caseId} {inf.action}
                              </span>
                              <span className="text-zinc-400">by {inf.modId}</span>
                            </div>
                            <p className="text-zinc-300 text-[11px]">{inf.reason || 'No reason provided'}</p>
                          </div>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(inf.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Tickets */}
                {activeModalTab === 'tickets' && (
                  <div className="space-y-2">
                    {detailData.tickets.length === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-500">
                        Member has not opened any support tickets.
                      </div>
                    ) : (
                      detailData.tickets.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 rounded-lg bg-black/40 border border-white/[0.04] space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.status === 'OPEN'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {t.status}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              Opened {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-zinc-300 text-[11px]">
                            {t.summary || 'Ticket created (no summary recorded)'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: CRM Notes */}
                {activeModalTab === 'notes' && (
                  <div className="space-y-3">
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Add a private staff CRM note about this member..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={addingNote}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {addingNote ? 'Adding...' : 'Add Note'}
                      </button>
                    </form>

                    {detailData.notes.length === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-500">
                        No CRM notes added yet. Use the field above to record internal notes.
                      </div>
                    ) : (
                      detailData.notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 rounded-lg bg-black/40 border border-white/[0.04] flex items-start justify-between gap-2 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 font-semibold">{n.authorId}</span>
                              <span className="text-[10px] text-zinc-500">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-zinc-300 text-[11px]">{n.note}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteNote(n.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Status Message */}
                {modStatusMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                      modStatusMsg.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/10 border border-red-500/20 text-red-300'
                    }`}
                  >
                    <span>{modStatusMsg.text}</span>
                    <button onClick={() => setModStatusMsg(null)} className="font-bold ml-2">
                      ×
                    </button>
                  </div>
                )}

                {/* Warn Reason Prompt Form */}
                {showWarnPrompt && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-2">
                    <label className="text-xs font-semibold text-yellow-300">Warning Reason</label>
                    <input
                      type="text"
                      value={warnReason}
                      onChange={(e) => setWarnReason(e.target.value)}
                      placeholder="e.g. Breaking rule #2 - Spamming links"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowWarnPrompt(false)}
                        className="px-2.5 py-1 text-xs text-zinc-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          handleModerateAction('WARN', { reason: warnReason || 'Rule violation' })
                        }
                        disabled={modActionLoading}
                        className="px-3 py-1 text-xs font-semibold rounded bg-yellow-500 text-black cursor-pointer"
                      >
                        Confirm Warn
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Moderation Bar */}
                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowWarnPrompt(true)}
                      disabled={modActionLoading}
                      className="px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-medium cursor-pointer"
                    >
                      ⚠️ Warn
                    </button>
                    <button
                      onClick={() => handleModerateAction('TIMEOUT', { durationMinutes: 60 })}
                      disabled={modActionLoading}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-xs font-medium cursor-pointer"
                    >
                      ⏳ Timeout (60m)
                    </button>
                    {detailData.member.communicationDisabledUntil && (
                      <button
                        onClick={() => handleModerateAction('REMOVE_TIMEOUT')}
                        disabled={modActionLoading}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium cursor-pointer"
                      >
                        Unmute Timeout
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Kick ${detailData.member.user.username} from server?`)) {
                          handleModerateAction('KICK', { reason: 'Kicked via Dashboard' });
                        }
                      }}
                      disabled={modActionLoading}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium cursor-pointer"
                    >
                      👢 Kick Member
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(detailData.member.user.id);
                      alert('Copied Snowflake ID to clipboard');
                    }}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy ID
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
