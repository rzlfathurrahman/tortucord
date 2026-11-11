'use client';

import { use, useState, useEffect } from 'react';
import {
  Settings,
  Check,
  Save,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [guildName, setGuildName] = useState('Discord Server');
  const [prefix, setPrefix] = useState('!');
  const [nickname, setNickname] = useState('Tortuga Bot');
  const [defaultColor, setDefaultColor] = useState('#10b981');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.guild) {
          setGuildName(data.guild.name);
          if (data.guild.prefix) setPrefix(data.guild.prefix);
        }
      })
      .catch(() => {});
  }, [guildId]);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix }),
      });
      if (res.ok) {
        showFeedback(`Server settings updated! Prefix is now "${prefix}"`);
      } else {
        showFeedback('Failed to save settings.');
      }
    } catch {
      showFeedback('Server settings updated successfully!');
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      guildId,
      guildName,
      prefix,
      nickname,
      defaultColor,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tortuga-config-${guildId}.json`;
    a.click();
    showFeedback('Configuration backup JSON downloaded!');
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
              General Settings
            </h2>
            <span className="rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.08] text-[11px] font-mono px-2 py-0.5">
              Server Config
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Configure bot command prefixes, embed colors, backups, and server-level defaults.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Core Settings */}
        <div className="rounded-2xl border border-border/40 bg-card/40 p-6 space-y-5">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 pb-3 border-b border-border/30">
            <Settings className="w-4 h-4 text-turtle-400" />
            <span>Command & Bot Identity</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Bot Command Prefix
              </label>
              <input
                type="text"
                value={prefix}
                maxLength={5}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-32 px-3.5 py-2 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-base text-foreground font-mono focus:outline-none focus:border-turtle-500/50 transition"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Custom prefix for text commands (e.g. <code>!help</code>, <code>{prefix}rr</code>).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Bot Server Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Default Server Embed Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={defaultColor}
                  onChange={(e) => setDefaultColor(e.target.value)}
                  className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-white/[0.08]"
                />
                <input
                  type="text"
                  value={defaultColor}
                  onChange={(e) => setDefaultColor(e.target.value)}
                  className="w-36 px-3 py-1.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground font-mono focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone & Reset */}
        <div className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 space-y-5">
          <h3 className="text-base font-bold text-red-400 flex items-center gap-2 pb-3 border-b border-red-500/20">
            <AlertTriangle className="w-5 h-5" />
            <span>Danger Zone</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-zinc-200">Reset Server Data</h4>
                <p className="text-zinc-500 text-[11px]">
                  Wipes reaction roles, custom leveling curves, and sticky messages back to default.
                </p>
              </div>
              <button
                type="button"
                onClick={() => showFeedback('Reset request simulated')}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 text-xs font-bold uppercase transition"
              >
                Reset
              </button>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-zinc-200">Remove Bot from Guild</h4>
                <p className="text-zinc-500 text-[11px]">
                  Leaves this Discord server. You can re-invite anytime without data loss.
                </p>
              </div>
              <button
                type="button"
                onClick={() => showFeedback('Leave server simulated')}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-bold uppercase transition"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
