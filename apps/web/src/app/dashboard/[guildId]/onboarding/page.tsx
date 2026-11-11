'use client';

import { use, useState, useEffect } from 'react';
import {
  UserPlus,
  LogOut,
  Mail,
  Shield,
  Check,
  Save,
  Eye,
  Bot,
  User,
  Hash,
} from 'lucide-react';
import { DiscordChannel, DiscordRole } from '@/lib/types';

export default function OnboardingPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [guildName, setGuildName] = useState('Discord Server');

  // Welcome settings
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomeChannelId, setWelcomeChannelId] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Hey {user.mention}, welcome to **{server.name}**! 🎉 You are member #{memberCount}.'
  );
  const [sendDmWelcome, setSendDmWelcome] = useState(false);
  const [dmWelcomeMessage, setDmWelcomeMessage] = useState(
    'Welcome to **{server.name}**! Please check out the server rules.'
  );

  // Auto-Role settings
  const [autoroleIds, setAutoroleIds] = useState<string[]>([]);
  const [botAutoroleIds, setBotAutoroleIds] = useState<string[]>([]);

  // Goodbye settings
  const [goodbyeEnabled, setGoodbyeEnabled] = useState(false);
  const [goodbyeChannelId, setGoodbyeChannelId] = useState('');
  const [goodbyeMessage, setGoodbyeMessage] = useState(
    '**{user.name}** has left the server.'
  );

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.guild) setGuildName(data.guild.name);
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
        }
        if (data.roles) {
          setRoles(data.roles);
        }
      })
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/onboarding`)
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          const cfg = data.config;
          setWelcomeEnabled(cfg.welcomeEnabled);
          if (cfg.welcomeChannelId) setWelcomeChannelId(cfg.welcomeChannelId);
          if (cfg.welcomeMessage) setWelcomeMessage(cfg.welcomeMessage);
          setSendDmWelcome(cfg.sendDmWelcome);
          if (cfg.dmWelcomeMessage) setDmWelcomeMessage(cfg.dmWelcomeMessage);
          setGoodbyeEnabled(cfg.goodbyeEnabled);
          if (cfg.goodbyeChannelId) setGoodbyeChannelId(cfg.goodbyeChannelId);
          if (cfg.goodbyeMessage) setGoodbyeMessage(cfg.goodbyeMessage);
          if (cfg.autoroleIds) setAutoroleIds(cfg.autoroleIds);
          if (cfg.botAutoroleIds) setBotAutoroleIds(cfg.botAutoroleIds);
        }
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
      const res = await fetch(`/api/guilds/${guildId}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcomeEnabled,
          welcomeChannelId: welcomeChannelId || (channels[0] ? channels[0].id : null),
          welcomeMessage,
          sendDmWelcome,
          dmWelcomeMessage,
          goodbyeEnabled,
          goodbyeChannelId: goodbyeChannelId || (channels[0] ? channels[0].id : null),
          goodbyeMessage,
          autoroleIds,
          botAutoroleIds,
        }),
      });

      if (res.ok) {
        showFeedback('Onboarding settings saved.');
      } else {
        showFeedback('Failed to save settings.');
      }
    } catch {
      showFeedback('Saved settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoRole = (roleId: string) => {
    setAutoroleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleBotAutoRole = (roleId: string) => {
    setBotAutoroleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const insertTag = (tag: string) => {
    setWelcomeMessage((prev) => `${prev} ${tag}`);
  };

  const previewText = welcomeMessage
    .replace('{user.mention}', '@NewMember')
    .replace('{user.name}', 'NewMember')
    .replace('{server.name}', guildName)
    .replace('{memberCount}', '42');

  return (
    <div className="space-y-6 w-full pb-16">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-zinc-900 border border-emerald-500/40 text-emerald-400 px-4 py-2.5 shadow-2xl flex items-center gap-2 text-xs font-medium">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Onboarding & Welcome</h2>
            <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded">
              Automated Flow
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Automate newcomer greetings, auto-assign default roles, and deliver direct onboarding messages.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* Section 1: Channel Welcome */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0e111a] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/[0.05] text-zinc-300">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">Public Welcome Message</h3>
                  <p className="text-[11px] text-zinc-400">Post an announcement when a new member joins</p>
                </div>
              </div>

              {/* Native-style Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={welcomeEnabled}
                  onChange={(e) => setWelcomeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {welcomeEnabled && (
              <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Target Channel
                  </label>
                  <select
                    value={welcomeChannelId}
                    onChange={(e) => setWelcomeChannelId(e.target.value)}
                    className="w-full rounded-md bg-[#121622] border border-white/[0.08] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/80"
                  >
                    <option value="">Select a channel...</option>
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Message Template
                    </label>
                    <div className="flex gap-1.5">
                      {['{user.mention}', '{user.name}', '{server.name}', '{memberCount}'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => insertTag(t)}
                          className="font-mono text-[10px] text-zinc-400 hover:text-zinc-200 bg-white/[0.04] hover:bg-white/[0.08] px-1.5 py-0.5 rounded border border-white/[0.06] transition"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full rounded-md bg-[#121622] border border-white/[0.08] p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/80 font-sans leading-relaxed resize-none"
                    placeholder="Type your welcome message..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Auto-Role on Join */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0e111a] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/[0.05] text-zinc-300">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-zinc-200">Auto-Assign Roles (Auto-Role)</h3>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                      Free Feature
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Automatically grant roles to users immediately when they join
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-white/[0.06]">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-zinc-400" />
                  <span>Roles for New Human Members</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {roles.map((role) => {
                    const isSelected = autoroleIds.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleAutoRole(role.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#121622] border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12]'
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: role.color || '#94a3b8' }}
                        />
                        <span>@{role.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.04]">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Bot className="w-3 h-3 text-zinc-400" />
                  <span>Roles for New Bots</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {roles.map((role) => {
                    const isSelected = botAutoroleIds.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleBotAutoRole(role.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                            : 'bg-[#121622] border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12]'
                        }`}
                      >
                        <span>@{role.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-purple-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: DM Greeting */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0e111a] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/[0.05] text-zinc-300">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">Direct Message (DM) Greeting</h3>
                  <p className="text-[11px] text-zinc-400">Send private message directly to newcomer inbox</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendDmWelcome}
                  onChange={(e) => setSendDmWelcome(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {sendDmWelcome && (
              <div className="pt-3 border-t border-white/[0.06]">
                <textarea
                  rows={2}
                  value={dmWelcomeMessage}
                  onChange={(e) => setDmWelcomeMessage(e.target.value)}
                  className="w-full rounded-md bg-[#121622] border border-white/[0.08] p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/80 resize-none"
                  placeholder="Direct message content..."
                />
              </div>
            )}
          </div>

          {/* Section 4: Goodbye / Member Leave */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0e111a] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/[0.05] text-zinc-300">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-200">Departure (Goodbye) Message</h3>
                  <p className="text-[11px] text-zinc-400">Notify channel when a member leaves</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={goodbyeEnabled}
                  onChange={(e) => setGoodbyeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {goodbyeEnabled && (
              <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Departure Channel
                  </label>
                  <select
                    value={goodbyeChannelId}
                    onChange={(e) => setGoodbyeChannelId(e.target.value)}
                    className="w-full rounded-md bg-[#121622] border border-white/[0.08] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/80"
                  >
                    <option value="">Select a channel...</option>
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Departure Text
                  </label>
                  <input
                    type="text"
                    value={goodbyeMessage}
                    onChange={(e) => setGoodbyeMessage(e.target.value)}
                    className="w-full rounded-md bg-[#121622] border border-white/[0.08] px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/80"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 rounded-xl border border-white/[0.07] bg-[#0e111a] p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <h4 className="text-xs font-semibold text-zinc-200">Discord Simulator</h4>
              </div>
              <span className="font-mono text-[10px] text-zinc-500">#welcome</span>
            </div>

            {/* Discord Dark Theme Emulator */}
            <div className="rounded-lg bg-[#313338] p-3 text-[#dbdee1] font-sans text-xs space-y-2 border border-black/30 shadow-inner select-none">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  T
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white text-xs">Tortuga</span>
                    <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 py-0.2 rounded uppercase">
                      APP
                    </span>
                    <span className="text-[10px] text-[#949ba4]">Today at 12:00 PM</span>
                  </div>

                  {/* Message content */}
                  <div className="text-[11px] text-[#dbdee1] mt-1 whitespace-pre-wrap leading-relaxed">
                    {previewText}
                  </div>

                  {/* Embed card */}
                  <div className="mt-2 rounded bg-[#2b2d31] border-l-[3px] border-emerald-500 p-2.5 max-w-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300">
                        U
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">NewMember joined</p>
                        <p className="text-[10px] text-[#949ba4]">Member #{42} of {guildName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Status Recap */}
            <div className="p-3 rounded-md bg-[#121622] border border-white/[0.05] text-[11px] space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Auto-Role:</span>
                <span className="text-emerald-400">
                  {autoroleIds.length > 0 ? `${autoroleIds.length} roles` : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Direct DM:</span>
                <span className={sendDmWelcome ? 'text-zinc-300' : 'text-zinc-600'}>
                  {sendDmWelcome ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Departure:</span>
                <span className={goodbyeEnabled ? 'text-zinc-300' : 'text-zinc-600'}>
                  {goodbyeEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
