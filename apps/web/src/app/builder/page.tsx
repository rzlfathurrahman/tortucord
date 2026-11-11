'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { EmbedData, EmbedField, DiscordGuild } from '@/lib/types';
import { DiscordEmbedPreview } from '@/components/DiscordEmbedPreview';
import {
  Palette,
  Send,
  Copy,
  Code,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ExternalLink,
  Eye,
  Hash,
  ChevronDown,
  Layers,
  LogIn,
} from 'lucide-react';

const INITIAL_EMBED: EmbedData = {
  title: 'Server Announcement',
  description: 'Welcome to our server! Check out the channels below and enjoy your stay.',
  url: '',
  color: '#10b981',
  author: {
    name: 'Server Admin',
    url: '',
    icon_url: '',
  },
  fields: [
    {
      id: 'f-1',
      name: 'Server Rules',
      value: 'Be respectful and adhere to Discord Community Guidelines.',
      inline: true,
    },
    {
      id: 'f-2',
      name: 'Get Roles',
      value: 'Select your notification and game roles in the roles channel.',
      inline: true,
    },
  ],
  footer: {
    text: 'Tortuga Server Management',
    icon_url: '',
  },
  thumbnail: {
    url: '',
  },
  image: {
    url: '',
  },
  timestamp: false,
};

const COLOR_PRESETS = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Discord Blurple', hex: '#5865F2' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Ruby Red', hex: '#ED4245' },
  { name: 'Electric Sky', hex: '#0284c7' },
  { name: 'Neon Purple', hex: '#a855f7' },
  { name: 'Fuchsia Pink', hex: '#EB459E' },
  { name: 'Dark Slate', hex: '#1e293b' },
];

