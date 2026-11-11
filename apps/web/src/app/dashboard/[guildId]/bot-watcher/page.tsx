'use client';

import { useState, useEffect, use } from 'react';
import {
  Bot,
  ShieldAlert,
  Bell,
  Check,
  Power,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Send,
  Save,
  Clock,
  Users,
} from 'lucide-react';
import { DiscordChannel, DiscordRole } from '@/lib/types';
import { DiscordBotMember } from '@/lib/discord';

interface BotWatcherConfigState {
  guildId: string;
  enabled: boolean;
  monitoredBotIds: string[];
  alertChannelId: string | null;
  alertRoleIds: string[];
  alertCooldownMin: number;
  autoThreadEnabled: boolean;
  botChannelIds: string[];
}

export default function BotWatcherPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [config, setConfig] = useState<BotWatcherConfigState>({
    guildId,
    enabled: false,
    monitoredBotIds: [],
    alertChannelId: null,
    alertRoleIds: [],
    alertCooldownMin: 15,
    autoThreadEnabled: false,
    botChannelIds: [],
  });

  const [bots, setBots] = useState<DiscordBotMember[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadData = async () => {
    try {
      const [bwRes, gRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/bot-watcher`),
        fetch(`/api/guilds/${guildId}`),
      ]);
      const bwData = await bwRes.json();
      const gData = await gRes.json();

      if (bwData.config) setConfig(bwData.config);
      if (bwData.bots) setBots(bwData.bots);
      if (gData.channels) {
        setChannels(
          gData.channels.filter(
            (c: DiscordChannel) => c.type === 'text' || c.type === 'announcement'
          )
        );
      }
      if (gData.roles) setRoles(gData.roles);
    } catch {
      showFeedback('Failed to load Bot Watcher data.');
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleToggleBot = (botId: string) => {
    const isMonitored = config.monitoredBotIds.includes(botId);
    setConfig({
      ...config,
      monitoredBotIds: isMonitored
        ? config.monitoredBotIds.filter((id) => id !== botId)
        : [...config.monitoredBotIds, botId],
    });
  };

  const handleToggleBotChannel = (chanId: string) => {
    const isPresent = config.botChannelIds.includes(chanId);
    setConfig({
      ...config,
      botChannelIds: isPresent
        ? config.botChannelIds.filter((id) => id !== chanId)
        : [...config.botChannelIds, chanId],
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/bot-watcher`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Bot Watcher settings saved!');
      } else {
        showFeedback(data.error || 'Failed to save settings.');
      }
    } catch {
      showFeedback('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async () => {
    if (!config.alertChannelId) {
      showFeedback('Please select an alert channel first.');
      return;
    }

    setTestingAlert(true);
    try {
      const targetBot = bots.find((b) => config.monitoredBotIds.includes(b.id));
      const res = await fetch(`/api/guilds/${guildId}/bot-watcher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_alert',
          alertChannelId: config.alertChannelId,
          botName: targetBot?.nickname || targetBot?.username || 'Hermes Agent',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback('Test incident alert sent to Discord!');
      } else {
        showFeedback(data.error || 'Failed to dispatch alert.');
      }
    } catch {
      showFeedback('Network error testing alert.');
    } finally {
      setTestingAlert(false);
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
              Bot Watcher & Heartbeat Monitor
            </h2>
            <span className="rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono px-2 py-0.5">
              Hermes & Bot Agents
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Monitor uptime for Hermes and other bot agents in your server, dispatch incident alerts, and sandbox AI conversations into threads.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTestAlert}
            disabled={testingAlert || !config.alertChannelId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>{testingAlert ? 'Testing...' : 'Test Alert'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Master Toggle Banner */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Bot Presence & Outage Sentinel</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automatically monitors Discord presence. If a monitored bot goes offline, Tortuga notifies your staff channel immediately.
            </p>
          </div>
        </div>

        <button
          onClick={() => setConfig({ ...config, enabled: !config.enabled })}
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition ${
            config.enabled
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-white/[0.04] border-white/[0.08] text-zinc-500'
          }`}
        >
          {config.enabled ? '● ACTIVE' : '○ DISABLED'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Monitored Bots Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Select Bots to Monitor</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Discovered {bots.length} bot accounts in this server.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {config.monitoredBotIds.length} monitored
              </span>
            </div>

            <div className="space-y-2">
              {bots.map((bot) => {
                const isChecked = config.monitoredBotIds.includes(bot.id);
                return (
                  <div
                    key={bot.id}
                    onClick={() => handleToggleBot(bot.id)}
                    className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition select-none ${
                      isChecked
                        ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                        : 'border-white/[0.06] bg-[#08090d] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {bot.avatar ? (
                        <img
                          src={bot.avatar}
                          alt={bot.username}
                          className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300">
                          {bot.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {bot.nickname || bot.username}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 text-[9px] font-mono font-bold">
                            BOT
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">ID: {bot.id}</span>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isChecked
                          ? 'bg-emerald-500 border-emerald-400 text-black'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}

              {bots.length === 0 && (
                <p className="text-xs text-zinc-500 py-4 text-center">
                  No bots found in server members cache.
                </p>
              )}
            </div>
          </div>

          {/* Auto-Threading Sandbox */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                    AI Bot Auto-Threading Sandbox
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Prevents main chat channels from clutter when members interact with Hermes agent.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.autoThreadEnabled}
                onChange={(e) =>
                  setConfig({ ...config, autoThreadEnabled: e.target.checked })
                }
                className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0"
              />
            </div>

            {config.autoThreadEnabled && (
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-medium text-zinc-400 block">
                  Select Channels for Auto-Threading:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {channels.map((c) => {
                    const isSelected = config.botChannelIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleBotChannel(c.id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between select-none ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-[#08090d] border-white/[0.06] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="truncate">#{c.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Alert Rules (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-white/[0.06]">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Incident Alert Routing</span>
            </h3>

            {/* Alert Channel */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Incident Dispatch Channel
              </label>
              <select
                value={config.alertChannelId || ''}
                onChange={(e) =>
                  setConfig({ ...config, alertChannelId: e.target.value || null })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">(Select incident channel...)</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Alert Cooldown */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Alert Cooldown (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={config.alertCooldownMin}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alertCooldownMin: parseInt(e.target.value) || 15,
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Prevents spamming the alert channel if a bot repeatedly disconnects.
              </span>
            </div>

            {/* Ping Roles */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                Staff Roles to Ping on Outage
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg bg-[#08090d] border border-white/[0.06]">
                {roles
                  .filter((r) => r.name !== '@everyone')
                  .map((r) => {
                    const isSelected = config.alertRoleIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          const isAlready = config.alertRoleIds.includes(r.id);
                          setConfig({
                            ...config,
                            alertRoleIds: isAlready
                              ? config.alertRoleIds.filter((id) => id !== r.id)
                              : [...config.alertRoleIds, r.id],
                          });
                        }}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
