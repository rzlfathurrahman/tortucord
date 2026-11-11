'use client';

import { useState, useEffect, use } from 'react';
import {
  Terminal,
  Plus,
  Trash2,
  Check,
  Code,
  Sparkles,
  Shield,
  Clock,
  X,
  Variable,
  Search,
} from 'lucide-react';
import { DiscordRole } from '@/lib/types';
import { parseTagScript } from '@/lib/tagscript';

interface CustomCommandItem {
  id: string;
  name: string;
  response: string;
  description: string | null;
  isSlash: boolean;
  allowedRoles: string[];
  cooldownSec: number;
}

const TAGSCRIPT_VARIABLES = [
  { tag: '{user.mention}', desc: 'Mentions invoking user' },
  { tag: '{user.name}', desc: 'Username of invoker' },
  { tag: '{server.name}', desc: 'Discord Server name' },
  { tag: '{membercount}', desc: 'Total server members' },
  { tag: '{args}', desc: 'Arguments typed after command' },
  { tag: '{target.mention}', desc: 'Mentions targeted user' },
  { tag: '{random:Option A|Option B}', desc: 'Random choice picker' },
];

export default function CustomCommandsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [commands, setCommands] = useState<CustomCommandItem[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CustomCommandItem | null>(null);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [response, setResponse] = useState('');
  const [isSlash, setIsSlash] = useState(true);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadData = async () => {
    try {
      const [cmdRes, gRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/commands`),
        fetch(`/api/guilds/${guildId}`),
      ]);
      const cmdData = await cmdRes.json();
      const gData = await gRes.json();

      if (cmdData.commands) setCommands(cmdData.commands);
      if (gData.roles) setRoles(gData.roles);
    } catch {
      showFeedback('Failed to load commands.');
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleOpenCreate = () => {
    setEditingCommand(null);
    setName('');
    setDescription('');
    setResponse('Hello {user.mention}! Welcome to **{server.name}**.');
    setIsSlash(true);
    setAllowedRoles([]);
    setCooldownSec(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cmd: CustomCommandItem) => {
    setEditingCommand(cmd);
    setName(cmd.name);
    setDescription(cmd.description || '');
    setResponse(cmd.response);
    setIsSlash(cmd.isSlash);
    setAllowedRoles(cmd.allowedRoles || []);
    setCooldownSec(cmd.cooldownSec || 0);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !response.trim()) return;

    setIsSubmitting(true);
    try {
      const isEdit = !!editingCommand;
      const res = await fetch(`/api/guilds/${guildId}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEdit ? 'update' : 'create',
          id: editingCommand?.id,
          name: name.trim(),
          description: description.trim(),
          response,
          isSlash,
          allowedRoles,
          cooldownSec,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(isEdit ? 'Command updated!' : `Created /${name}!`);
        setIsModalOpen(false);
        loadData();
      } else {
        showFeedback(data.error || 'Failed to save command.');
      }
    } catch {
      showFeedback('Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cmd: CustomCommandItem) => {
    if (!confirm(`Delete command "/${cmd.name}"?`)) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/commands?id=${cmd.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showFeedback(`Deleted /${cmd.name}.`);
        loadData();
      }
    } catch {
      showFeedback('Failed to delete command.');
    }
  };

  const insertVariable = (tag: string) => {
    setResponse((prev) => prev + tag);
  };

  const filteredCommands = commands.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
              Custom Commands Studio
            </h2>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              Powered by TagScript
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Build dynamic slash and prefix commands with intelligent variables, role restrictions, and instant Discord execution.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Command</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter commands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8.5 pr-3 py-1.5 rounded-lg bg-[#0d0f17] border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/[0.2] transition"
        />
      </div>

      {/* Commands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCommands.map((cmd) => (
          <div
            key={cmd.id}
            className="rounded-xl border border-white/[0.08] bg-[#0d0f17] hover:border-white/[0.16] p-5 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">
                      /{cmd.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                      {cmd.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] font-mono text-zinc-400 border border-white/[0.06]">
                  {cmd.isSlash ? 'Slash' : 'Prefix'}
                </span>
              </div>

              {/* Response Preview */}
              <div className="mt-4 p-3 rounded-lg bg-[#08090d] border border-white/[0.06] text-xs text-zinc-300 font-mono line-clamp-3">
                {cmd.response}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                <Clock className="w-3 h-3" />
                <span>{cmd.cooldownSec ? `${cmd.cooldownSec}s cooldown` : 'No cooldown'}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(cmd)}
                  className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(cmd)}
                  className="p-1 text-zinc-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCommands.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] space-y-3">
          <Terminal className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400">No custom commands found.</p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black font-semibold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Command</span>
          </button>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>{editingCommand ? 'Edit Command' : 'Create Custom Command'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Command Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. socials"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Cooldown (Seconds)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cooldownSec}
                    onChange={(e) => setCooldownSec(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Shows community social links..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* TagScript Variables Helper Bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-zinc-400">
                    Response Template (TagScript Enabled)
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400">Click to insert:</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TAGSCRIPT_VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => insertVariable(v.tag)}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono text-zinc-300 hover:text-emerald-300 transition"
                      title={v.desc}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  required
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Message response..."
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Live Preview */}
              <div className="p-3 rounded-lg bg-[#08090d] border border-white/[0.06] text-xs space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 block">Preview Output:</span>
                <p className="text-zinc-200">{parseTagScript(response)}</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Command'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
