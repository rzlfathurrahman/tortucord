'use client';

import { useState, useEffect, use } from 'react';
import {
  Hash,
  Volume2,
  FolderTree,
  Megaphone,
  Plus,
  Trash2,
  Lock,
  Globe,
  Eye,
  Shield,
  Check,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Sparkles,
  Gamepad2,
  Users,
  AlertCircle,
  X,
  Search,
} from 'lucide-react';
import { DiscordChannel, DiscordRole } from '@/lib/types';

export default function ChannelsAndAccessPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<DiscordChannel | null>(null);

  // Create form state
  const [newType, setNewType] = useState<'text' | 'voice' | 'category' | 'announcement'>('text');
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [newTopic, setNewTopic] = useState('');
  const [newPrivacyMode, setNewPrivacyMode] = useState<'public' | 'readonly' | 'private'>('public');
  const [newAllowedRoleIds, setNewAllowedRoleIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template state
  const [templateStaffRoleIds, setTemplateStaffRoleIds] = useState<string[]>([]);
  const [isDeployingTemplate, setIsDeployingTemplate] = useState(false);

  // Edit Permissions state
  const [editPrivacyMode, setEditPrivacyMode] = useState<'public' | 'readonly' | 'private'>('public');
  const [editAllowedRoleIds, setEditAllowedRoleIds] = useState<string[]>([]);

  // Expanded categories state
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadData = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}`);
      const data = await res.json();
      if (data.channels) setChannels(data.channels);
      if (data.roles) {
        setRoles(data.roles);
        // Default staff role selection: find admin/mod roles if any
        const staffRoles = data.roles
          .filter((r: DiscordRole) =>
            ['admin', 'mod', 'staff', 'moderator'].some((s) => r.name.toLowerCase().includes(s))
          )
          .map((r: DiscordRole) => r.id);
        setTemplateStaffRoleIds(staffRoles);
      }
    } catch {
      showFeedback('Failed to load channels.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const categories = channels.filter((c) => c.type === 'category');
  const uncategorizedChannels = channels.filter(
    (c) => c.type !== 'category' && !c.parentId
  );

  const getChannelsInCategory = (catId: string) => {
    return channels.filter((c) => c.parentId === catId && c.type !== 'category');
  };

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleOpenCreateModal = (type: 'text' | 'voice' | 'category' | 'announcement', parentId = '') => {
    setNewType(type);
    setNewName('');
    setNewParentId(parentId);
    setNewTopic('');
    setNewPrivacyMode('public');
    setNewAllowedRoleIds([]);
    setIsCreateOpen(true);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newName.trim(),
          type: newType,
          parentId: newParentId || undefined,
          topic: newTopic.trim() || undefined,
          isPrivate: newPrivacyMode === 'private',
          isReadOnly: newPrivacyMode === 'readonly',
          allowedRoleIds: newAllowedRoleIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(`Successfully created ${newType} "${newName}"!`);
        setIsCreateOpen(false);
        loadData();
      } else {
        showFeedback(data.error || 'Failed to create channel.');
      }
    } catch {
      showFeedback('Network error creating channel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChannel = async (ch: DiscordChannel) => {
    if (!confirm(`Are you sure you want to delete ${ch.type} "${ch.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/guilds/${guildId}/channels?channelId=${ch.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(`Deleted "${ch.name}".`);
        loadData();
      } else {
        showFeedback(data.error || 'Failed to delete channel.');
      }
    } catch {
      showFeedback('Network error deleting channel.');
    }
  };

  const handleOpenPermsModal = (ch: DiscordChannel) => {
    setSelectedChannel(ch);

    // Detect if channel has private overwrite on @everyone (guildId)
    const overwrites = ch.permissionOverwrites || [];
    const everyoneOw = overwrites.find((o) => o.id === guildId);

    const isPriv = !!everyoneOw && (BigInt(everyoneOw.deny) & 1024n) === 1024n;
    const isReadOnly = !!everyoneOw && (BigInt(everyoneOw.deny) & 2048n) === 2048n;

    if (isPriv) {
      setEditPrivacyMode('private');
    } else if (isReadOnly) {
      setEditPrivacyMode('readonly');
    } else {
      setEditPrivacyMode('public');
    }

    // Find roles allowed
    const allowed = overwrites
      .filter((o) => o.id !== guildId && (BigInt(o.allow) & 1024n) === 1024n)
      .map((o) => o.id);
    setEditAllowedRoleIds(allowed);

    setIsPermsOpen(true);
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'permissions',
          channelId: selectedChannel.id,
          isPrivate: editPrivacyMode === 'private',
          isReadOnly: editPrivacyMode === 'readonly',
          allowedRoleIds: editAllowedRoleIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(`Updated access permissions for "${selectedChannel.name}"!`);
        setIsPermsOpen(false);
        loadData();
      } else {
        showFeedback(data.error || 'Failed to update permissions.');
      }
    } catch {
      showFeedback('Network error updating permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeployTemplate = async (templateId: string) => {
    setIsDeployingTemplate(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'template',
          templateId,
          staffRoleIds: templateStaffRoleIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(data.message || 'Template deployed successfully!');
        setIsTemplateOpen(false);
        loadData();
      } else {
        showFeedback(data.error || 'Failed to deploy template.');
      }
    } catch {
      showFeedback('Network error deploying template.');
    } finally {
      setIsDeployingTemplate(false);
    }
  };

  const toggleRoleSelection = (
    roleId: string,
    current: string[],
    setFn: (roles: string[]) => void
  ) => {
    if (current.includes(roleId)) {
      setFn(current.filter((id) => id !== roleId));
    } else {
      setFn([...current, roleId]);
    }
  };

  const getPrivacyBadge = (ch: DiscordChannel) => {
    const overwrites = ch.permissionOverwrites || [];
    const everyoneOw = overwrites.find((o) => o.id === guildId);

    const isPriv = !!everyoneOw && (BigInt(everyoneOw.deny) & 1024n) === 1024n;
    const isReadOnly = !!everyoneOw && (BigInt(everyoneOw.deny) & 2048n) === 2048n;

    if (isPriv) {
      const allowedCount = overwrites.filter((o) => o.id !== guildId).length;
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono">
          <Lock className="w-2.5 h-2.5" />
          <span>Private ({allowedCount} roles)</span>
        </span>
      );
    }

    if (isReadOnly) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono">
          <Megaphone className="w-2.5 h-2.5" />
          <span>Read-Only</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06] text-[10px] font-mono">
        <Globe className="w-2.5 h-2.5 text-zinc-500" />
        <span>Public</span>
      </span>
    );
  };

  const getChannelIcon = (type: DiscordChannel['type']) => {
    switch (type) {
      case 'voice':
        return <Volume2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'announcement':
        return <Megaphone className="w-3.5 h-3.5 text-sky-400" />;
      case 'category':
        return <FolderTree className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Hash className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-500 text-black px-4 py-2.5 shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Channels & Role Access
            </h2>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              {channels.length} channels
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Create categories, manage text & voice channels, and configure role access permissions with zero friction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => setIsTemplateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Templates</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('category')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
          >
            <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
            <span>New Category</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('text')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Channel</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search channels & categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 rounded-lg bg-[#0d0f17] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/[0.2] transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <span>{categories.length} categories</span>
          <span className="text-zinc-600">•</span>
          <span>{channels.filter((c) => c.type !== 'category').length} channels</span>
        </div>
      </div>

      {/* Tree View of Channels & Categories */}
      <div className="space-y-4">
        {/* Categories and their channels */}
        {categories.map((cat) => {
          const subChannels = getChannelsInCategory(cat.id).filter((c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          const isCollapsed = collapsedCategories[cat.id];

          if (searchQuery && subChannels.length === 0 && !cat.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return null;
          }

          return (
            <div
              key={cat.id}
              className="rounded-xl border border-white/[0.08] bg-[#0d0f17] overflow-hidden"
            >
              {/* Category Header Bar */}
              <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between gap-3">
                <div
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center gap-2 cursor-pointer select-none group"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 group-hover:text-white transition flex items-center gap-1.5">
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    ({subChannels.length})
                  </span>
                  {getPrivacyBadge(cat)}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenCreateModal('text', cat.id)}
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                    title="Add text channel here"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenPermsModal(cat)}
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                    title="Edit category role permissions"
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteChannel(cat)}
                    className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub Channels List */}
              {!isCollapsed && (
                <div className="divide-y divide-white/[0.04]">
                  {subChannels.map((ch) => (
                    <div
                      key={ch.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition pl-8"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getChannelIcon(ch.type)}
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {ch.name}
                        </span>
                        {ch.topic && (
                          <span className="text-[11px] text-zinc-500 truncate hidden md:inline max-w-sm">
                            — {ch.topic}
                          </span>
                        )}
                        {getPrivacyBadge(ch)}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenPermsModal(ch)}
                          className="px-2.5 py-1 rounded text-[11px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition flex items-center gap-1"
                          title="Manage Role Access & Overwrites"
                        >
                          <Shield className="w-3 h-3 text-emerald-400" />
                          <span>Role Access</span>
                        </button>
                        <button
                          onClick={() => handleDeleteChannel(ch)}
                          className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete channel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {subChannels.length === 0 && (
                    <div className="px-8 py-3 text-xs text-zinc-500">
                      No channels inside this category yet.{' '}
                      <button
                        onClick={() => handleOpenCreateModal('text', cat.id)}
                        className="text-emerald-400 hover:underline"
                      >
                        Create one now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] overflow-hidden">
            <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Uncategorized Channels ({uncategorizedChannels.length})
              </span>
              <button
                onClick={() => handleOpenCreateModal('text')}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {uncategorizedChannels.map((ch) => (
                <div
                  key={ch.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getChannelIcon(ch.type)}
                    <span className="text-xs font-medium text-zinc-200 truncate">
                      {ch.name}
                    </span>
                    {ch.topic && (
                      <span className="text-[11px] text-zinc-500 truncate hidden md:inline max-w-sm">
                        — {ch.topic}
                      </span>
                    )}
                    {getPrivacyBadge(ch)}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenPermsModal(ch)}
                      className="px-2.5 py-1 rounded text-[11px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition flex items-center gap-1"
                    >
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span>Role Access</span>
                    </button>
                    <button
                      onClick={() => handleDeleteChannel(ch)}
                      className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Create Channel or Category</span>
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                  Channel Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['text', 'voice', 'announcement', 'category'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewType(t)}
                      className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition ${
                        newType === t
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {getChannelIcon(t)}
                      <span className="capitalize text-[10px]">{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  {newType === 'category' ? 'Category Name' : 'Channel Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={newType === 'category' ? 'COMMUNITY' : 'general-chat'}
                  value={newName}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (newType === 'text') {
                      setNewName(val.toLowerCase().replace(/\s+/g, '-'));
                    } else {
                      setNewName(val);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Parent Category (if not creating category) */}
              {newType !== 'category' && (
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Parent Category
                  </label>
                  <select
                    value={newParentId}
                    onChange={(e) => setNewParentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(No Category - Uncategorized)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        📁 {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Topic (if text) */}
              {newType === 'text' && (
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Topic / Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief channel purpose..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Privacy & Role Access Mode */}
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                  Privacy & Role Access
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPrivacyMode('public')}
                    className={`p-2 rounded-lg border text-left text-xs transition ${
                      newPrivacyMode === 'public'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Public
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Everyone can view & chat</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPrivacyMode('readonly')}
                    className={`p-2 rounded-lg border text-left text-xs transition ${
                      newPrivacyMode === 'readonly'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <Megaphone className="w-3 h-3" /> Read-Only
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Broadcast / announcements</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPrivacyMode('private')}
                    className={`p-2 rounded-lg border text-left text-xs transition ${
                      newPrivacyMode === 'private'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Only selected roles</p>
                  </button>
                </div>
              </div>

              {/* Roles Picker if private or readonly */}
              {newPrivacyMode !== 'public' && (
                <div className="space-y-1.5 p-3 rounded-lg bg-[#08090d] border border-white/[0.06]">
                  <span className="text-[11px] font-medium text-zinc-300 block">
                    {newPrivacyMode === 'private'
                      ? 'Roles allowed to view & join:'
                      : 'Roles allowed to post messages:'}
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {roles
                      .filter((r) => r.name !== '@everyone')
                      .map((r) => {
                        const isSelected = newAllowedRoleIds.includes(r.id);
                        return (
                          <div
                            key={r.id}
                            onClick={() =>
                              toggleRoleSelection(r.id, newAllowedRoleIds, setNewAllowedRoleIds)
                            }
                            className={`px-2.5 py-1.5 rounded-md flex items-center justify-between cursor-pointer text-xs transition select-none ${
                              isSelected
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'hover:bg-white/[0.04] text-zinc-300'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: r.color || '#99aab5' }}
                              ></span>
                              <span>@{r.name}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

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
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS MODAL */}
      {isPermsOpen && selectedChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Role Access: {selectedChannel.name}</span>
              </h3>
              <button
                onClick={() => setIsPermsOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                  Privacy Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPrivacyMode('public')}
                    className={`p-2 rounded-lg border text-left text-xs transition ${
                      editPrivacyMode === 'public'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Public
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Everyone can view & chat</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPrivacyMode('readonly')}
                    className={`p-2 rounded-lg border text-left text-xs transition ${
                      editPrivacyMode === 'readonly'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <Megaphone className="w-3 h-3" /> Read-Only
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Broadcast / announcements</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPrivacyMode('private')}
                    className={`p-2 rounded-lg border text-left text-xs transition ${
                      editPrivacyMode === 'private'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Only selected roles</p>
                  </button>
                </div>
              </div>

              {editPrivacyMode !== 'public' && (
                <div className="space-y-1.5 p-3 rounded-lg bg-[#08090d] border border-white/[0.06]">
                  <span className="text-[11px] font-medium text-zinc-300 block">
                    {editPrivacyMode === 'private'
                      ? 'Roles permitted to access this channel:'
                      : 'Roles permitted to send messages:'}
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {roles
                      .filter((r) => r.name !== '@everyone')
                      .map((r) => {
                        const isSelected = editAllowedRoleIds.includes(r.id);
                        return (
                          <div
                            key={r.id}
                            onClick={() =>
                              toggleRoleSelection(r.id, editAllowedRoleIds, setEditAllowedRoleIds)
                            }
                            className={`px-2.5 py-1.5 rounded-md flex items-center justify-between cursor-pointer text-xs transition select-none ${
                              isSelected
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'hover:bg-white/[0.04] text-zinc-300'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: r.color || '#99aab5' }}
                              ></span>
                              <span>@{r.name}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsPermsOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEMPLATES MODAL */}
      {isTemplateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>1-Click Server Architecture Presets</span>
              </h3>
              <button
                onClick={() => setIsTemplateOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Deploy pre-configured channel categories and permissions directly to your server in seconds.
            </p>

            <div className="space-y-3">
              {/* Template 1: Community Starter */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Community Hub Starter</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Adds <code>📢 INFORMATION</code> (rules, announcements) and <code>💬 COMMUNITY</code> (chat, bot-commands, media, voice).
                  </p>
                </div>
                <button
                  onClick={() => handleDeployTemplate('community')}
                  disabled={isDeployingTemplate}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shrink-0 transition shadow-[0_1px_2px_rgba(0,0,0,0.3)] disabled:opacity-50"
                >
                  {isDeployingTemplate ? 'Deploying...' : 'Deploy'}
                </button>
              </div>

              {/* Template 2: Staff Sanctuary */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Staff & Moderation Sanctuary</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Creates a private <code>🔒 STAFF HEADQUARTERS</code> category with <code>#mod-chat</code>, <code>#incident-logs</code>, and a private Staff voice lounge.
                  </p>
                </div>
                <button
                  onClick={() => handleDeployTemplate('staff')}
                  disabled={isDeployingTemplate}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shrink-0 transition shadow-[0_1px_2px_rgba(0,0,0,0.3)] disabled:opacity-50"
                >
                  {isDeployingTemplate ? 'Deploying...' : 'Deploy'}
                </button>
              </div>

              {/* Template 3: Gaming Hub */}
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Gamepad2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Gaming & Voice Hub</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Adds <code>🎮 GAMING HUBS</code> category with <code>#looking-for-group</code>, Duo Room, Squad Room (4p), and an AFK sleep lounge.
                  </p>
                </div>
                <button
                  onClick={() => handleDeployTemplate('gaming')}
                  disabled={isDeployingTemplate}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shrink-0 transition shadow-[0_1px_2px_rgba(0,0,0,0.3)] disabled:opacity-50"
                >
                  {isDeployingTemplate ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsTemplateOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
