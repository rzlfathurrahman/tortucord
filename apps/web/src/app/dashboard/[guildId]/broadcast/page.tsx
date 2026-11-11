'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Megaphone,
  Send,
  Check,
  Server,
  Hash,
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Lock,
} from 'lucide-react';

interface TargetChannel {
  id: string;
  name: string;
  type: string | number;
  isAnnouncement: boolean;
}

interface BroadcastServer {
  id: string;
  name: string;
  icon: string | null;
  channels: TargetChannel[];
}

interface DeliveryResult {
  guildId: string;
  channelId: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

const COLOR_PRESETS = [
  { label: 'Emerald', hex: '#10b981', int: 0x10b981 },
  { label: 'Blurple', hex: '#5865f2', int: 0x5865f2 },
  { label: 'Amber', hex: '#f59e0b', int: 0xf59e0b },
  { label: 'Rose', hex: '#f43f5e', int: 0xf43f5e },
  { label: 'Cyan', hex: '#06b6d4', int: 0x06b6d4 },
];

export default function BroadcastConsolePage() {
  const { guildId } = useParams() as { guildId: string };
  const [servers, setServers] = useState<BroadcastServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [mention, setMention] = useState<'none' | 'here' | 'everyone'>('none');
  const [footer, setFooter] = useState('Sent via Tortuga Broadcast Console');

  // Selected Targets: Array of { guildId, channelId }
  const [selectedTargets, setSelectedTargets] = useState<
    Array<{ guildId: string; channelId: string }>
  >([]);

  // Dispatch & Modal State
  const [isSending, setIsSending] = useState(false);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [deliveryResults, setDeliveryResults] = useState<{
    sentCount: number;
    failCount: number;
    results: DeliveryResult[];
  } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    fetch('/api/broadcast')
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          return r.json().then((errData) => {
            setAccessDenied(errData.error || 'Access denied: Cross-Server Broadcast is restricted to Superadmin and Server Owners.');
            return null;
          });
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success && data.servers) {
          setServers(data.servers);
          // By default, select the current server's announcement channel or first channel
          const current = data.servers.find((s: BroadcastServer) => s.id === guildId);
          if (current && current.channels.length > 0) {
            const preferred =
              current.channels.find((c: TargetChannel) => c.isAnnouncement) ||
              current.channels[0];
            setSelectedTargets([{ guildId: current.id, channelId: preferred.id }]);
          }
        } else if (data.error) {
          setAccessDenied(data.error);
        }
      })
      .catch(() => showFeedback('Failed to load server channels.'))
      .finally(() => setIsLoading(false));
  }, [guildId]);

  const toggleTarget = (gId: string, cId: string) => {
    setSelectedTargets((prev) => {
      const exists = prev.some((t) => t.guildId === gId && t.channelId === cId);
      if (exists) {
        return prev.filter((t) => !(t.guildId === gId && t.channelId === cId));
      } else {
        return [...prev, { guildId: gId, channelId: cId }];
      }
    });
  };

  const autoSelectAnnouncements = () => {
    const targets: Array<{ guildId: string; channelId: string }> = [];
    for (const s of servers) {
      const ann = s.channels.find((c) => c.isAnnouncement) || s.channels[0];
      if (ann) {
        targets.push({ guildId: s.id, channelId: ann.id });
      }
    }
    setSelectedTargets(targets);
    showFeedback(`Selected ${targets.length} announcement channels.`);
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      showFeedback('Please provide message content to broadcast.');
      return;
    }
    if (selectedTargets.length === 0) {
      showFeedback('Please select at least one channel to receive the broadcast.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to broadcast this announcement to ${selectedTargets.length} target channel(s)?`
      )
    ) {
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targets: selectedTargets,
          title: title || undefined,
          message,
          color: selectedColor.int,
          mention,
          footer,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDeliveryResults(data);
        setResultsModalOpen(true);
      } else {
        showFeedback(data.error || 'Failed to dispatch broadcast.');
      }
    } catch {
      showFeedback('Network error during broadcast dispatch.');
    } finally {
      setIsSending(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[60vh]">
        <div className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-8 text-center space-y-4 shadow-2xl animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white">Broadcast Access Restricted</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {accessDenied}
          </p>
          <div className="pt-2">
            <a
              href={`/dashboard/${guildId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            >
              <span>Return to Server Overview</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Megaphone className="w-6 h-6 text-emerald-400" />
              <span>Cross-Server Mass Broadcast Console</span>
            </h1>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              Multi-Guild Dispatcher
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Compose rich embeds and dispatch simultaneous announcements to multiple Discord servers and channels in a single click.
          </p>
        </div>
      </div>

      <form onSubmit={handleDispatch} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Composer & Live Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider pb-2 border-b border-white/[0.06] flex items-center justify-between">
              <span>Announcement Content</span>
              <span className="text-zinc-500 font-mono text-[10px]">Markdown Supported</span>
            </h3>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Announcement Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Scheduled Maintenance Notice"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Message Body *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Write your announcement details here. Discord markdown (bold, lists, codeblocks) is supported..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500 resize-none font-mono"
              />
            </div>

            {/* Mention Tag & Accent Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Mention Alert
                </label>
                <select
                  value={mention}
                  onChange={(e) => setMention(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="none">No Mention (Silent Announcement)</option>
                  <option value="here">@here (Active Members)</option>
                  <option value="everyone">@everyone (All Members)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Embed Accent Color
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  {COLOR_PRESETS.map((col) => (
                    <button
                      key={col.label}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        selectedColor.label === col.label
                          ? 'border-white scale-110 shadow-md'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={col.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Footer Note
              </label>
              <input
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500 text-zinc-400"
              />
            </div>
          </div>

          {/* Live Discord Embed Preview */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-3">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              Discord Live Render Preview
            </span>

            {mention !== 'none' && (
              <span className="inline-block px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] font-mono text-xs font-semibold">
                @{mention}
              </span>
            )}

            <div
              className="rounded-lg p-4 bg-[#2b2d31] border-l-4 space-y-2"
              style={{ borderLeftColor: selectedColor.hex }}
            >
              {title && (
                <h4 className="text-sm font-bold text-white leading-snug">{title}</h4>
              )}

              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {message || <span className="text-zinc-500 italic">Enter message content above to preview...</span>}
              </p>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500">
                <span>{footer}</span>
                <span>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Server Targets (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Target Channels ({selectedTargets.length})</span>
              </h3>

              <button
                type="button"
                onClick={autoSelectAnnouncements}
                className="text-[11px] font-mono text-emerald-400 hover:underline"
              >
                Auto-Select News
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Select which servers and channels will receive this announcement:
            </p>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-xs font-mono">Loading server channels...</span>
              </div>
            ) : (
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {servers.map((server) => (
                  <div
                    key={server.id}
                    className="rounded-lg border border-white/[0.06] bg-[#08090d] p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {server.icon ? (
                        <img
                          src={server.icon}
                          alt={server.name}
                          className="w-5 h-5 rounded-md object-cover ring-1 ring-white/10"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-md bg-zinc-800 text-[9px] font-bold text-zinc-300 flex items-center justify-center">
                          {server.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-semibold text-white truncate">
                        {server.name}
                      </span>
                    </div>

                    {/* Channels checklist */}
                    <div className="space-y-1 pl-4 border-l border-white/[0.06]">
                      {server.channels.map((ch) => {
                        const isChecked = selectedTargets.some(
                          (t) => t.guildId === server.id && t.channelId === ch.id
                        );

                        return (
                          <div
                            key={ch.id}
                            onClick={() => toggleTarget(server.id, ch.id)}
                            className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer select-none transition ${
                              isChecked
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                            )}
                            <span className="truncate">#{ch.name}</span>
                            {ch.isAnnouncement && (
                              <span className="ml-auto text-[9px] font-mono px-1 rounded bg-amber-500/10 text-amber-400">
                                news
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dispatch Action */}
            <div className="pt-3 border-t border-white/[0.06]">
              <button
                type="submit"
                disabled={isSending || selectedTargets.length === 0 || !message.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Broadcasting to {selectedTargets.length} channel(s)...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Broadcast ({selectedTargets.length} Targets)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* DELIVERY RESULTS MODAL */}
      {resultsModalOpen && deliveryResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-2xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Broadcast Delivery Report</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Delivered to {deliveryResults.sentCount} of {deliveryResults.results.length} channels
                </p>
              </div>

              <button
                onClick={() => setResultsModalOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 p-1">
              {deliveryResults.results.map((r, idx) => {
                const s = servers.find((serv) => serv.id === r.guildId);
                const c = s?.channels.find((chan) => chan.id === r.channelId);

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                      r.success
                        ? 'border-emerald-500/20 bg-emerald-500/[0.03] text-zinc-200'
                        : 'border-rose-500/20 bg-rose-500/[0.03] text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {r.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="truncate">
                        {s?.name || r.guildId} → #{c?.name || r.channelId}
                      </span>
                    </div>

                    <span className="font-mono text-[10px]">
                      {r.success ? 'Delivered' : r.error || 'Failed'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setResultsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