export default function StandaloneEmbedBuilderPage() {
  const [embed, setEmbed] = useState<EmbedData>(INITIAL_EMBED);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Check authentication and load guilds
    fetch('/api/auth/discord')
      .then((r) => r.json())
      .then((authData) => {
        if (authData.authenticated) {
          setIsAuthenticated(true);
          fetch('/api/guilds')
            .then((r) => r.json())
            .then((gData) => {
              if (gData.guilds && gData.guilds.length > 0) {
                setGuilds(gData.guilds);
                setSelectedGuildId(gData.guilds[0].id);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // When selectedGuildId changes, load its channels
  useEffect(() => {
    if (!selectedGuildId) return;
    fetch(`/api/guilds/${selectedGuildId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          setSelectedChannelId(data.channels[0].id);
        } else {
          setChannels([]);
          setSelectedChannelId('');
        }
      })
      .catch(() => {});
  }, [selectedGuildId]);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddField = () => {
    const newField: EmbedField = {
      id: `f-${Date.now()}`,
      name: 'New Field Title',
      value: 'Field value content here.',
      inline: true,
    };
    setEmbed({ ...embed, fields: [...embed.fields, newField] });
  };

  const handleRemoveField = (id: string) => {
    setEmbed({
      ...embed,
      fields: embed.fields.filter((f) => f.id !== id),
    });
  };

  const handleUpdateField = (id: string, key: keyof EmbedField, value: any) => {
    setEmbed({
      ...embed,
      fields: embed.fields.map((f) => {
        if (f.id === id) {
          return { ...f, [key]: value };
        }
        return f;
      }),
    });
  };

  const handleCopyJSON = () => {
    const payload = {
      embeds: [
        {
          title: embed.title || undefined,
          description: embed.description || undefined,
          url: embed.url || undefined,
          color: parseInt(embed.color.replace('#', ''), 16) || 0,
          author: embed.author.name
            ? {
                name: embed.author.name,
                url: embed.author.url || undefined,
                icon_url: embed.author.icon_url || undefined,
              }
            : undefined,
          fields: embed.fields.map((f) => ({
            name: f.name,
            value: f.value,
            inline: f.inline,
          })),
          thumbnail: embed.thumbnail.url ? { url: embed.thumbnail.url } : undefined,
          image: embed.image.url ? { url: embed.image.url } : undefined,
          footer: embed.footer.text
            ? {
                text: embed.footer.text,
                icon_url: embed.footer.icon_url || undefined,
              }
            : undefined,
          timestamp: embed.timestamp ? new Date().toISOString() : undefined,
        },
      ],
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    showFeedback('Discord JSON payload copied to clipboard!');
  };

  const handleCopyTagScript = () => {
    let script = '{embed}\n';
    if (embed.title) script += `{title:${embed.title}}\n`;
    if (embed.description) script += `{description:${embed.description}}\n`;
    if (embed.color) script += `{color:${embed.color}}\n`;
    if (embed.author.name) script += `{author:${embed.author.name}}\n`;
    if (embed.footer.text) script += `{footer:${embed.footer.text}}\n`;
    embed.fields.forEach((f) => {
      script += `{field:${f.name}|${f.value}|${f.inline}}\n`;
    });

    navigator.clipboard.writeText(script.trim());
    showFeedback('TagScript code copied to clipboard!');
  };

  const handleSendToDiscord = async () => {
    if (!selectedChannelId || !selectedGuildId) {
      showFeedback('Please select a target channel first.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`/api/guilds/${selectedGuildId}/embeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          channelId: selectedChannelId,
          embed,
        }),
      });

      const data = await res.json();
      if (data.sent) {
        showFeedback('Embed successfully dispatched to Discord!');
      } else {
        showFeedback(data.error || 'Failed to dispatch embed.');
      }
    } catch {
      showFeedback('Network error while dispatching embed.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-zinc-100">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 text-white px-5 py-3 shadow-2xl flex items-center gap-2 text-sm font-semibold animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Visual Embed Builder
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Design high-fidelity Discord rich embeds with real-time preview, copy raw JSON, or dispatch directly to your channels.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyJSON}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0e111a] hover:bg-white/[0.06] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Copy JSON</span>
            </button>

            <button
              onClick={handleCopyTagScript}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0e111a] hover:bg-white/[0.06] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy TagScript</span>
            </button>
          </div>
        </div>

        {/* Two Columns: Left Editor Controls & Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Editor Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Dispatch Panel */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0e111a] p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dispatch to Discord</span>
              </h3>

              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="sm:w-1/2">
                    <label className="text-[11px] text-zinc-400 block mb-1">Server</label>
                    <select
                      value={selectedGuildId}
                      onChange={(e) => setSelectedGuildId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    >
                      {guilds.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:w-1/2">
                    <label className="text-[11px] text-zinc-400 block mb-1">Channel</label>
                    <select
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    >
                      {channels.length > 0 ? (
                        channels.map((c) => (
                          <option key={c.id} value={c.id}>
                            #{c.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No channels available</option>
                      )}
                    </select>
                  </div>

                  <div className="sm:self-end">
                    <button
                      onClick={handleSendToDiscord}
                      disabled={isSending || !selectedChannelId}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSending ? 'Sending...' : 'Send'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-xs text-zinc-400">
                    Login with Discord to post this embed directly to your server.
                  </span>
                  <Link
                    href="/api/auth/discord/login"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>Login</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Basic Content */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0e111a] p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Basic Content
              </h3>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Embed Title
                </label>
                <input
                  type="text"
                  value={embed.title}
                  onChange={(e) => setEmbed({ ...embed, title: e.target.value })}
                  placeholder="Announcement Title"
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Title URL
                </label>
                <input
                  type="text"
                  value={embed.url}
                  onChange={(e) => setEmbed({ ...embed, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={embed.description}
                  onChange={(e) => setEmbed({ ...embed, description: e.target.value })}
                  placeholder="Embed body text with Markdown formatting..."
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-2">
                  Border Color
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setEmbed({ ...embed, color: p.hex })}
                      className="w-6 h-6 rounded-md border border-white/20 transition hover:scale-110 relative"
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                    >
                      {embed.color.toLowerCase() === p.hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5 ml-2">
                    <input
                      type="color"
                      value={embed.color}
                      onChange={(e) => setEmbed({ ...embed, color: e.target.value })}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={embed.color}
                      onChange={(e) => setEmbed({ ...embed, color: e.target.value })}
                      className="w-20 px-2 py-1 rounded bg-[#08090d] border border-white/[0.08] text-[11px] text-zinc-200 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Author */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0e111a] p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Author
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={embed.author.name}
                    onChange={(e) =>
                      setEmbed({ ...embed, author: { ...embed.author, name: e.target.value } })
                    }
                    placeholder="Author name"
                    className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Author Icon URL
                  </label>
                  <input
                    type="text"
                    value={embed.author.icon_url}
                    onChange={(e) =>
                      setEmbed({ ...embed, author: { ...embed.author, icon_url: e.target.value } })
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0e111a] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Fields ({embed.fields.length}/25)
                </h3>
                <button
                  type="button"
                  onClick={handleAddField}
                  disabled={embed.fields.length >= 25}
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>

              <div className="space-y-3">
                {embed.fields.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-lg bg-[#08090d] border border-white/[0.06] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={f.name}
                        onChange={(e) => handleUpdateField(f.id, 'name', e.target.value)}
                        placeholder="Field Title"
                        className="flex-1 px-2.5 py-1.5 rounded bg-[#0e111a] border border-white/[0.08] text-xs text-white font-medium"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={f.inline}
                          onChange={(e) => handleUpdateField(f.id, 'inline', e.target.checked)}
                          className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0"
                        />
                        <span>Inline</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(f.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={f.value}
                      onChange={(e) => handleUpdateField(f.id, 'value', e.target.value)}
                      placeholder="Field Value"
                      className="w-full px-2.5 py-1.5 rounded bg-[#0e111a] border border-white/[0.08] text-xs text-zinc-300"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Images & Footer */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0e111a] p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Media & Footer
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Thumbnail URL (Corner)
                  </label>
                  <input
                    type="text"
                    value={embed.thumbnail.url}
                    onChange={(e) =>
                      setEmbed({ ...embed, thumbnail: { url: e.target.value } })
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Large Image URL
                  </label>
                  <input
                    type="text"
                    value={embed.image.url}
                    onChange={(e) =>
                      setEmbed({ ...embed, image: { url: e.target.value } })
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Footer Text
                </label>
                <input
                  type="text"
                  value={embed.footer.text}
                  onChange={(e) =>
                    setEmbed({ ...embed, footer: { ...embed.footer, text: e.target.value } })
                  }
                  placeholder="Footer notice..."
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="standalone-timestamp"
                  checked={embed.timestamp}
                  onChange={(e) => setEmbed({ ...embed, timestamp: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="standalone-timestamp" className="text-xs text-zinc-300 cursor-pointer">
                  Include current timestamp
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Discord Simulator (5 cols, sticky) */}
          <div className="lg:col-span-5 sticky top-20 space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#0e111a] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-200">
                    Discord Live Preview
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Real-time</span>
              </div>

              {/* Real Discord Embed Preview Component */}
              <DiscordEmbedPreview embed={embed} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
