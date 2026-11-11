'use client';

import { useState, useEffect, use } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Send,
  ExternalLink,
  Activity,
  Github,
  Server,
  Layers,
  Power,
  Clock,
  X,
  Code,
  Radio,
} from 'lucide-react';
import { DiscordChannel } from '@/lib/types';

interface InboundWebhookItem {
  id: string;
  name: string;
  token: string;
  targetChannelId: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
  logs: {
    id: string;
    status: number;
    error: string | null;
    createdAt: string;
    payloadJson: any;
  }[];
}

export default function WebhookHubPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [webhooks, setWebhooks] = useState<InboundWebhookItem[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLogsWebhook, setSelectedLogsWebhook] = useState<InboundWebhookItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('generic');
  const [targetChannelId, setTargetChannelId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadData = async () => {
    try {
      const [whRes, gRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/webhooks`),
        fetch(`/api/guilds/${guildId}`),
      ]);
      const whData = await whRes.json();
      const gData = await gRes.json();

      if (whData.webhooks) setWebhooks(whData.webhooks);
      if (gData.channels) {
        const textChannels = gData.channels.filter(
          (c: DiscordChannel) => c.type === 'text' || c.type === 'announcement'
        );
        setChannels(textChannels);
        if (textChannels.length > 0 && !targetChannelId) {
          setTargetChannelId(textChannels[0].id);
        }
      }
    } catch {
      showFeedback('Failed to load webhooks.');
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetChannelId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: name.trim(),
          provider,
          targetChannelId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(`Created webhook "${name}"!`);
        setIsCreateOpen(false);
        setName('');
        loadData();
      } else {
        showFeedback(data.error || 'Failed to create webhook.');
      }
    } catch {
      showFeedback('Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          id,
          isActive: !current,
        }),
      });
      if (res.ok) {
        setWebhooks(
          webhooks.map((w) => (w.id === id ? { ...w, isActive: !current } : w))
        );
        showFeedback(!current ? 'Webhook enabled' : 'Webhook disabled');
      }
    } catch {
      showFeedback('Failed to toggle status.');
    }
  };

  const handleTestDispatch = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/guilds/${guildId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', id }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Test dispatch sent to Discord!');
        loadData();
      } else {
        showFeedback(data.error || 'Test failed.');
      }
    } catch {
      showFeedback('Network error testing webhook.');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string, whName: string) => {
    if (!confirm(`Delete webhook "${whName}"? All inbound requests to its URL will stop.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/guilds/${guildId}/webhooks?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showFeedback(`Deleted "${whName}".`);
        loadData();
      }
    } catch {
      showFeedback('Failed to delete webhook.');
    }
  };

  const copyUrl = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/api/webhooks/${token}`;
    navigator.clipboard.writeText(url);
    showFeedback('Webhook URL copied to clipboard!');
  };

  const getProviderIcon = (p: string) => {
    switch (p) {
      case 'github':
        return <Github className="w-3.5 h-3.5 text-zinc-300" />;
      case 'uptimekuma':
        return <Activity className="w-3.5 h-3.5 text-emerald-400" />;
      case 'grafana':
        return <Server className="w-3.5 h-3.5 text-amber-400" />;
      case 'radar':
        return <Radio className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Webhook className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

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
              Webhook Hub & Transformer
            </h2>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              {webhooks.length} endpoints
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Centralize GitHub, Uptime Kuma, Grafana, and custom homelab alerts into beautiful Discord embeds.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Webhook</span>
        </button>
      </div>

      {/* Webhooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {webhooks.map((wh) => {
          const targetChan = channels.find((c) => c.id === wh.targetChannelId);
          return (
            <div
              key={wh.id}
              className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                wh.isActive
                  ? 'border-white/[0.08] bg-[#0d0f17] hover:border-white/[0.16]'
                  : 'border-white/[0.04] bg-[#0d0f17]/50 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      {getProviderIcon(wh.provider)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{wh.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">
                          {wh.provider}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          #{targetChan?.name || wh.targetChannelId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(wh.id, wh.isActive)}
                    className={`p-1.5 rounded-lg border transition ${
                      wh.isActive
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-white/[0.04] border-white/[0.08] text-zinc-500'
                    }`}
                    title={wh.isActive ? 'Active' : 'Disabled'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Webhook URL bar */}
                <div className="mt-4 p-2.5 rounded-lg bg-[#08090d] border border-white/[0.06] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-zinc-400 truncate">
                    .../api/webhooks/{wh.token.slice(0, 10)}••••
                  </span>
                  <button
                    onClick={() => copyUrl(wh.token)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-[10px] font-mono transition shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy URL</span>
                  </button>
                </div>
              </div>

              {/* Footer actions */}
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedLogsWebhook(wh)}
                  className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition"
                >
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{wh.logs.length} dispatches logged</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestDispatch(wh.id)}
                    disabled={testingId === wh.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-[11px] font-medium transition disabled:opacity-50"
                  >
                    <Send className="w-3 h-3 text-emerald-400" />
                    <span>{testingId === wh.id ? 'Sending...' : 'Test'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(wh.id, wh.name)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition"
                    title="Delete webhook"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {webhooks.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] space-y-3">
          <Webhook className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400">No inbound webhooks configured yet.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black font-semibold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Webhook</span>
          </button>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Webhook className="w-4 h-4 text-emerald-400" />
                <span>Create Inbound Webhook</span>
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
                  Webhook Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GitHub Repository Commits"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Payload Provider / Transformer
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="generic">Generic JSON (Auto-Embed)</option>
                  <option value="github">GitHub (Pushes, PRs, Releases)</option>
                  <option value="uptimekuma">Uptime Kuma (Service Status Ping)</option>
                  <option value="grafana">Grafana (Telemetry & Alerts)</option>
                  <option value="radar">Skyhook Radar (Kubernetes AI Alerts)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Target Discord Channel
                </label>
                <select
                  value={targetChannelId}
                  onChange={(e) => setTargetChannelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
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
                  {isSubmitting ? 'Generating...' : 'Create Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH LOGS MODAL */}
      {selectedLogsWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Recent Dispatches: {selectedLogsWebhook.name}</span>
              </h3>
              <button
                onClick={() => setSelectedLogsWebhook(null)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5">
              {selectedLogsWebhook.logs.length > 0 ? (
                selectedLogsWebhook.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-[#08090d] border border-white/[0.06] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          log.status === 200
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        HTTP {log.status}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {log.error && (
                      <p className="text-rose-400 text-[11px] font-mono">{log.error}</p>
                    )}
                    <pre className="p-2 rounded bg-black/40 text-[10px] font-mono text-zinc-400 overflow-x-auto">
                      {JSON.stringify(log.payloadJson, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 text-center py-6">
                  No payloads dispatched yet.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setSelectedLogsWebhook(null)}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-xs text-zinc-300 hover:text-white"
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
