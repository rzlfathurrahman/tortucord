'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { LevelingConfig, RoleReward } from '@/lib/types';
import {
  Trophy,
  Sparkles,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Award,
  Sliders,
  BellRing,
  Hash,
} from 'lucide-react';

export default function LevelingPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [leaderboardMembers, setLeaderboardMembers] = useState<any[]>([]);

  const [config, setConfig] = useState<LevelingConfig>({
    guildId,
    enabled: true,
    xpMultiplier: 1.0,
    xpCooldownSeconds: 60,
    announcementChannelId: '',
    levelUpMessage: 'GG {user.mention}, you leveled up to **Level {level}**! 🎉',
    ignoredChannelIds: [],
    roleRewards: [],
  });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New role reward state
  const [newRewardLevel, setNewRewardLevel] = useState(5);
  const [newRewardRoleId, setNewRewardRoleId] = useState('');

  useEffect(() => {
    fetch(`/api/guilds/${guildId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channels) setChannels(data.channels);
        if (data.roles) {
          setRoles(data.roles);
          if (data.roles[0]) setNewRewardRoleId(data.roles[0].id);
        }
      })
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/leveling`)
      .then((res) => res.json())
      .then((data) => {
        if (data.config) setConfig(data.config);
      })
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/leaderboard`)
      .then((res) => res.json())
      .then((data) => {
        if (data.members) setLeaderboardMembers(data.members.slice(0, 5));
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
      await fetch(`/api/guilds/${guildId}/leveling`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      showFeedback('Leveling system configuration saved!');
    } catch {
      showFeedback('Leveling settings saved locally.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddReward = () => {
    const roleObj = roles.find((r) => r.id === newRewardRoleId);
    const newReward: RoleReward = {
      id: `rw-${Date.now()}`,
      level: newRewardLevel,
      roleId: newRewardRoleId,
      roleName: roleObj ? roleObj.name : 'Custom Role',
      roleColor: roleObj?.color || '#38bdf8',
    };

    setConfig({
      ...config,
      roleRewards: [...config.roleRewards, newReward].sort((a, b) => a.level - b.level),
    });
    setNewRewardLevel((prev) => prev + 5);
  };

  const handleRemoveReward = (id: string) => {
    setConfig({
      ...config,
      roleRewards: config.roleRewards.filter((rw) => rw.id !== id),
    });
  };

  return (
    <div className="space-y-8 w-full pb-16">
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
              Leveling & Leaderboard
            </h2>
            <span className="rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-mono px-2 py-0.5">
              Engagement Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Reward active Discord chatters with XP, automatic role tiers, and a free public web leaderboard.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/leaderboard/${guildId}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Public Leaderboard</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </Link>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* TWO COLUMNS: Config Settings & Leaderboard Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: XP & Multiplier Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Toggle Card */}
          <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Experience Point System</h3>
                  <p className="text-xs text-slate-400">
                    Enable or disable chat XP generation.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  config.enabled ? 'bg-turtle-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    config.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* XP Multiplier Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>XP Gain Multiplier</span>
                <span className="font-mono text-sm text-turtle-400 font-bold">
                  {config.xpMultiplier.toFixed(1)}x Rate
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={config.xpMultiplier}
                onChange={(e) =>
                  setConfig({ ...config, xpMultiplier: parseFloat(e.target.value) })
                }
                className="w-full accent-turtle-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.5x (Slow)</span>
                <span>1.0x (Default)</span>
                <span>2.0x (Double XP)</span>
                <span>3.0x (Turbo XP)</span>
              </div>
            </div>

            {/* Announcement Channel & Message */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Level-Up Channel
                </label>
                <select
                  value={config.announcementChannelId}
                  onChange={(e) =>
                    setConfig({ ...config, announcementChannelId: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
                >
                  <option value="current">Current Chat Channel (Where user chats)</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  XP Cooldown (Seconds)
                </label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={config.xpCooldownSeconds}
                  onChange={(e) =>
                    setConfig({ ...config, xpCooldownSeconds: parseInt(e.target.value) || 60 })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Level Up Announcement Template
                </label>
                <input
                  type="text"
                  value={config.levelUpMessage}
                  onChange={(e) => setConfig({ ...config, levelUpMessage: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Variables: <code className="text-turtle-400">{'{user.mention}'}</code>,{' '}
                  <code className="text-turtle-400">{'{level}'}</code>,{' '}
                  <code className="text-turtle-400">{'{xp}'}</code>
                </p>
              </div>
            </div>
          </div>

          {/* ROLE REWARDS TABLE */}
          <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Role Tier Rewards</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Automatically assign special Discord roles when members hit specific level milestones.
                </p>
              </div>
              <span className="text-xs font-mono text-turtle-400">
                {config.roleRewards.length} Tiers Configured
              </span>
            </div>

            {/* Existing rewards table */}
            <div className="space-y-2 pt-2">
              {config.roleRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-border text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      Level {reward.level}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: reward.roleColor || '#38bdf8' }}
                    >
                      @{reward.roleName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveReward(reward.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add reward form row */}
            <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="w-full sm:w-36">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={newRewardLevel}
                  onChange={(e) => setNewRewardLevel(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500 font-mono text-center"
                  placeholder="Level"
                />
              </div>

              <div className="flex-1">
                <select
                  value={newRewardRoleId}
                  onChange={(e) => setNewRewardRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddReward}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Tier</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Public Leaderboard Preview Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Public Leaderboard</span>
              </h3>
              <Link
                href={`/leaderboard/${guildId}`}
                target="_blank"
                className="text-xs text-turtle-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Live View</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Your server members can view rankings anytime without logging into Discord.
            </p>

            {/* Mini preview leaderboard list */}
            {leaderboardMembers.length > 0 ? (
              <div className="space-y-2 pt-1">
                {leaderboardMembers.map((member, idx) => (
                  <div
                    key={member.id || idx}
                    className="p-2.5 rounded-xl bg-[#0e111a] border border-white/[0.07] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold font-mono text-xs w-4 text-zinc-400">
                        #{idx + 1}
                      </span>
                      <img
                        src={member.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                        alt={member.username}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-zinc-200 truncate">
                          {member.displayName || member.username}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Level {member.level}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs text-emerald-400 shrink-0">
                      {member.xp?.toLocaleString()} XP
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#0e111a] border border-white/[0.07] text-center text-xs text-zinc-500 font-mono">
                No chat XP recorded yet. Chat in your server to climb the leaderboard!
              </div>
            )}

            <Link
              href={`/leaderboard/${guildId}`}
              target="_blank"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold uppercase tracking-wider border border-slate-700 transition"
            >
              <span>View Full Web Leaderboard</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
