'use client';

import { use, useState, useEffect } from 'react';
import { StickyMessage } from '@/lib/types';
import { parseTagScript, TAGSCRIPT_CHEATSHEET } from '@/lib/tagscript';
import {
  Pin,
  Plus,
  Trash2,
  Check,
  Hash,
  Sparkles,
  Clock,
  Eye,
  X,
} from 'lucide-react';

export default function StickyMessagesPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [channels, setChannels] = useState<any[]>([]);

  const [stickies, setStickies] = useState<StickyMessage[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form
  const [channelId, setChannelId] = useState('');
  const [content, setContent] = useState(
    '⚠️ **Channel Rules**: Please avoid spamming bot commands in this channel. Use {channel.mention} instead! Server members: **{memberCount}**'
  );
  const [cooldown, setCooldown] = useState(10);

  useEffect(() => {
    // Fetch real channels
    fetch(`/api/guilds/${guildId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          setChannelId(data.channels[0].id);
        }
      })
      .catch(() => {});

    // Fetch sticky messages
    fetch(`/api/guilds/${guildId}/sticky`)
      .then((res) => res.json())
      .then((data) => {
        if (data.stickyMessages) setStickies(data.stickyMessages);
      })
      .catch(() => {});
  }, [guildId]);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateSticky = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !channelId) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/sticky`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          content,
          cooldownSeconds: cooldown,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (data.stickyMessage) {
        setStickies([...stickies, data.stickyMessage]);
      }
    } catch {
      showFeedback('Failed to save sticky message');
    }

    setIsCreateOpen(false);
    showFeedback('Sticky message published to channel!');
  };

  const handleDeleteSticky = async (id: string) => {
    try {
      await fetch(`/api/guilds/${guildId}/sticky?id=${id}`, {
        method: 'DELETE',
      });
    } catch {}
    setStickies(stickies.filter((s) => s.id !== id));
    showFeedback('Sticky message deleted.');
  };

  const handleToggleSticky = async (id: string) => {
    const current = stickies.find((s) => s.id === id);
    if (!current) return;
    const nextEnabled = !current.enabled;
    setStickies(
      stickies.map((s) => (s.id === id ? { ...s, enabled: nextEnabled } : s))
    );
    try {
      await fetch(`/api/guilds/${guildId}/sticky`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: nextEnabled }),
      });
      showFeedback(`Sticky message ${nextEnabled ? 'enabled' : 'disabled'}.`);
    } catch {
      showFeedback('Failed to update status.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
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
              Sticky Messages
            </h2>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              Unlimited Channels
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Pin notifications, rules, or alerts to the very bottom of chat. When chat moves, Tortuga re-posts the message seamlessly.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Sticky</span>
        </button>
      </div>

      {/* Sticky messages info callout */}
      <div className="rounded-xl border border-border/80 bg-slate-900/60 p-4 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Pin className="w-4 h-4" />
          </div>
          <p className="text-slate-300">
            <strong className="text-emerald-400">Unlimited Sticky Messages:</strong> On Tortuga, you can attach sticky messages to <strong className="text-turtle-400">every single channel</strong> with zero restrictions or fees.
          </p>
        </div>
      </div>

      {/* Sticky Messages List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Active Sticky Posts ({stickies.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stickies.map((sticky) => {
            const channel = channels.find((c) => c.id === sticky.channelId);

            return (
              <div
                key={sticky.id}
                className="rounded-2xl border border-border/80 bg-card/60 p-6 flex flex-col justify-between shadow-sm hover:border-turtle-500/30 transition space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-lg bg-turtle-500/10 text-turtle-400">
                        <Pin className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-slate-500" />
                          <span>{channel ? channel.name : 'Channel #' + sticky.channelId}</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Cooldown: {sticky.cooldownSeconds}s</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSticky(sticky.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                          sticky.enabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {sticky.enabled ? 'Enabled' : 'Paused'}
                      </button>

                      <button
                        onClick={() => handleDeleteSticky(sticky.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Raw Content & Preview */}
                  <div className="mt-4 rounded-xl bg-slate-900/90 border border-border p-3 text-xs text-slate-200 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Live Preview (TagScript Evaluated)
                    </p>
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-300">
                      {parseTagScript(sticky.content)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Re-attaches automatically upon message send</span>
                  <span className="text-turtle-400">Anti-Rate-Limit Protected</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE STICKY MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📌</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Create New Sticky Message</h3>
                  <p className="text-xs text-slate-400">
                    Stick a message to the bottom of any channel.
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

            <form onSubmit={handleCreateSticky} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Target Channel
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Re-stick Cooldown (Seconds)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={cooldown}
                    onChange={(e) => setCooldown(parseInt(e.target.value) || 10)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-border text-sm text-white focus:outline-none focus:border-turtle-500"
                  />
                  <span className="text-[10px] text-slate-500">Min 5s to prevent Discord rate limits.</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Sticky Message Body (Supports TagScript & Markdown)
                  </label>
                </div>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-border text-xs sm:text-sm text-white focus:outline-none focus:border-turtle-500 font-mono resize-y"
                />
              </div>

              {/* TagScript helper chips */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">
                  Available TagScript Variables (Click to insert)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TAGSCRIPT_CHEATSHEET.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => setContent((prev) => prev + ' ' + item.tag)}
                      className="text-xs font-mono bg-slate-900 text-turtle-400 hover:bg-slate-800 border border-border px-2 py-1 rounded transition"
                      title={item.desc}
                    >
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time preview */}
              <div className="rounded-xl border border-border bg-slate-900/90 p-4 space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-slate-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Real-time Preview</span>
                </div>
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {parseTagScript(content)}
                </p>
              </div>

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
                  Pin Sticky Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
