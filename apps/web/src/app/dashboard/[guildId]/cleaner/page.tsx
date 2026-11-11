'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Sparkles,
  Trash2,
  Filter,
  Search,
  Check,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Square,
  CheckSquare,
  Paperclip,
  ExternalLink,
  Bot,
  Hash,
} from 'lucide-react';
import { DiscordChannel } from '@/lib/types';

interface MessagePreview {
  id: string;
  channelId: string;
  author: {
    id: string;
    username: string;
    avatar: string | null;
    bot: boolean;
  };
  content: string;
  timestamp: string;
  attachments: { id: string; url: string; name: string }[];
  embeds: any[];
}

export default function CleanerStudioPage() {
  const { guildId } = useParams() as { guildId: string };
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);

  // Filters
  const [limit, setLimit] = useState(50);
  const [filterUser, setFilterUser] = useState('');
  const [keyword, setKeyword] = useState('');
  const [onlyBots, setOnlyBots] = useState(false);
  const [hasAttachments, setHasAttachments] = useState(false);
  const [hasLinks, setHasLinks] = useState(false);

  // Scan Results
  const [isScanning, setIsScanning] = useState(false);
  const [scannedMessages, setScannedMessages] = useState<MessagePreview[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  // Purge State
  const [isPurging, setIsPurging] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    fetch(`/api/guilds/${guildId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.channels) {
          const textOnly = data.channels.filter(
            (c: DiscordChannel) => c.type === 'text' || c.type === 'announcement'
          );
          setChannels(textOnly);
          if (textOnly.length > 0) {
            setSelectedChannelId(textOnly[0].id);
          }
        }
      })
      .catch(() => showFeedback('Failed to load server channels.'))
      .finally(() => setIsLoadingChannels(false));
  }, [guildId]);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedChannelId) return;

    setIsScanning(true);
    setHasScanned(true);
    setSelectedMessageIds([]);

    try {
      const res = await fetch(`/api/guilds/${guildId}/cleaner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          channelId: selectedChannelId,
          limit,
          filterUser: filterUser || undefined,
          keyword: keyword || undefined,
          onlyBots,
          hasAttachments,
          hasLinks,
        }),
      });

      const data = await res.json();
      if (data.success && data.messages) {
        setScannedMessages(data.messages);
        // By default, select all matched messages for easy purge
        setSelectedMessageIds(data.messages.map((m: MessagePreview) => m.id));
      } else {
        showFeedback(data.error || 'Failed to scan channel messages.');
      }
    } catch {
      showFeedback('Network error scanning messages.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedMessageIds.length === scannedMessages.length) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(scannedMessages.map((m) => m.id));
    }
  };

  const toggleSelectMessage = (id: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePurge = async () => {
    if (selectedMessageIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete ${selectedMessageIds.length} message(s)?\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    setIsPurging(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/cleaner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purge',
          channelId: selectedChannelId,
          messageIds: selectedMessageIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(`Successfully purged ${data.deletedCount} message(s)!`);
        // Remove deleted messages from preview list
        setScannedMessages((prev) =>
          prev.filter((m) => !selectedMessageIds.includes(m.id))
        );
        setSelectedMessageIds([]);
      } else {
        showFeedback(data.error || 'Failed to delete messages.');
      }
    } catch {
      showFeedback('Network error during message purge.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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
              <Sparkles className="w-6 h-6 text-emerald-400" />
              <span>Bulk Purge & Cleaner Studio</span>
            </h1>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              Live Gateway Cleaner
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Filter, inspect live chat history, and bulk delete spam messages, bot error spam, or specific keywords with safety preview.
          </p>
        </div>
      </div>

      {/* Filter Control Box */}
      <form onSubmit={handleScan} className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Target Channel */}
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Select Target Channel
            </label>
            <select
              value={selectedChannelId}
              onChange={(e) => setSelectedChannelId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
          </div>

          {/* User / Bot Filter */}
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Filter by User / ID (Optional)
            </label>
            <input
              type="text"
              placeholder="Username or Discord ID..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Keyword Pattern */}
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Keyword / Text Match (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. discord.gg, spam text..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Checkbox Options & Scan Limit */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-white/[0.06]">
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300 select-none">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyBots}
                onChange={(e) => setOnlyBots(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-0 bg-[#08090d]"
              />
              <span>Only Bot Messages</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAttachments}
                onChange={(e) => setHasAttachments(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-0 bg-[#08090d]"
              />
              <span>Has Media / Files</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLinks}
                onChange={(e) => setHasLinks(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-0 bg-[#08090d]"
              />
              <span>Has Links (http://)</span>
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span>Scan limit:</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2 py-1 rounded bg-[#08090d] border border-white/[0.08] text-xs text-white"
              >
                <option value={25}>25 msgs</option>
                <option value={50}>50 msgs</option>
                <option value={100}>100 msgs</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Scan & Preview</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Preview & Action Area */}
      {hasScanned && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] overflow-hidden space-y-0">
          {/* Action Bar */}
          <div className="p-4 bg-white/[0.02] border-b border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white"
              >
                {selectedMessageIds.length === scannedMessages.length && scannedMessages.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-500" />
                )}
                <span>Select All ({scannedMessages.length})</span>
              </button>

              <span className="text-zinc-600">•</span>
              <span className="text-xs font-mono text-zinc-400">
                {selectedMessageIds.length} message(s) selected
              </span>
            </div>

            {selectedMessageIds.length > 0 && (
              <button
                onClick={handlePurge}
                disabled={isPurging}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-white font-semibold text-xs transition shadow disabled:opacity-50"
              >
                {isPurging ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Messages...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Selected ({selectedMessageIds.length})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Messages Table */}
          <div className="divide-y divide-white/[0.04] max-h-[500px] overflow-y-auto">
            {scannedMessages.map((msg) => {
              const isSelected = selectedMessageIds.includes(msg.id);

              return (
                <div
                  key={msg.id}
                  onClick={() => toggleSelectMessage(msg.id)}
                  className={`px-4 py-3 flex items-start gap-3.5 cursor-pointer transition select-none ${
                    isSelected ? 'bg-rose-500/[0.04] hover:bg-rose-500/[0.07]' : 'hover:bg-white/[0.01]'
                  }`}
                >
                  <div className="pt-1">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                    )}
                  </div>

                  {msg.author.avatar ? (
                    <img
                      src={msg.author.avatar}
                      alt={msg.author.username}
                      className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                      {msg.author.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-xs">
                        {msg.author.username}
                      </span>
                      {msg.author.bot && (
                        <span className="px-1 py-0.2 rounded bg-[#5865F2]/20 text-[#5865F2] text-[9px] font-bold">
                          BOT
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed break-words font-mono">
                      {msg.content || <span className="italic text-zinc-600">(No text content)</span>}
                    </p>

                    {msg.attachments.length > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        {msg.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded hover:underline"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{att.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {scannedMessages.length === 0 && (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No messages matching your filter criteria found in the last {limit} messages.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
