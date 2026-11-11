'use client';

import { useState, useEffect, use } from 'react';
import {
  LifeBuoy,
  Send,
  Check,
  Save,
  Shield,
  MessageSquare,
  Clock,
  User,
  X,
  FileText,
  Lock,
  Bot,
  Sparkles,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { DiscordChannel, DiscordRole } from '@/lib/types';

interface TicketItem {
  id: string;
  guildId: string;
  channelId: string;
  creatorId: string;
  status: string;
  closedBy: string | null;
  closedAt: string | null;
  transcript: string | null;
  summary?: string | null;
  transcriptJson?: any;
  createdAt: string;
}

export default function TicketsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [config, setConfig] = useState({
    enabled: false,
    panelChannelId: '',
    panelTitle: 'Need Assistance? Open a Support Ticket',
    panelDescription:
      'Click the button below to start a private conversation with our server staff.',
    buttonLabel: 'Open Ticket',
    buttonEmoji: '📩',
    supportRoleIds: [] as string[],
    transcriptChannelId: '',
  });

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [viewingTranscript, setViewingTranscript] = useState<TicketItem | null>(null);
  const [transcriptData, setTranscriptData] = useState<{ summary?: string; messages: any[] } | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const openTranscriptModal = async (ticket: TicketItem) => {
    setViewingTranscript(ticket);
    setIsLoadingTranscript(true);
    setTranscriptData(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/${ticket.id}/transcript`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setTranscriptData({
          summary: data.ticket.summary,
          messages: Array.isArray(data.ticket.transcriptJson) ? data.ticket.transcriptJson : [],
        });
      }
    } catch {
      showFeedback('Failed to load ticket transcript.');
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const handleGenerateAI = async (ticket: TicketItem) => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets/${ticket.id}/transcript`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('AI Summary generated successfully!');
        setTranscriptData({
          summary: data.summary,
          messages: data.messages || [],
        });
        loadData();
      } else {
        showFeedback(data.error || 'Failed to generate AI summary.');
      }
    } catch {
      showFeedback('Network error generating AI summary.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const loadData = async () => {
    try {
      const [tRes, gRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/tickets`),
        fetch(`/api/guilds/${guildId}`),
      ]);
      const tData = await tRes.json();
      const gData = await gRes.json();

      if (tData.config) setConfig(tData.config);
      if (tData.tickets) setTickets(tData.tickets);
      if (gData.channels) {
        const textChans = gData.channels.filter(
          (c: DiscordChannel) => c.type === 'text' || c.type === 'announcement'
        );
        setChannels(textChans);
        if (textChans.length > 0 && !tData.config?.panelChannelId) {
          setConfig((prev) => ({ ...prev, panelChannelId: textChans[0].id }));
        }
      }
      if (gData.roles) setRoles(gData.roles);
    } catch {
      showFeedback('Failed to load tickets data.');
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Ticket configuration saved!');
      } else {
        showFeedback(data.error || 'Failed to save.');
      }
    } catch {
      showFeedback('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!config.panelChannelId) {
      showFeedback('Select a channel for the ticket panel first.');
      return;
    }

    setDeploying(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deploy_panel',
          ...config,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Ticket panel button deployed to Discord!');
      } else {
        showFeedback(data.error || 'Failed to deploy panel.');
      }
    } catch {
      showFeedback('Network error deploying panel.');
    } finally {
      setDeploying(false);
    }
  };

  const toggleRole = (roleId: string) => {
    const isSelected = config.supportRoleIds.includes(roleId);
    setConfig({
      ...config,
      supportRoleIds: isSelected
        ? config.supportRoleIds.filter((id) => id !== roleId)
        : [...config.supportRoleIds, roleId],
    });
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
              Support & Ticket Desk
            </h2>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              Thread-Based ModMail
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Deploy 1-click interactive ticket panels to your server, create private staff threads, and archive conversation transcripts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>{deploying ? 'Deploying...' : 'Deploy Panel'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Panel Setup (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/[0.06]">
              <LifeBuoy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ticket Portal Configuration</span>
            </h3>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Panel Target Channel
              </label>
              <select
                value={config.panelChannelId || ''}
                onChange={(e) => setConfig({ ...config, panelChannelId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Panel Embed Title
              </label>
              <input
                type="text"
                value={config.panelTitle}
                onChange={(e) => setConfig({ ...config, panelTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Panel Embed Description
              </label>
              <textarea
                rows={3}
                value={config.panelDescription}
                onChange={(e) => setConfig({ ...config, panelDescription: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Button Label
                </label>
                <input
                  type="text"
                  value={config.buttonLabel}
                  onChange={(e) => setConfig({ ...config, buttonLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Button Emoji
                </label>
                <input
                  type="text"
                  value={config.buttonEmoji}
                  onChange={(e) => setConfig({ ...config, buttonEmoji: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Live Panel Simulator */}
            <div className="pt-3 border-t border-white/[0.06]">
              <span className="text-[10px] font-mono text-zinc-500 block mb-2">
                Discord Client Preview:
              </span>
              <div className="p-4 rounded-lg bg-[#08090d] border-l-4 border-emerald-500 space-y-2">
                <h4 className="text-xs font-bold text-white">{config.panelTitle}</h4>
                <p className="text-xs text-zinc-300">{config.panelDescription}</p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#5865F2] text-white text-xs font-semibold">
                    <span>{config.buttonEmoji}</span>
                    <span>{config.buttonLabel}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Roles & Transcripts (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/[0.06]">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Staff Support Roles</span>
            </h3>

            <p className="text-[11px] text-zinc-500">
              Members with these roles will automatically be added to created ticket threads:
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-lg bg-[#08090d] border border-white/[0.06]">
              {roles
                .filter((r) => r.name !== '@everyone')
                .map((r) => {
                  const isSelected = config.supportRoleIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRole(r.id)}
                      className={`px-2 py-1 rounded text-xs cursor-pointer flex items-center justify-between select-none ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: r.color || '#99aab5' }}
                        ></span>
                        <span>@{r.name}</span>
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                  );
                })}
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Transcript Archive Channel (Optional)
              </label>
              <select
                value={config.transcriptChannelId || ''}
                onChange={(e) =>
                  setConfig({ ...config, transcriptChannelId: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">(No transcript channel)</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] overflow-hidden">
        <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Recent Tickets ({tickets.length})
          </h3>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.01] transition"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      t.status === 'OPEN'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-xs font-mono text-zinc-200">
                    Creator: <code className="text-emerald-400">{t.creatorId}</code>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                    {new Date(t.createdAt).toLocaleString()}
                  </span>
                </div>

                {t.summary && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 line-clamp-1">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-[11px] text-zinc-400">{t.summary}</span>
                  </div>
                )}
              </div>

              <div className="shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => openTranscriptModal(t)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white border border-white/[0.08] text-xs font-medium transition"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Transcript & AI Summary</span>
                </button>
              </div>
            </div>
          ))}

          {tickets.length === 0 && (
            <div className="py-10 text-center text-xs text-zinc-500">
              No tickets opened yet. Deploy the panel above to begin receiving tickets.
            </div>
          )}
        </div>
      </div>

      {/* TRANSCRIPT & AI SUMMARY MODAL */}
      {viewingTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-2xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.08] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    Ticket Transcript & AI Summary
                  </h3>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  Channel ID: {viewingTranscript.channelId} • Creator: {viewingTranscript.creatorId}
                </p>
              </div>

              <button
                onClick={() => setViewingTranscript(null)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Hermes AI Summary Banner */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Hermes AI Executive Summary</span>
                  </div>

                  <button
                    onClick={() => handleGenerateAI(viewingTranscript)}
                    disabled={isGeneratingAI}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300 disabled:opacity-50"
                  >
                    <RotateCw className={`w-3 h-3 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAI ? 'Generating...' : 'Refresh AI Summary'}</span>
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {transcriptData?.summary || viewingTranscript.summary || (
                    <span className="text-zinc-500 italic">
                      No AI summary generated yet. Click &ldquo;Refresh AI Summary&rdquo; to analyze the chat thread messages.
                    </span>
                  )}
                </p>
              </div>

              {/* Chat Message History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                    Thread Messages ({transcriptData?.messages?.length || 0})
                  </span>
                </div>

                {isLoadingTranscript ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2 text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-xs font-mono">Loading ticket transcript...</span>
                  </div>
                ) : transcriptData?.messages && transcriptData.messages.length > 0 ? (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto p-3 rounded-xl bg-[#08090d] border border-white/[0.06]">
                    {transcriptData.messages.map((m: any, idx: number) => (
                      <div key={m.id || idx} className="flex items-start gap-2.5 text-xs">
                        {m.author?.avatar ? (
                          <img
                            src={m.author.avatar}
                            alt={m.author.username}
                            className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                            {m.author?.username?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white">
                              {m.author?.username || 'User'}
                            </span>
                            {m.author?.bot && (
                              <span className="px-1 py-0.2 rounded bg-[#5865F2]/20 text-[#5865F2] text-[9px] font-bold">
                                BOT
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-zinc-500">
                              {new Date(m.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-zinc-300 mt-0.5 leading-relaxed break-words">
                            {m.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500 rounded-xl border border-dashed border-white/[0.06]">
                    No messages captured in this thread yet.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-white/[0.08] shrink-0">
              <button
                type="button"
                onClick={() => setViewingTranscript(null)}
                className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white transition"
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
