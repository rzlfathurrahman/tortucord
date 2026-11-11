'use client';

import { use, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Check,
  Zap,
  Smile,
  Lock,
  ExternalLink,
  Info,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Loader2,
  AlertTriangle,
  UserPlus,
  Users,
} from 'lucide-react';

interface EnrichedRole {
  id: string;
  name: string;
  color: string;
  position: number;
  managed: boolean;
  hoist?: boolean;
  mentionable?: boolean;
  isAdmin: boolean;
  canManageRoles: boolean;
  canKickBan: boolean;
  isHigherThanBot: boolean;
  isAutoRole: boolean;
}

interface MemberRoleItem {
  id: string;
  username: string;
  globalName: string;
  avatar: string | null;
  nickname: string | null;
  bot: boolean;
  hasRole: boolean;
}

const COLOR_PRESETS = [
  { name: 'Default', hex: '#99aab5' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Slate', hex: '#64748b' },
];

export default function RolesManagementPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [roles, setRoles] = useState<EnrichedRole[]>([]);
  const [botHighestPos, setBotHighestPos] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createColor, setCreateColor] = useState('#3b82f6');
  const [createHoist, setCreateHoist] = useState(false);
  const [createMentionable, setCreateMentionable] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [editingRole, setEditingRole] = useState<EnrichedRole | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editHoist, setEditHoist] = useState(false);
  const [editMentionable, setEditMentionable] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [deletingRole, setDeletingRole] = useState<EnrichedRole | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Assign modal states
  const [assignRole, setAssignRole] = useState<EnrichedRole | null>(null);
  const [assignMembers, setAssignMembers] = useState<MemberRoleItem[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [loadingAssignMembers, setLoadingAssignMembers] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles`);
      const data = await res.json();
      if (data.roles) {
        setRoles(data.roles);
        if (data.botHighestPosition) setBotHighestPos(data.botHighestPosition);
      }
    } catch {
      showFeedback('error', 'Gagal memuat daftar role');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [guildId]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Filtered roles
  const filteredRoles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.id.includes(q)
    );
  }, [roles, searchQuery]);

  // Handle Toggle Auto-Role
  const handleToggleAutoRole = async (role: EnrichedRole) => {
    const newState = !role.isAutoRole;
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: role.id, isAutoRole: newState }),
      });

      if (res.ok) {
        setRoles((prev) =>
          prev.map((r) => (r.id === role.id ? { ...r, isAutoRole: newState } : r))
        );
        showFeedback(
          'success',
          newState
            ? `@${role.name} dijadikan auto-role saat member baru join.`
            : `@${role.name} dihapus dari auto-role.`
        );
      } else {
        const data = await res.json();
        showFeedback('error', data.error || 'Gagal mengubah auto-role');
      }
    } catch {
      showFeedback('error', 'Gagal menghubungi server.');
    }
  };

  // Handle Create Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setIsSubmittingCreate(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: createName.trim(),
          color: createColor,
          hoist: createHoist,
          mentionable: createMentionable,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', `Role @${createName.trim()} berhasil dibuat.`);
        setIsCreateOpen(false);
        setCreateName('');
        setCreateColor('#3b82f6');
        setCreateHoist(false);
        setCreateMentionable(false);
        fetchRoles();
      } else {
        showFeedback('error', data.error || 'Gagal membuat role.');
      }
    } catch {
      showFeedback('error', 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (role: EnrichedRole) => {
    setEditingRole(role);
    setEditName(role.name);
    setEditColor(role.color && role.color !== '#94a3b8' ? role.color : '#3b82f6');
    setEditHoist(Boolean(role.hoist));
    setEditMentionable(Boolean(role.mentionable));
  };

  // Handle Update Role
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editName.trim()) return;

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: editingRole.id,
          name: editName.trim(),
          color: editColor,
          hoist: editHoist,
          mentionable: editMentionable,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', `Role @${editName.trim()} berhasil diperbarui.`);
        setEditingRole(null);
        fetchRoles();
      } else {
        showFeedback('error', data.error || 'Gagal memperbarui role.');
      }
    } catch {
      showFeedback('error', 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete Role
  const handleDeleteRole = async () => {
    if (!deletingRole) return;

    setIsSubmittingDelete(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: deletingRole.id,
          reason: 'Deleted from Tortuga Dashboard',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback('success', `Role @${deletingRole.name} berhasil dihapus.`);
        setDeletingRole(null);
        fetchRoles();
      } else {
        showFeedback('error', data.error || 'Gagal menghapus role.');
      }
    } catch {
      showFeedback('error', 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Open Assign Modal
  const openAssignModal = async (role: EnrichedRole) => {
    setAssignRole(role);
    setAssignSearch('');
    setLoadingAssignMembers(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles/assign?roleId=${role.id}`);
      const data = await res.json();
      if (data.members) {
        setAssignMembers(data.members);
      }
    } catch {
      showFeedback('error', 'Gagal memuat data member server');
    } finally {
      setLoadingAssignMembers(false);
    }
  };

  // Toggle Assign/Revoke Role for Member
  const handleToggleMemberRole = async (member: MemberRoleItem) => {
    if (!assignRole) return;
    const action = member.hasRole ? 'remove' : 'add';
    setTogglingUserId(member.id);

    try {
      const res = await fetch(`/api/guilds/${guildId}/roles/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: member.id,
          roleId: assignRole.id,
          action,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAssignMembers((prev) =>
          prev.map((m) =>
            m.id === member.id ? { ...m, hasRole: action === 'add' } : m
          )
        );
        showFeedback(
          'success',
          action === 'add'
            ? `Role @${assignRole.name} berhasil diberikan ke @${member.username}`
            : `Role @${assignRole.name} berhasil dicabut dari @${member.username}`
        );
      } else {
        showFeedback('error', data.error || 'Gagal mengubah role member.');
      }
    } catch {
      showFeedback('error', 'Terjadi kesalahan jaringan.');
    } finally {
      setTogglingUserId(null);
    }
  };

  // Filter assign members list
  const filteredAssignMembers = useMemo(() => {
    const q = assignSearch.toLowerCase().trim();
    if (!q) return assignMembers;
    return assignMembers.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.globalName.toLowerCase().includes(q) ||
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        m.id.includes(q)
    );
  }, [assignMembers, assignSearch]);

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2.5 shadow-2xl flex items-center gap-2 text-xs font-medium border ${
            notification.type === 'success'
              ? 'bg-zinc-900 border-emerald-500/40 text-emerald-400'
              : 'bg-zinc-900 border-rose-500/40 text-rose-400'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Role Management & Hierarchy</h2>
            <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded">
              Role Engine
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Buat, edit, hapus role server, assign role ke member, atur hierarki bot, dan kelola auto-role.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Role</span>
          </button>

          <Link
            href={`/dashboard/${guildId}/onboarding`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition"
          >
            <span>Onboarding</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </Link>
        </div>
      </div>

      {/* Hierarchy Info Callout */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0e111a] p-3.5 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
        <p className="text-zinc-400 leading-relaxed">
          <span className="text-zinc-200 font-medium">Hierarchy Enforcement:</span> Discord melarang bot mengubah atau memberikan role yang berada di atas role tertinggi bot. Untuk mengelola role tertentu, geser role <code className="text-emerald-400 font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">Tortuga</code> ke atas di <code className="text-zinc-300 font-mono bg-white/[0.05] px-1 py-0.2 rounded">Discord Server Settings → Roles</code>.
        </p>
      </div>

      {/* Roles List Card */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0e111a] overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-semibold text-zinc-200">Server Roles ({roles.length})</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari role atau ID..."
                className="pl-8 pr-3 py-1 rounded-md bg-zinc-900 border border-white/[0.08] text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 w-48 sm:w-64 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-zinc-500 font-mono text-[11px] hidden md:inline">
              Sorted by Position (Desc)
            </span>
          </div>
        </div>

        {/* Roles Rows */}
        <div className="divide-y divide-white/[0.04]">
          {loading && roles.length === 0 ? (
            <div className="flex items-center justify-center py-12 gap-2 text-zinc-400 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Memuat role server Discord...</span>
            </div>
          ) : (
            filteredRoles.map((role, idx) => {
              const isEveryone = role.id === guildId;
              const canEdit = !role.managed && !role.isHigherThanBot && !isEveryone;
              const canDelete = !role.managed && !role.isHigherThanBot && !isEveryone;

              return (
                <div
                  key={role.id}
                  className="px-5 py-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                >
                  {/* Role Name & Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-mono text-zinc-500 w-6 text-right shrink-0">
                      #{idx + 1}
                    </span>

                    <div
                      className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/20"
                      style={{ backgroundColor: role.color }}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-100 truncate">
                          @{role.name}
                        </span>

                        {isEveryone && (
                          <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-white/10 px-1.5 py-0.2 rounded">
                            EVERYONE
                          </span>
                        )}

                        {role.managed && (
                          <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.2 rounded">
                            BOT
                          </span>
                        )}

                        {role.hoist && (
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.2 rounded">
                            SEPARATED
                          </span>
                        )}

                        {role.mentionable && (
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                            MENTIONABLE
                          </span>
                        )}

                        {role.isAutoRole && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" />
                            AUTO-ROLE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-zinc-500 mt-0.5">ID: {role.id}</p>
                    </div>
                  </div>

                  {/* Status Badges & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {role.isAdmin && (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        ADMIN
                      </span>
                    )}
                    {role.canManageRoles && (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        MANAGE_ROLES
                      </span>
                    )}
                    {role.canKickBan && (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        MODERATE
                      </span>
                    )}

                    {role.isHigherThanBot ? (
                      <span
                        title="Role ini posisinya lebih tinggi dari bot Tortuga. Tidak dapat diubah via dashboard sebelum role Tortuga digeser lebih tinggi di Discord."
                        className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded inline-flex items-center gap-1 font-medium"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Above Bot</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded inline-flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Manageable</span>
                      </span>
                    )}

                    {/* Actions Group */}
                    <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-white/[0.08]">
                      {/* Assign Role Button */}
                      <button
                        onClick={() => openAssignModal(role)}
                        disabled={!canEdit}
                        title={
                          !canEdit
                            ? role.managed
                              ? 'Role bot luar tidak dapat di-assign manual'
                              : isEveryone
                              ? 'Role @everyone otomatis dimiliki semua member'
                              : 'Role lebih tinggi dari bot Tortuga'
                            : 'Assign / Cabut Role ini ke Member Server'
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Assign</span>
                      </button>

                      {/* Edit Role Button */}
                      <button
                        onClick={() => openEditModal(role)}
                        disabled={!canEdit}
                        title={
                          !canEdit
                            ? role.managed
                              ? 'Role dikelola oleh integrasi bot luar'
                              : isEveryone
                              ? 'Role @everyone tidak dapat diedit lewat sini'
                              : 'Role lebih tinggi dari bot Tortuga'
                            : 'Edit Nama, Warna, & Pengaturan Role'
                        }
                        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Role Button */}
                      <button
                        onClick={() => setDeletingRole(role)}
                        disabled={!canDelete}
                        title={
                          !canDelete
                            ? role.managed
                              ? 'Role dikelola oleh integrasi bot luar'
                              : isEveryone
                              ? 'Role @everyone tidak dapat dihapus'
                              : 'Role lebih tinggi dari bot Tortuga'
                            : 'Hapus Role dari Server'
                        }
                        className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Auto-Role Toggle */}
                      <button
                        onClick={() => handleToggleAutoRole(role)}
                        disabled={role.isHigherThanBot || isEveryone}
                        title={role.isAutoRole ? 'Hapus dari auto-role' : 'Jadikan auto-role saat member join'}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                          role.isAutoRole
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                            : 'bg-zinc-800 border-white/[0.08] text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        <span>{role.isAutoRole ? 'Auto On' : 'Auto'}</span>
                      </button>

                      {/* Reaction Roles Link */}
                      <Link
                        href={`/dashboard/${guildId}/reaction-roles`}
                        title="Gunakan role ini di panel reaction roles"
                        className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {filteredRoles.length === 0 && !loading && (
            <div className="text-center py-12 text-zinc-500 text-xs font-mono">
              {searchQuery ? `Tidak ada role yang cocok dengan "${searchQuery}".` : 'Tidak ada role di server.'}
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* 1. ASSIGN ROLE TO MEMBERS MODAL */}
      {/* ========================================== */}
      {assignRole && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e111a] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/20"
                  style={{ backgroundColor: assignRole.color }}
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-100 truncate">
                    Assign Members: @{assignRole.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono">Role ID: {assignRole.id}</p>
                </div>
              </div>
              <button
                onClick={() => setAssignRole(null)}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Member Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Cari nama member, nick, atau ID..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] border border-white/[0.06] rounded-xl bg-black/30 p-1 min-h-[220px]">
              {loadingAssignMembers ? (
                <div className="flex items-center justify-center py-16 gap-2 text-zinc-400 text-xs font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Memuat daftar anggota server...</span>
                </div>
              ) : filteredAssignMembers.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 text-xs font-mono">
                  {assignSearch ? `Tidak ada anggota yang cocok dengan "${assignSearch}".` : 'Tidak ada anggota ditemukan.'}
                </div>
              ) : (
                filteredAssignMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-lg transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.username}
                          className="w-7 h-7 rounded-full shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                          {member.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-200 truncate">
                            {member.globalName || member.username}
                          </span>
                          {member.nickname && (
                            <span className="text-[10px] text-zinc-500 truncate">({member.nickname})</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 block truncate">
                          @{member.username}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleMemberRole(member)}
                      disabled={togglingUserId === member.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50 ${
                        member.hasRole
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {togglingUserId === member.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : member.hasRole ? (
                        <X className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      <span>{member.hasRole ? 'Cabut' : 'Assign'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs text-zinc-400">
              <span>{filteredAssignMembers.filter((m) => m.hasRole).length} anggota memiliki role ini</span>
              <button
                onClick={() => setAssignRole(null)}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. CREATE ROLE MODAL */}
      {/* ========================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e111a] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">Create New Role</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              {/* Role Name */}
              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1">
                  Role Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="misal: Anggota, Magang 2026, VIP..."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Color Presets & Picker */}
              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1.5">
                  Role Color
                </label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setCreateColor(p.hex)}
                      title={p.name}
                      className={`h-7 rounded-md transition relative flex items-center justify-center border cursor-pointer ${
                        createColor.toLowerCase() === p.hex.toLowerCase()
                          ? 'border-white ring-2 ring-emerald-500/50'
                          : 'border-white/10 hover:scale-105'
                      }`}
                      style={{ backgroundColor: p.hex }}
                    >
                      {createColor.toLowerCase() === p.hex.toLowerCase() && (
                        <Check className="w-3 h-3 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={createColor}
                    onChange={(e) => setCreateColor(e.target.value)}
                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={createColor}
                    onChange={(e) => setCreateColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="w-28 px-2.5 py-1.5 rounded bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-200"
                  />
                  {/* Live Preview Pill */}
                  <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-zinc-900/80">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: createColor }} />
                    <span className="text-xs font-medium text-zinc-200 truncate max-w-[120px]">
                      @{createName.trim() || 'RoleName'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Switches: Hoist & Mentionable */}
              <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.05] cursor-pointer hover:bg-zinc-900 transition">
                  <div className="pr-4">
                    <span className="text-xs font-medium text-zinc-200 block">Tampilkan Terpisah (Hoist)</span>
                    <span className="text-[11px] text-zinc-500 block">
                      Tampilkan anggota dengan role ini di grup terpisah pada daftar anggota online.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={createHoist}
                    onChange={(e) => setCreateHoist(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800 border-white/20 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.05] cursor-pointer hover:bg-zinc-900 transition">
                  <div className="pr-4">
                    <span className="text-xs font-medium text-zinc-200 block">Dapat Di-mention</span>
                    <span className="text-[11px] text-zinc-500 block">
                      Izinkan siapa saja untuk me-mention role ini di chat.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={createMentionable}
                    onChange={(e) => setCreateMentionable(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800 border-white/20 cursor-pointer"
                  />
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmittingCreate}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || !createName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Membuat...</span>
                    </>
                  ) : (
                    <span>Create Role</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. EDIT ROLE MODAL */}
      {/* ========================================== */}
      {editingRole && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e111a] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">Edit Role: @{editingRole.name}</h3>
              </div>
              <button
                onClick={() => setEditingRole(null)}
                className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              {/* Role Name */}
              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1">
                  Role Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Color Presets & Picker */}
              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1.5">
                  Role Color
                </label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setEditColor(p.hex)}
                      title={p.name}
                      className={`h-7 rounded-md transition relative flex items-center justify-center border cursor-pointer ${
                        editColor.toLowerCase() === p.hex.toLowerCase()
                          ? 'border-white ring-2 ring-emerald-500/50'
                          : 'border-white/10 hover:scale-105'
                      }`}
                      style={{ backgroundColor: p.hex }}
                    >
                      {editColor.toLowerCase() === p.hex.toLowerCase() && (
                        <Check className="w-3 h-3 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor.startsWith('#') ? editColor : '#3b82f6'}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="w-28 px-2.5 py-1.5 rounded bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-200"
                  />
                  {/* Live Preview Pill */}
                  <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-zinc-900/80">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: editColor }} />
                    <span className="text-xs font-medium text-zinc-200 truncate max-w-[120px]">
                      @{editName.trim() || 'RoleName'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Switches: Hoist & Mentionable */}
              <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.05] cursor-pointer hover:bg-zinc-900 transition">
                  <div className="pr-4">
                    <span className="text-xs font-medium text-zinc-200 block">Tampilkan Terpisah (Hoist)</span>
                    <span className="text-[11px] text-zinc-500 block">
                      Tampilkan anggota dengan role ini di grup terpisah pada daftar anggota online.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editHoist}
                    onChange={(e) => setEditHoist(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800 border-white/20 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.05] cursor-pointer hover:bg-zinc-900 transition">
                  <div className="pr-4">
                    <span className="text-xs font-medium text-zinc-200 block">Dapat Di-mention</span>
                    <span className="text-[11px] text-zinc-500 block">
                      Izinkan siapa saja untuk me-mention role ini di chat.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editMentionable}
                    onChange={(e) => setEditMentionable(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800 border-white/20 cursor-pointer"
                  />
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  disabled={isSubmittingEdit}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit || !editName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. DELETE CONFIRMATION MODAL */}
      {/* ========================================== */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0e111a] border border-rose-500/20 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-zinc-100">Hapus Role?</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Apakah kamu yakin ingin menghapus role <strong className="text-white">@{deletingRole.name}</strong>? Tindakan ini permanen di server Discord dan role akan dicabut dari seluruh member yang memilikinya.
            </p>

            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Role ID:</span>
              <span className="text-zinc-200">{deletingRole.id}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                disabled={isSubmittingDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                disabled={isSubmittingDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold shadow transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Hapus Role</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
