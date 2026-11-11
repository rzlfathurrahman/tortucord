'use client';

import { use, useState, useEffect } from 'react';
import {
  MOCK_REACTION_ROLE_GROUPS,
  MOCK_CHANNELS,
  MOCK_ROLES,
  MOCK_GUILDS,
} from '@/lib/mock-data';
import { ReactionRoleGroup, ReactionRoleMode, ReactionRoleItem, DiscordChannel, DiscordRole } from '@/lib/types';
import {
  Smile,
  Plus,
  Trash2,
  Check,
  Info,
  Hash,
  Sparkles,
  Layers,
  HelpCircle,
  X,
} from 'lucide-react';

export default function ReactionRolesPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);

  const [groups, setGroups] = useState<ReactionRoleGroup[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New Group Form State
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [mode, setMode] = useState<ReactionRoleMode>('normal');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ReactionRoleItem[]>([
    { id: '1', emoji: '✨', roleId: '', label: 'Member' },
  ]);

  useEffect(() => {
    // Fetch real channels & roles
    fetch(`/api/guilds/${guildId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          setChannelId(data.channels[0].id);
        }
        if (data.roles && data.roles.length > 0) {
          setRoles(data.roles);
          setItems([{ id: '1', emoji: '✨', roleId: data.roles[0].id, label: 'Member' }]);
        }
      })
      .catch(() => {});

    // Fetch initial reaction roles from DB
    fetch(`/api/guilds/${guildId}/reaction-roles`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reactionRoles) {
          setGroups(data.reactionRoles);
        }
      })
      .catch(() => {});
  }, [guildId]);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddItem = () => {
    const newItem: ReactionRoleItem = {
      id: `${Date.now()}`,
      emoji: '🎯',
      roleId: roles[0]?.id || '2006',
      label: 'New Role',
      style: 'secondary',
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof ReactionRoleItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      channelId,
      mode,
      description,
      items,
    };

    try {
      const res = await fetch(`/api/guilds/${guildId}/reaction-roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.group) {
        setGroups([data.group, ...groups]);
      }
    } catch {
      // Local fallback
      const fallbackGroup: ReactionRoleGroup = {
        id: `rr-group-${Date.now()}`,
        guildId,
        name,
        channelId,
        messageId: `${Date.now()}`,
        description,
        mode,
        createdAt: new Date().toISOString(),
        items,
      };
      setGroups([fallbackGroup, ...groups]);
    }

    setIsCreateOpen(false);
    setName('');
    setDescription('');
    showFeedback('Reaction Role group created successfully!');
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await fetch(`/api/guilds/${guildId}/reaction-roles?id=${groupId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error(e);
    }
    setGroups(groups.filter((g) => g.id !== groupId));
    showFeedback('Reaction role group removed.');
  };

  const modeExplanations: Record<ReactionRoleMode, string> = {
    normal: 'Members can select any number of roles and toggle them off.',
    unique: 'Members can only have one role from this group at a time.',
    verify: 'Clicking once gives the role permanently (ideal for welcome gates).',
    reverse: 'Clicking removes the role, unclicking grants it.',
    timed: 'Role is granted for a specific duration then removed automatically.',
    dropdown: 'Modern Discord select menu dropdown format.',
    buttons: 'Interactive modern Discord buttons rather than message reactions.',
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-500 text-black px-4 py-2.5 shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Reaction Roles
            </h2>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              Unlimited Slots
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Allow your Discord members to assign roles using reactions, interactive buttons, or dropdown menus.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Group</span>
        </button>
      </div>

      {/* Mode Guides Banner */}
      <div className="rounded-xl border border-border/80 bg-slate-900/60 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex items-start gap-2.5">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Smile className="w-4 h-4" />
          </span>
          <div>
            <h4 className="font-semibold text-white">Unique & Normal Modes</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Standard toggle or mutually-exclusive choices (e.g. platform or regions).
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Layers className="w-4 h-4" />
          </span>
          <div>
            <h4 className="font-semibold text-white">Buttons & Dropdowns</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Modern Discord message components with colors and labels.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h4 className="font-semibold text-white">Verification Gates</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Grant server access with 1 click without allow-removal exploit.
            </p>
          </div>
        </div>
      </div>

      {/* Active Groups List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Active Reaction Role Sets ({groups.length})
          </h3>
          <span className="text-xs text-turtle-400 font-medium">
            Limitless capacity: ∞ available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => {
            const channel = channels.find((c) => c.id === group.channelId);

            return (
              <div
                key={group.id}
                className="rounded-2xl border border-border/80 bg-card/60 p-6 flex flex-col justify-between shadow-sm hover:border-turtle-500/30 transition space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{group.name}</h4>
                        <span className="rounded bg-slate-800 text-turtle-400 border border-slate-700 text-[10px] font-mono px-2 py-0.5 uppercase">
                          {group.mode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Hash className="w-3.5 h-3.5 text-slate-500" />
                        <span>{channel ? channel.name : 'Unknown Channel'}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/80 transition"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {group.description && (
                    <p className="text-xs text-slate-300 mt-2 bg-slate-900/40 p-2.5 rounded-lg border border-border/40">
                      {group.description}
                    </p>
                  )}

                  {/* Roles list */}
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Assigned Mappings ({group.items.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => {
                        const role = roles.find((r) => r.id === item.roleId);

                        return (
                          <div
                            key={item.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900/80 border border-border px-3 py-1.5 text-xs shadow-inner"
                          >
                            <span className="text-base leading-none">{item.emoji}</span>
                            <span
                              className="font-semibold text-slate-200"
                              style={{ color: role?.color && role.color !== '#000000' ? role.color : '#e2e8f0' }}
                            >
                              @{role ? role.name : item.label || 'Role'}
                            </span>
                            {item.label && item.label !== role?.name && (
                              <span className="text-[10px] text-slate-500">({item.label})</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Message ID: {group.messageId || 'Auto-generated'}</span>
                  <span>{modeExplanations[group.mode] || 'Active'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎭</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Reaction Role Group</h3>
                  <p className="text-xs text-slate-400">
                    Map emojis or buttons to Discord server roles.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-5">
              {/* Name & Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Group Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Platform Roles, Color Roles"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-border text-sm text-white focus:outline-none focus:border-turtle-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Discord Channel
                  </label>
                  <select
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-border text-sm text-white focus:outline-none focus:border-turtle-500"
                  >
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mode Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Selection Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as ReactionRoleMode)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-border text-sm text-white focus:outline-none focus:border-turtle-500"
                >
                  <option value="normal">Normal (Multi-select toggling)</option>
                  <option value="unique">Unique (Choose 1 only, auto-replaces others)</option>
                  <option value="verify">Verify (Click once for member gate access)</option>
                  <option value="reverse">Reverse (Click to remove role)</option>
                  <option value="timed">Timed (Auto-expiring temporary role)</option>
                  <option value="dropdown">Dropdown (Discord select menu)</option>
                  <option value="buttons">Buttons (Discord interactive buttons)</option>
                </select>
                <p className="text-xs text-turtle-400 mt-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  {modeExplanations[mode]}
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Message Prompt / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. React below to pick your notification preferences!"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-border text-sm text-white focus:outline-none focus:border-turtle-500 resize-none"
                />
              </div>

              {/* Emoji / Role Mappings Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Emoji & Role Pairs
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-turtle-400 hover:text-turtle-300 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Role
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/90 border border-border"
                    >
                      {/* Emoji input */}
                      <input
                        type="text"
                        value={item.emoji}
                        onChange={(e) => handleUpdateItem(item.id, 'emoji', e.target.value)}
                        className="w-12 text-center py-1.5 rounded-lg bg-slate-800 border border-border text-base focus:outline-none focus:border-turtle-500"
                        title="Emoji"
                      />

                      {/* Role selector */}
                      <select
                        value={item.roleId}
                        onChange={(e) => handleUpdateItem(item.id, 'roleId', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            @{r.name}
                          </option>
                        ))}
                      </select>

                      {/* Label input */}
                      <input
                        type="text"
                        placeholder="Button / Option label"
                        value={item.label || ''}
                        onChange={(e) => handleUpdateItem(item.id, 'label', e.target.value)}
                        className="w-36 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
                      />

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
                >
                  Save & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
