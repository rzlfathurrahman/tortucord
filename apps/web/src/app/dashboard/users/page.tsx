'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Trash2,
  Check,
  Shield,
  Key,
  ChevronLeft,
  X,
  Server,
  FolderTree,
  UserPlus,
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
  Settings,
  CheckSquare,
  Square,
  Loader2,
  Lock,
} from 'lucide-react';

interface GuildAccessItem {
  id: string;
  userId: string;
  guildId: string;
  canManageAll: boolean;
  features: string[];
  createdAt?: string;
  guild?: {
    id: string;
    name: string;
    icon: string | null;
    prefix: string;
    botJoined: boolean;
  };
}

interface PlatformUserItem {
  id: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'MEMBER';
  isActive: boolean;
  createdAt: string;
  linkedDiscordAccounts: {
    id: string;
    username: string;
    discordId: string;
  }[];
  guildAccesses?: {
    id: string;
    guildId: string;
    canManageAll: boolean;
    features: string[];
  }[];
}

interface BotGuildOption {
  id: string;
  name: string;
  icon: string | null;
  botJoined?: boolean;
}

interface FeatureDef {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const FEATURE_ICONS: Record<string, any> = {
  channels: FolderTree,
  onboarding: UserPlus,
  roles: Shield,
  'reaction-roles': Smile,
  automod: ShieldAlert,
  weblogs: ScrollText,
  sticky: Pin,
  leveling: Trophy,
  suggestions: Lightbulb,
  embeds: Palette,
  webhooks: Webhook,
  'bot-watcher': Bot,
  commands: Terminal,
  tickets: LifeBuoy,
  schedules: Calendar,
  settings: Settings,
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<PlatformUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUserItem | null>(null);

