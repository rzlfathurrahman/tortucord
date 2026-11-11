'use client';

import React from 'react';
import { EmbedData } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

interface DiscordEmbedPreviewProps {
  embed: EmbedData;
  botName?: string;
  botAvatar?: string;
}

export function DiscordEmbedPreview({
  embed,
  botName = 'Tortuga',
  botAvatar = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100&auto=format&fit=crop&q=80',
}: DiscordEmbedPreviewProps) {
  const embedColor = embed.color?.startsWith('#') ? embed.color : `#${embed.color || '10b981'}`;

  // Simple parser for markdown formatting in title and description
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Split lines
    const lines = text.split('\n');
    return (
      <div className="space-y-1">
        {lines.map((line, idx) => {
          // Replace discord mentions <#id> or <@id>
          let formatted: React.ReactNode = line;

          return (
            <p key={idx} className="min-h-[1.2rem] whitespace-pre-wrap leading-relaxed text-sm text-[#dbdee1]">
              {line.split(/(<#[0-9]+>|<@[0-9]+>|\*\*.*?\*\*|\*.*?\*|`.*?`)/g).map((part, partIdx) => {
                if (part.startsWith('<#')) {
                  return (
                    <span key={partIdx} className="bg-[#5865F2]/20 text-[#c9cdfb] px-1 py-0.5 rounded text-xs font-medium cursor-pointer hover:bg-[#5865F2]/30">
                      #channel
                    </span>
                  );
                }
                if (part.startsWith('<@')) {
                  return (
                    <span key={partIdx} className="bg-[#5865F2]/20 text-[#c9cdfb] px-1 py-0.5 rounded text-xs font-medium cursor-pointer hover:bg-[#5865F2]/30">
                      @user
                    </span>
                  );
                }
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={partIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <em key={partIdx} className="italic text-slate-300">{part.slice(1, -1)}</em>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                  return <code key={partIdx} className="bg-[#1e1f22] text-[#e0e2e5] px-1 py-0.5 rounded font-mono text-xs">{part.slice(1, -1)}</code>;
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-[#2b2d31] bg-[#313338] p-4 text-[#dbdee1] shadow-2xl font-sans">
      {/* Discord Message Header */}
      <div className="flex items-start gap-4">
        <img
          src={botAvatar}
          alt={botName}
          className="h-10 w-10 rounded-full object-cover select-none ring-2 ring-turtle-500/20"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white hover:underline cursor-pointer text-[15px]">
              {botName}
            </span>
            <span className="rounded bg-[#5865F2] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white select-none">
              APP
            </span>
            <span className="text-xs text-[#949ba4] select-none">
              Today at 2:19 PM
            </span>
          </div>

          {/* Embed Container */}
          <div
            className="mt-2.5 max-w-xl rounded-md bg-[#2b2d31] text-[#dbdee1] text-sm overflow-hidden flex"
            style={{
              borderLeft: `4px solid ${embedColor}`,
            }}
          >
            <div className="p-4 flex-1 space-y-3">
              {/* Author */}
              {embed.author?.name && (
                <div className="flex items-center gap-2">
                  {embed.author.icon_url && (
                    <img
                      src={embed.author.icon_url}
                      alt={embed.author.name}
                      className="h-5 w-5 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  {embed.author.url ? (
                    <a
                      href={embed.author.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-white hover:underline flex items-center gap-1"
                    >
                      {embed.author.name}
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  ) : (
                    <span className="text-xs font-semibold text-white">
                      {embed.author.name}
                    </span>
                  )}
                </div>
              )}

              {/* Title & Thumbnail Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  {embed.title && (
                    embed.url ? (
                      <a
                        href={embed.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-semibold text-[#00a8fc] hover:underline block leading-snug"
                      >
                        {embed.title}
                      </a>
                    ) : (
                      <h4 className="text-base font-semibold text-white leading-snug">
                        {embed.title}
                      </h4>
                    )
                  )}

                  {/* Description */}
                  {embed.description && renderFormattedText(embed.description)}
                </div>

                {/* Thumbnail */}
                {embed.thumbnail?.url && (
                  <div className="shrink-0">
                    <img
                      src={embed.thumbnail.url}
                      alt="Thumbnail"
                      className="h-20 w-20 rounded-md object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Fields */}
              {embed.fields && embed.fields.length > 0 && (
                <div className="grid grid-cols-12 gap-3 pt-1">
                  {embed.fields.map((field) => (
                    <div
                      key={field.id}
                      className={field.inline ? 'col-span-12 sm:col-span-4' : 'col-span-12'}
                    >
                      <div className="text-xs font-bold text-white mb-0.5">
                        {field.name || 'Untitled Field'}
                      </div>
                      <div className="text-xs text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                        {field.value || 'No value'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Large Image */}
              {embed.image?.url && (
                <div className="pt-2">
                  <img
                    src={embed.image.url}
                    alt="Embed Attachment"
                    className="max-h-80 w-full rounded-md object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Footer & Timestamp */}
              {(embed.footer?.text || embed.timestamp) && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-[#949ba4] border-t border-[#35373c]/50">
                  {embed.footer?.icon_url && (
                    <img
                      src={embed.footer.icon_url}
                      alt="Footer icon"
                      className="h-4 w-4 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  {embed.footer?.text && <span>{embed.footer.text}</span>}
                  {embed.footer?.text && embed.timestamp && <span>•</span>}
                  {embed.timestamp && <span>Today at 2:19 PM</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
