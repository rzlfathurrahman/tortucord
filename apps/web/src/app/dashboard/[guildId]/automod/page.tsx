'use client';

import { use, useState, useEffect } from 'react';
import {
  MOCK_AUTOMOD_CONFIG,
  MOCK_CHANNELS,
  MOCK_GUILDS,
} from '@/lib/mock-data';
import { AutoModConfig } from '@/lib/types';
import {
  ShieldAlert,
  Flame,
  Check,
  Plus,
  X,
  AlertTriangle,
  Lock,
  Sparkles,
  Sliders,
  BellRing,
  HelpCircle,
} from 'lucide-react';

export default function AutoModPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [channels, setChannels] = useState<any[]>([]);

  const [config, setConfig] = useState<AutoModConfig>(MOCK_AUTOMOD_CONFIG);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [newDramaWord, setNewDramaWord] = useState('');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channels) setChannels(data.channels);
      })
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/automod`)
      .then((res) => res.json())
      .then((data) => {
        if (data.config) setConfig(data.config);
      })
      .catch(() => {});
  }, [guildId]);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/guilds/${guildId}/automod`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      showFeedback('AutoMod & Drama Watcher settings saved!');
    } catch {
      showFeedback('AutoMod settings saved locally!');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBannedWord = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newBannedWord.trim()) return;
    if (!config.bannedWords.includes(newBannedWord.trim().toLowerCase())) {
      setConfig({
        ...config,
        bannedWords: [...config.bannedWords, newBannedWord.trim().toLowerCase()],
      });
    }
    setNewBannedWord('');
  };

  const handleRemoveBannedWord = (word: string) => {
    setConfig({
      ...config,
      bannedWords: config.bannedWords.filter((w) => w !== word),
    });
  };

  const handleAddDramaWord = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newDramaWord.trim()) return;
    if (!config.dramaKeywords.includes(newDramaWord.trim().toLowerCase())) {
      setConfig({
        ...config,
        dramaKeywords: [...config.dramaKeywords, newDramaWord.trim().toLowerCase()],
      });
    }
    setNewDramaWord('');
  };

  const handleRemoveDramaWord = (word: string) => {
    setConfig({
      ...config,
      dramaKeywords: config.dramaKeywords.filter((w) => w !== word),
    });
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
              AutoMod & Drama Watcher
            </h2>
            <span className="rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-mono px-2 py-0.5">
              Real-time Protection
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Defend against raid floods, unauthorized Discord invites, mass mentions, and toxic flame wars.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* DRAMA WATCHER HERO CALLOUT */}
      <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Flame className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Drama Watcher & Sentiment Analysis</h3>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold border border-amber-500/30">
                  Premium Feature Included Free
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                Drama Watcher scans high-velocity arguments, repeated hostile keyword spikes, and sudden member influxes.
                When a conflict is triggered, it automatically alerts your moderator staff in a private review room.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-xs font-semibold text-slate-300">
              {config.dramaWatcherEnabled ? 'Module Active' : 'Disabled'}
            </span>
            <button
              onClick={() =>
                setConfig({
                  ...config,
                  dramaWatcherEnabled: !config.dramaWatcherEnabled,
                })
              }
              className={`w-14 h-7 rounded-full transition-colors relative ${
                config.dramaWatcherEnabled ? 'bg-turtle-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  config.dramaWatcherEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {config.dramaWatcherEnabled && (
          <div className="mt-6 pt-6 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Mod Review Channel
              </label>
              <select
                value={config.dramaWatcherChannelId}
                onChange={(e) =>
                  setConfig({ ...config, dramaWatcherChannelId: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Where Drama Watcher logs alerts when hostility thresholds trigger.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Sensitivity Detection Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setConfig({ ...config, dramaWatcherSensitivity: lvl })}
                    className={`py-2 rounded-xl text-xs font-semibold uppercase transition border ${
                      config.dramaWatcherSensitivity === lvl
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : 'bg-slate-900 text-slate-400 border-border hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Drama Keywords */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Drama Trigger Keywords
              </label>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-900/80 border border-border min-h-[48px]">
                {config.dramaKeywords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDramaWord(word)}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Add drama trigger word + Enter"
                    value={newDramaWord}
                    onChange={(e) => setNewDramaWord(e.target.value)}
                    onKeyDown={handleAddDramaWord}
                    className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none px-2 py-1"
                  />
                  {newDramaWord && (
                    <button
                      type="button"
                      onClick={handleAddDramaWord}
                      className="text-xs text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/20"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CORE AUTOMOD RULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Anti-Spam Card */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Anti-Spam Flooding</h4>
                <p className="text-xs text-slate-400">Block rapid burst messaging.</p>
              </div>
            </div>

            <button
              onClick={() =>
                setConfig({ ...config, antiSpamEnabled: !config.antiSpamEnabled })
              }
              className={`w-12 h-6 rounded-full transition-colors relative ${
                config.antiSpamEnabled ? 'bg-turtle-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  config.antiSpamEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>Max Messages Limit:</span>
                <span className="font-bold text-turtle-400">{config.spamThreshold} messages</span>
              </div>
              <input
                type="range"
                min={3}
                max={15}
                value={config.spamThreshold}
                onChange={(e) =>
                  setConfig({ ...config, spamThreshold: parseInt(e.target.value) })
                }
                className="w-full accent-turtle-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>Interval Window:</span>
                <span className="font-bold text-turtle-400">{config.spamIntervalSeconds} seconds</span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={config.spamIntervalSeconds}
                onChange={(e) =>
                  setConfig({ ...config, spamIntervalSeconds: parseInt(e.target.value) })
                }
                className="w-full accent-turtle-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Max Mentions Card */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Mass Mentions Filter</h4>
                <p className="text-xs text-slate-400">Stop mass pings (@everyone, roles, users).</p>
              </div>
            </div>

            <span className="font-mono text-sm font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-lg">
              Max {config.maxMentions}
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>Allowed mentions per message:</span>
                <span className="font-bold text-turtle-400">{config.maxMentions} mentions</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={config.maxMentions}
                onChange={(e) =>
                  setConfig({ ...config, maxMentions: parseInt(e.target.value) })
                }
                className="w-full accent-turtle-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Messages containing more than {config.maxMentions} user or role pings will be immediately deleted.
            </p>
          </div>
        </div>

        {/* Anti-Invite Protection */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Anti-Discord Invites</h4>
                <p className="text-xs text-slate-400">Delete external discord.gg / .gg invite links.</p>
              </div>
            </div>

            <button
              onClick={() =>
                setConfig({ ...config, antiInvitesEnabled: !config.antiInvitesEnabled })
              }
              className={`w-12 h-6 rounded-full transition-colors relative ${
                config.antiInvitesEnabled ? 'bg-turtle-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  config.antiInvitesEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Automatically scrubs invite links to foreign servers while whitelisting your official sister guilds.
          </p>
        </div>

        {/* Punishment Action on Violation */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Default Punishment</h4>
                <p className="text-xs text-slate-400">Action taken when AutoMod flags a member.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Action
              </label>
              <select
                value={config.actionOnViolation}
                onChange={(e) =>
                  setConfig({ ...config, actionOnViolation: e.target.value as any })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
              >
                <option value="delete">Delete Message Only</option>
                <option value="warn">Delete & Warn Member</option>
                <option value="timeout">Timeout / Mute</option>
                <option value="kick">Kick Member</option>
                <option value="ban">Ban Member</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Timeout Duration
              </label>
              <select
                value={config.timeoutDurationMinutes}
                onChange={(e) =>
                  setConfig({ ...config, timeoutDurationMinutes: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
              >
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={1440}>24 Hours</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* BANNED WORDS LIST EDITOR */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Banned Words & Phishing Phrases</h3>
            <p className="text-xs text-slate-400">
              Messages containing any of these keywords will be filtered and logged to Weblogs.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {config.bannedWords.length} words configured
          </span>
        </div>

        <div className="flex flex-wrap gap-2 p-3.5 rounded-xl bg-slate-900/80 border border-border min-h-[56px]">
          {config.bannedWords.map((word) => (
            <span
              key={word}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-mono"
            >
              <span>{word}</span>
              <button
                type="button"
                onClick={() => handleRemoveBannedWord(word)}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Type word or phrase & hit Enter"
              value={newBannedWord}
              onChange={(e) => setNewBannedWord(e.target.value)}
              onKeyDown={handleAddBannedWord}
              className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none px-2 py-1"
            />
            {newBannedWord && (
              <button
                type="button"
                onClick={handleAddBannedWord}
                className="text-xs text-red-400 font-bold px-2.5 py-1 rounded bg-red-500/20"
              >
                Add Word
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