  // Permissions Modal state
  const [permsUser, setPermsUser] = useState<PlatformUserItem | null>(null);
  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const [userAccesses, setUserAccesses] = useState<GuildAccessItem[]>([]);
  const [botGuilds, setBotGuilds] = useState<BotGuildOption[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<FeatureDef[]>([]);

  // Form inside Permissions Modal
  const [selectedGuildId, setSelectedGuildId] = useState('');
  const [canManageAll, setCanManageAll] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isSavingPerm, setIsSavingPerm] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'SUPERADMIN' | 'ADMIN' | 'MEMBER'>('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form
  const [editRole, setEditRole] = useState<'SUPERADMIN' | 'ADMIN' | 'MEMBER'>('MEMBER');
  const [newPassword, setNewPassword] = useState('');

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      const res = await fetch('/api/auth/platform/users');
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch {
      showFeedback('Failed to load platform users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/platform/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(`User ${email} created successfully!`);
        setIsCreateOpen(false);
        setName('');
        setEmail('');
        setPassword('');
        loadData();
      } else {
        showFeedback(data.error || 'Failed to create user.');
      }
    } catch {
      showFeedback('Network error creating user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/platform/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          role: editRole,
          password: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(`Updated user ${editingUser.email}!`);
        setEditingUser(null);
        setNewPassword('');
        loadData();
      } else {
        showFeedback(data.error || 'Failed to update user.');
      }
    } catch {
      showFeedback('Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (u: PlatformUserItem) => {
    if (!confirm(`Delete platform user "${u.name}" (${u.email})?`)) return;

    try {
      const res = await fetch(`/api/auth/platform/users?id=${u.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(`Deleted ${u.email}.`);
        loadData();
      } else {
        showFeedback(data.error || 'Failed to delete user.');
      }
    } catch {
      showFeedback('Network error.');
    }
  };

  const openEdit = (u: PlatformUserItem) => {
    setEditingUser(u);
    setEditRole(u.role);
    setNewPassword('');
  };

  // Permissions Modal Handlers
  const openPermissionsModal = async (u: PlatformUserItem) => {
    setPermsUser(u);
    setIsPermsOpen(true);
    setIsLoadingPerms(true);

    try {
      const res = await fetch(`/api/auth/platform/users/${u.id}/permissions`);
      const data = await res.json();
      if (data.success) {
        setUserAccesses(data.accesses || []);
        setBotGuilds(data.botGuilds || []);
        setAvailableFeatures(data.availableFeatures || []);

        // Pick initial selected guild
        const initialGuildId =
          data.accesses?.[0]?.guildId || data.botGuilds?.[0]?.id || '';
        setSelectedGuildId(initialGuildId);

        // Populate fields if this guild already has access
        const existing = data.accesses?.find(
          (a: GuildAccessItem) => a.guildId === initialGuildId
        );
        if (existing) {
          setCanManageAll(existing.canManageAll);
          setSelectedFeatures(existing.features || []);
        } else {
          setCanManageAll(false);
          setSelectedFeatures([]);
        }
      } else {
        showFeedback(data.error || 'Failed to load user permissions.');
      }
    } catch {
      showFeedback('Network error loading permissions.');
    } finally {
      setIsLoadingPerms(false);
    }
  };

  const handleGuildSelectChange = (guildId: string) => {
    setSelectedGuildId(guildId);
    const existing = userAccesses.find((a) => a.guildId === guildId);
    if (existing) {
      setCanManageAll(existing.canManageAll);
      setSelectedFeatures(existing.features || []);
    } else {
      setCanManageAll(false);
      setSelectedFeatures([]);
    }
  };

  const handleToggleFeature = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleSelectAllFeatures = () => {
    setSelectedFeatures(availableFeatures.map((f) => f.id));
  };

  const handleClearAllFeatures = () => {
    setSelectedFeatures([]);
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permsUser || !selectedGuildId) return;

    setIsSavingPerm(true);
    try {
      const res = await fetch(`/api/auth/platform/users/${permsUser.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: selectedGuildId,
          canManageAll,
          features: selectedFeatures,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback('Server permissions saved successfully!');
        // Refresh permissions modal data
        const refreshRes = await fetch(`/api/auth/platform/users/${permsUser.id}/permissions`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setUserAccesses(refreshData.accesses || []);
        }
        loadData();
      } else {
        showFeedback(data.error || 'Failed to save permissions.');
      }
    } catch {
      showFeedback('Network error saving permissions.');
    } finally {
      setIsSavingPerm(false);
    }
  };

  const handleRevokeGuildAccess = async (guildId: string, guildName: string) => {
    if (!permsUser) return;
    if (!confirm(`Revoke dashboard access for "${guildName}" from ${permsUser.name}?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/auth/platform/users/${permsUser.id}/permissions?guildId=${guildId}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        showFeedback(`Revoked access to ${guildName}.`);
        setUserAccesses((prev) => prev.filter((a) => a.guildId !== guildId));
        if (selectedGuildId === guildId) {
          setCanManageAll(false);
          setSelectedFeatures([]);
        }
        loadData();
      } else {
        showFeedback(data.error || 'Failed to revoke server access.');
      }
    } catch {
      showFeedback('Network error revoking access.');
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

          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
            SUPERADMIN ACCESS ONLY
          </span>
        </div>
      </header>

      <main className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1920px] 4xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Platform User Management
              </h1>
              <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
                {users.length} users
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Manage dashboard platform users, assign roles, and delegate granular server & feature permissions independently of Discord hierarchy.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Platform User</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Linked Discord</th>
                  <th className="px-5 py-3">Server Access (RBAC)</th>
                  <th className="px-5 py-3">Created Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u) => {
                  const accessCount = u.guildAccesses?.length || 0;

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.01] transition">
                      <td className="px-5 py-3.5">
                        <div>
                          <span className="font-semibold text-white block">{u.name}</span>
                          <span className="text-zinc-500 font-mono text-[11px]">{u.email}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            u.role === 'SUPERADMIN'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : u.role === 'ADMIN'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-zinc-300">
                            {u.linkedDiscordAccounts.length} accounts
                          </span>
                          {u.linkedDiscordAccounts.length > 0 && (
                            <span className="text-zinc-500 font-mono text-[10px]">
                              ({u.linkedDiscordAccounts.map((a) => `@${a.username}`).join(', ')})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {u.role === 'SUPERADMIN' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            All Servers (Unrestricted)
                          </span>
                        ) : accessCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
                            <Server className="w-3 h-3" />
                            <span>{accessCount} server{accessCount > 1 ? 's' : ''} assigned</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[11px]">
                            None assigned
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-zinc-500 font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {u.role !== 'SUPERADMIN' && (
                            <button
                              onClick={() => openPermissionsModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition text-xs font-medium"
                              title="Manage Granular Server Access"
                            >
                              <Shield className="w-3 h-3" />
                              <span>Permissions</span>
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(u)}
                            className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Create Platform User</span>
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@tortuga.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Platform Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="MEMBER">Member (Standard Dashboard Access)</option>
                  <option value="ADMIN">Admin (Server Configuration)</option>
                  <option value="SUPERADMIN">Superadmin (Full System & User Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Edit User: {editingUser.email}</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Platform Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="MEMBER">Member (Standard Dashboard Access)</option>
                  <option value="ADMIN">Admin (Server Configuration)</option>
                  <option value="SUPERADMIN">Superadmin (Full System & User Control)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Reset Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  placeholder="New password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRANULAR PERMISSIONS MODAL (OPTION 5) */}
      {isPermsOpen && permsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="rounded-2xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-3xl w-full space-y-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/[0.08] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">
                    Granular Server & Feature Permissions
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Assign specific servers and individual dashboard modules for{' '}
                  <span className="text-emerald-400 font-semibold">{permsUser.name}</span>{' '}
                  ({permsUser.email}).
                </p>
              </div>

              <button
                onClick={() => setIsPermsOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingPerms ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs font-mono">Loading user server permissions...</span>
              </div>
            ) : (
              <div className="space-y-6 overflow-y-auto flex-1 pr-1">
                {/* 1. Existing Active Server Grants */}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono mb-2.5">
                    Active Server Access ({userAccesses.length})
                  </h4>

                  {userAccesses.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/[0.08] p-4 text-center text-xs text-zinc-500 bg-white/[0.01]">
                      No servers currently assigned to this user. Select a server below to grant access.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {userAccesses.map((acc) => (
                        <div
                          key={acc.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition ${
                            selectedGuildId === acc.guildId
                              ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
                              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleGuildSelectChange(acc.guildId)}
                            className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                          >
                            {acc.guild?.icon ? (
                              <img
                                src={acc.guild.icon}
                                alt={acc.guild.name}
                                className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                                {acc.guild?.name?.slice(0, 2).toUpperCase() || 'SV'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-200 truncate">
                                {acc.guild?.name || acc.guildId}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {acc.canManageAll ? (
                                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                    Full Server Access
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                                    {acc.features.length} features allowed
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRevokeGuildAccess(acc.guildId, acc.guild?.name || acc.guildId)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 transition rounded ml-2"
                            title="Revoke server access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Server Assignment & Feature Config Form */}
                <form onSubmit={handleSavePermissions} className="space-y-4 pt-4 border-t border-white/[0.08]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="w-full sm:max-w-xs">
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                        Select Discord Server to Configure
                      </label>
                      <select
                        value={selectedGuildId}
                        onChange={(e) => handleGuildSelectChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="" disabled>
                          -- Choose a Server --
                        </option>
                        {botGuilds.map((bg) => (
                          <option key={bg.id} value={bg.id}>
                            {bg.name} {userAccesses.some((a) => a.guildId === bg.id) ? '(Assigned)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Master canManageAll toggle */}
                    <div className="flex items-center gap-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !canManageAll;
                          setCanManageAll(next);
                          if (next) {
                            setSelectedFeatures(availableFeatures.map((f) => f.id));
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                          canManageAll
                            ? 'bg-emerald-500 text-black border-emerald-400'
                            : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08]'
                        }`}
                      >
                        {canManageAll ? (
                          <CheckSquare className="w-3.5 h-3.5 text-black" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span>Grant Full Access (All Features)</span>
                      </button>
                    </div>
                  </div>

                  {/* Feature Matrix */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-zinc-400">
                        Permitted Modules for this Server:
                      </label>

                      {!canManageAll && (
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={handleSelectAllFeatures}
                            className="text-emerald-400 hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-zinc-600">•</span>
                          <button
                            type="button"
                            onClick={handleClearAllFeatures}
                            className="text-zinc-500 hover:text-zinc-300 hover:underline"
                          >
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 bg-[#08090d] rounded-xl border border-white/[0.06]">
                      {availableFeatures.map((feat) => {
                        const Icon = FEATURE_ICONS[feat.id] || Shield;
                        const isChecked = canManageAll || selectedFeatures.includes(feat.id);

                        return (
                          <div
                            key={feat.id}
                            onClick={() => {
                              if (!canManageAll) handleToggleFeature(feat.id);
                            }}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition ${
                              canManageAll
                                ? 'border-white/[0.04] bg-white/[0.01] opacity-70 cursor-not-allowed'
                                : isChecked
                                ? 'border-emerald-500/30 bg-emerald-500/[0.06] cursor-pointer'
                                : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] cursor-pointer'
                            }`}
                          >
                            <div className="pt-0.5">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                <span className="text-xs font-semibold text-zinc-200">
                                  {feat.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                                {feat.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save button footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {canManageAll
                        ? 'Full server override active'
                        : `${selectedFeatures.length} of ${availableFeatures.length} features enabled`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPermsOpen(false)}
                        className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
                      >
                        Close
                      </button>

                      <button
                        type="submit"
                        disabled={!selectedGuildId || isSavingPerm}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
                      >
                        {isSavingPerm ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Server Access</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
