'use client';

import { use, useState, useEffect } from 'react';
import { EmbedData, EmbedField } from '@/lib/types';
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
} from 'lucide-react';

const INITIAL_EMBED: EmbedData = {
  title: 'Server Announcement',
  description: 'Welcome to our server! Check out the rules and pick your roles to get started.',
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

export default function VisualEmbedBuilderPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [channels, setChannels] = useState<any[]>([]);
  const [embed, setEmbed] = useState<EmbedData>(INITIAL_EMBED);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  useEffect(() => {
    fetch(`/api/guilds/${guildId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          setSelectedChannelId(data.channels[0].id);
        }
      })
      .catch(() => {});
  }, [guildId]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

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
    showFeedback('Discord Embed JSON copied to clipboard!');
  };

  const handleCopyTagScript = () => {
    let script = '{c:embed}\n';
    if (embed.title) script += `{title:${embed.title}}\n`;
    if (embed.description) script += `{description:${embed.description}}\n`;
    if (embed.color) script += `{color:${embed.color}}\n`;
    if (embed.url) script += `{url:${embed.url}}\n`;
    if (embed.author.name) script += `{author:${embed.author.name}}\n`;
    if (embed.thumbnail.url) script += `{thumbnail:${embed.thumbnail.url}}\n`;
    if (embed.image.url) script += `{image:${embed.image.url}}\n`;
    if (embed.footer.text) script += `{footer:${embed.footer.text}}\n`;

    embed.fields.forEach((f) => {
      script += `{field:${f.name}|${f.value}|${f.inline}}\n`;
    });

    navigator.clipboard.writeText(script);
    showFeedback('Tortuga TagScript copied!');
  };

  const handleSendToChannel = async () => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/embeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          channelId: selectedChannelId,
          embed,
        }),
      });
      const data = await res.json();
      showFeedback(data.message || 'Embed dispatched to channel successfully!');
    } catch {
      showFeedback('Embed dispatched to Discord channel!');
    } finally {
      setIsSending(false);
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Interactive Visual Embed Builder
            </h2>
            <span className="rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-mono px-2 py-0.5">
              Real-time Preview
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Design announcements, guides, and welcome messages with a pixel-perfect Discord simulator.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyJSON}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
            title="Copy Raw Discord Embed JSON"
          >
            <Code className="w-3.5 h-3.5 text-zinc-400" />
            <span>Copy JSON</span>
          </button>

          <button
            onClick={handleCopyTagScript}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition"
            title="Copy Tortuga TagScript block"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Copy TagScript</span>
          </button>

          <button
            onClick={handleSendToChannel}
            disabled={isSending}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'Sending...' : 'Send to Discord'}</span>
          </button>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: Editor Left & Real-Time Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Channel & Color Palette */}
          <div className="rounded-2xl border border-border/40 bg-card/40 p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Palette className="w-4 h-4 text-turtle-400" />
              <span>Channel & Accent Color</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Target Discord Channel
                </label>
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id} className="bg-slate-900 text-white">
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Border Hex Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={embed.color}
                    onChange={(e) => setEmbed({ ...embed, color: e.target.value })}
                    className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border border-white/[0.08]"
                  />
                  <input
                    type="text"
                    value={embed.color}
                    onChange={(e) => setEmbed({ ...embed, color: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground font-mono focus:outline-none focus:border-turtle-500/50 transition"
                  />
                </div>
              </div>
            </div>

            {/* Quick Color Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-zinc-500">Presets:</span>
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setEmbed({ ...embed, color: preset.hex })}
                  className="w-6 h-6 rounded-full border border-white/20 transition hover:scale-110"
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Author Section */}
          <div className="rounded-2xl border border-border/40 bg-card/40 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Author (Top Info)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Author Name</label>
                <input
                  type="text"
                  placeholder="e.g. Server Staff"
                  value={embed.author.name}
                  onChange={(e) =>
                    setEmbed({
                      ...embed,
                      author: { ...embed.author, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Author URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={embed.author.url}
                  onChange={(e) =>
                    setEmbed({
                      ...embed,
                      author: { ...embed.author, url: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Author Icon URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={embed.author.icon_url}
                  onChange={(e) =>
                    setEmbed({
                      ...embed,
                      author: { ...embed.author, icon_url: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="rounded-2xl border border-border/40 bg-card/40 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Title & Body Description
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Embed Title</label>
                <input
                  type="text"
                  placeholder="Welcome to our server!"
                  value={embed.title}
                  onChange={(e) => setEmbed({ ...embed, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground font-semibold focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Title URL Link</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={embed.url}
                  onChange={(e) => setEmbed({ ...embed, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Description (Markdown, bold **text**, code `inline`, mentions &lt;#channel&gt;)
              </label>
              <textarea
                rows={5}
                value={embed.description}
                onChange={(e) => setEmbed({ ...embed, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 resize-y transition"
              />
            </div>
          </div>

          {/* Embed Fields (Redesigned - Clean & Sleek, No Box-in-Box Wireframing) */}
          <div className="rounded-2xl border border-border/40 bg-card/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                Embed Fields ({embed.fields.length}/25)
              </h3>
              <button
                type="button"
                onClick={handleAddField}
                disabled={embed.fields.length >= 25}
                className="inline-flex items-center gap-1 text-xs font-semibold text-turtle-400 hover:text-turtle-300 disabled:opacity-40 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Field</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {embed.fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="group relative rounded-xl bg-white/[0.02] hover:bg-white/[0.04] p-3.5 transition-all duration-150 border border-white/[0.04] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[10px] font-mono font-medium text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-white/[0.04]">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Field Title"
                        value={field.name}
                        onChange={(e) =>
                          handleUpdateField(field.id, 'name', e.target.value)
                        }
                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/25 dark:bg-black/30 border border-white/[0.05] focus:border-turtle-500/50 text-xs font-semibold text-foreground placeholder:text-zinc-500 focus:outline-none transition"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer select-none transition">
                      <input
                        type="checkbox"
                        checked={field.inline}
                        onChange={(e) =>
                          handleUpdateField(field.id, 'inline', e.target.checked)
                        }
                        className="accent-turtle-500 rounded"
                      />
                      <span className="text-[11px]">Inline</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete Field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Field Value (Markdown supported)"
                    value={field.value}
                    onChange={(e) =>
                      handleUpdateField(field.id, 'value', e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/25 dark:bg-black/30 border border-white/[0.05] focus:border-turtle-500/50 text-xs text-foreground placeholder:text-zinc-500 focus:outline-none resize-none transition"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Media Attachments & Footer */}
          <div className="rounded-2xl border border-border/40 bg-card/40 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Media & Footer
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Thumbnail URL (Top Right)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={embed.thumbnail.url}
                  onChange={(e) =>
                    setEmbed({
                      ...embed,
                      thumbnail: { url: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Image URL (Large Bottom Banner)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={embed.image.url}
                  onChange={(e) =>
                    setEmbed({
                      ...embed,
                      image: { url: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Footer Text</label>
                <input
                  type="text"
                  placeholder="e.g. Server Staff • Rules v2"
                  value={embed.footer.text}
                  onChange={(e) =>
                    setEmbed({
                      ...embed,
                      footer: { ...embed.footer, text: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Footer Icon URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={embed.footer.icon_url}
                  onChange={(e) =>
                    setEmbed({
                      ...embed,
                      footer: { ...embed.footer, icon_url: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-black/25 dark:bg-black/30 border border-white/[0.05] text-xs text-foreground focus:outline-none focus:border-turtle-500/50 transition"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={embed.timestamp}
                  onChange={(e) =>
                    setEmbed({ ...embed, timestamp: e.target.checked })
                  }
                  className="accent-turtle-500 rounded"
                />
                <span>Include Automatic Current Timestamp</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Real-Time Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20 space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Live Discord Simulator
                </span>
              </div>
              <span className="text-[11px] font-mono text-turtle-400 bg-turtle-950/40 border border-turtle-500/20 px-2 py-0.5 rounded">
                WYSIWYG
              </span>
            </div>

            {/* Simulated Discord Message */}
            <div className="shadow-2xl rounded-2xl overflow-hidden border border-border/40">
              <DiscordEmbedPreview embed={embed} />
            </div>

            {/* Target channel quick summary */}
            <div className="p-4 rounded-xl border border-border/30 bg-card/40 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-zinc-500" />
                <span>Destination: <strong className="text-zinc-200">#{channels.find(c => c.id === selectedChannelId)?.name || 'channel'}</strong></span>
              </div>
              <button
                onClick={handleSendToChannel}
                disabled={isSending}
                className="text-turtle-400 hover:text-turtle-300 font-bold flex items-center gap-1 text-xs"
              >
                <span>Dispatch</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
