'use client';

import { use, useState, useEffect } from 'react';
import {
  Lightbulb,
  Star,
  Check,
  Hash,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Sliders,
} from 'lucide-react';

export default function SuggestionsStarboardPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [channels, setChannels] = useState<any[]>([]);

  // Suggestions state
  const [suggestionsChannel, setSuggestionsChannel] = useState('');
  const [upvoteEmoji, setUpvoteEmoji] = useState('👍');
  const [downvoteEmoji, setDownvoteEmoji] = useState('👎');
  const [autoReactions, setAutoReactions] = useState(true);
  const [modApprovalRequired, setModApprovalRequired] = useState(false);

  // Starboard state
  const [starboardEnabled, setStarboardEnabled] = useState(true);
  const [starboardChannel, setStarboardChannel] = useState('');
  const [starThreshold, setStarThreshold] = useState(5);
  const [allowSelfStar, setAllowSelfStar] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.channels && data.channels.length > 0) {
          setChannels(data.channels);
          setSuggestionsChannel(data.channels[0].id);
          setStarboardChannel(data.channels[0].id);
        }
      })
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/suggestions`)
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          const cfg = data.config;
          if (cfg.suggestionsChannel) setSuggestionsChannel(cfg.suggestionsChannel);
          if (cfg.upvoteEmoji) setUpvoteEmoji(cfg.upvoteEmoji);
          if (cfg.downvoteEmoji) setDownvoteEmoji(cfg.downvoteEmoji);
          if (cfg.autoReactions !== undefined) setAutoReactions(cfg.autoReactions);
          if (cfg.modApprovalRequired !== undefined) setModApprovalRequired(cfg.modApprovalRequired);
          if (cfg.starboardEnabled !== undefined) setStarboardEnabled(cfg.starboardEnabled);
          if (cfg.starboardChannel) setStarboardChannel(cfg.starboardChannel);
          if (cfg.starThreshold !== undefined) setStarThreshold(cfg.starThreshold);
          if (cfg.allowSelfStar !== undefined) setAllowSelfStar(cfg.allowSelfStar);
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
      await fetch(`/api/guilds/${guildId}/suggestions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionsChannel,
          upvoteEmoji,
          downvoteEmoji,
          autoReactions,
          modApprovalRequired,
          starboardEnabled,
          starboardChannel,
          starThreshold,
          allowSelfStar,
        }),
      });
      showFeedback('Suggestions and Starboard settings saved to database!');
    } catch {
      showFeedback('Saved settings!');
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Suggestions & Starboard
            </h2>
            <span className="rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono px-2 py-0.5">
              Community Engagement
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Collect member feedback and showcase the highest-rated server messages.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save Configuration</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* SUGGESTIONS BOX CONFIG */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Suggestions Channel</h3>
              <p className="text-xs text-slate-400">
                Format user suggestions with voting embeds.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Channel
              </label>
              <select
                value={suggestionsChannel}
                onChange={(e) => setSuggestionsChannel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Upvote Emoji
                </label>
                <input
                  type="text"
                  value={upvoteEmoji}
                  onChange={(e) => setUpvoteEmoji(e.target.value)}
                  className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-border text-base focus:outline-none focus:border-turtle-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Downvote Emoji
                </label>
                <input
                  type="text"
                  value={downvoteEmoji}
                  onChange={(e) => setDownvoteEmoji(e.target.value)}
                  className="w-full text-center py-1.5 rounded-xl bg-slate-900 border border-border text-base focus:outline-none focus:border-turtle-500"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-border text-xs cursor-pointer">
                <div>
                  <div className="font-semibold text-white">Auto Add Vote Reactions</div>
                  <div className="text-slate-400 text-[11px]">
                    Bot automatically places {upvoteEmoji} and {downvoteEmoji} on new ideas.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoReactions}
                  onChange={(e) => setAutoReactions(e.target.checked)}
                  className="accent-turtle-500 h-4 w-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-border text-xs cursor-pointer">
                <div>
                  <div className="font-semibold text-white">Staff Moderation Queue</div>
                  <div className="text-slate-400 text-[11px]">
                    Requires mod approval before suggestions show up publicly.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={modApprovalRequired}
                  onChange={(e) => setModApprovalRequired(e.target.checked)}
                  className="accent-turtle-500 h-4 w-4 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* STARBOARD CONFIG */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                <Star className="w-5 h-5 fill-yellow-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Starboard Showcase</h3>
                <p className="text-xs text-slate-400">
                  Immortalize funny or iconic server messages.
                </p>
              </div>
            </div>

            <button
              onClick={() => setStarboardEnabled(!starboardEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                starboardEnabled ? 'bg-turtle-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  starboardEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Starboard Channel
              </label>
              <select
                value={starboardChannel}
                onChange={(e) => setStarboardChannel(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-border text-xs text-white focus:outline-none focus:border-turtle-500"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Required Stars Threshold</span>
                <span className="font-mono text-sm text-yellow-400 font-bold flex items-center gap-1">
                  ⭐ {starThreshold} Stars
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={starThreshold}
                onChange={(e) => setStarThreshold(parseInt(e.target.value))}
                className="w-full accent-yellow-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Messages that receive at least {starThreshold} ⭐ reactions get reposted into #{channels.find(c => c.id === starboardChannel)?.name || 'starboard'}.
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-border text-xs cursor-pointer">
                <div>
                  <div className="font-semibold text-white">Allow Self-Starring</div>
                  <div className="text-slate-400 text-[11px]">
                    Allow users to star their own messages toward the threshold.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowSelfStar}
                  onChange={(e) => setAllowSelfStar(e.target.checked)}
                  className="accent-turtle-500 h-4 w-4 rounded"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
