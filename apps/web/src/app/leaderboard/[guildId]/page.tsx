'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MOCK_GUILDS, MOCK_LEADERBOARD } from '@/lib/mock-data';
import { LeaderboardMember, DiscordGuild } from '@/lib/types';
import { APP_CONFIG } from '@tortuga/config';
import {
  Trophy,
  Crown,
  Medal,
  Search,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Users,
} from 'lucide-react';

export default function PublicLeaderboardPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);
  const [guild, setGuild] = useState<DiscordGuild>(
    MOCK_GUILDS.find((g) => g.id === guildId) || MOCK_GUILDS[0]
  );
  const [members, setMembers] = useState<LeaderboardMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/leaderboard`)
      .then((res) => res.json())
      .then((data) => {
        if (data.guild) setGuild(data.guild);
        if (data.members) setMembers(data.members);
      })
      .catch(() => {});
  }, [guildId]);

  const filteredMembers = members.filter(
    (m) =>
      m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top1 = members.find((m) => m.rank === 1) || members[0];
  const top2 = members.find((m) => m.rank === 2) || members[1];
  const top3 = members.find((m) => m.rank === 3) || members[2];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/${guildId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition" />
            <span>Back to Dashboard</span>
          </Link>

          <a
            href={APP_CONFIG.botInviteUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-turtle-600/20 text-turtle-400 hover:bg-turtle-600/30 border border-turtle-500/30 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Add Tortuga to Your Server</span>
          </a>
        </div>

        {/* Server Header Banner */}
        <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card-subtle to-slate-950 p-8 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-turtle-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative space-y-4 max-w-2xl mx-auto">
            {guild.icon ? (
              <img
                src={guild.icon}
                alt={guild.name}
                className="w-20 h-20 rounded-2xl mx-auto ring-4 ring-turtle-500/30 object-cover shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl mx-auto bg-turtle-600 flex items-center justify-center font-bold text-white text-3xl shadow-xl">
                {guild.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {guild.name}
              </h1>
              <p className="text-sm text-slate-400 flex items-center justify-center gap-2">
                <span>Official Server Activity & XP Leaderboard</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {guild.memberCount.toLocaleString()} Members
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* PODIUM SHOWCASE (Top 3 Members) */}
        {members.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-6">
          {/* #2 Silver */}
          {top2 && (
            <div className="order-2 md:order-1 rounded-2xl border border-slate-700/80 bg-card/70 p-6 text-center space-y-3 relative shadow-lg">
              <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-900 font-extrabold text-sm flex items-center justify-center mx-auto shadow-md">
                2
              </div>
              <img
                src={top2.avatar}
                alt={top2.displayName}
                className="w-16 h-16 rounded-full mx-auto ring-4 ring-slate-400 object-cover"
              />
              <div>
                <h4 className="text-base font-bold text-white line-clamp-1">
                  {top2.displayName}
                </h4>
                <p className="text-xs text-slate-400">@{top2.username}</p>
              </div>
              <div className="pt-2 border-t border-border/60 flex items-center justify-around text-xs">
                <div>
                  <span className="font-bold text-turtle-400">Lvl {top2.level}</span>
                  <p className="text-[10px] text-slate-500">Level</p>
                </div>
                <div>
                  <span className="font-bold text-white">{top2.xp.toLocaleString()}</span>
                  <p className="text-[10px] text-slate-500">Total XP</p>
                </div>
              </div>
            </div>
          )}

          {/* #1 Gold */}
          {top1 && (
            <div className="order-1 md:order-2 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/20 via-card to-card p-8 text-center space-y-4 relative shadow-2xl -translate-y-2 md:-translate-y-4">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-amber-500 text-slate-950 px-3 py-1 text-xs font-extrabold shadow-lg uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 fill-current" />
                <span>Champion</span>
              </div>

              <img
                src={top1.avatar}
                alt={top1.displayName}
                className="w-20 h-20 rounded-full mx-auto ring-4 ring-amber-400 object-cover shadow-xl mt-2"
              />
              <div>
                <h4 className="text-lg font-extrabold text-white line-clamp-1">
                  {top1.displayName}
                </h4>
                <p className="text-xs text-amber-400/90 font-medium">@{top1.username}</p>
              </div>

              <div className="pt-3 border-t border-amber-500/20 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  <span className="font-bold text-amber-400 text-sm">Level {top1.level}</span>
                  <p className="text-[10px] text-slate-400">Top Rank</p>
                </div>
                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  <span className="font-bold text-white text-sm">{top1.xp.toLocaleString()}</span>
                  <p className="text-[10px] text-slate-400">Total XP</p>
                </div>
              </div>
            </div>
          )}

          {/* #3 Bronze */}
          {top3 && (
            <div className="order-3 md:order-3 rounded-2xl border border-amber-800/80 bg-card/70 p-6 text-center space-y-3 relative shadow-lg">
              <div className="w-8 h-8 rounded-full bg-amber-700 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-md">
                3
              </div>
              <img
                src={top3.avatar}
                alt={top3.displayName}
                className="w-16 h-16 rounded-full mx-auto ring-4 ring-amber-700 object-cover"
              />
              <div>
                <h4 className="text-base font-bold text-white line-clamp-1">
                  {top3.displayName}
                </h4>
                <p className="text-xs text-slate-400">@{top3.username}</p>
              </div>
              <div className="pt-2 border-t border-border/60 flex items-center justify-around text-xs">
                <div>
                  <span className="font-bold text-turtle-400">Lvl {top3.level}</span>
                  <p className="text-[10px] text-slate-500">Level</p>
                </div>
                <div>
                  <span className="font-bold text-white">{top3.xp.toLocaleString()}</span>
                  <p className="text-[10px] text-slate-500">Total XP</p>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* FULL RANKING TABLE */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Rankings Leaderboard</span>
            </h3>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-border text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-turtle-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredMembers.map((member) => {
              const progressPercent = Math.min(
                100,
                Math.round((member.currentLevelXp / member.nextLevelXp) * 100)
              );

              return (
                <div
                  key={member.id}
                  className="rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-border/60 hover:border-turtle-500/30 p-4 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  {/* Left: Rank & User Details */}
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className={`font-mono font-extrabold text-sm w-7 text-center shrink-0 ${
                        member.rank === 1
                          ? 'text-amber-400 text-base'
                          : member.rank === 2
                          ? 'text-slate-300'
                          : member.rank === 3
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}
                    >
                      #{member.rank}
                    </span>

                    <img
                      src={member.avatar}
                      alt={member.username}
                      className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-border"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">
                          {member.displayName}
                        </h4>
                        <span className="text-xs text-slate-500 hidden sm:inline truncate">
                          @{member.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-slate-500" />
                          {member.messageCount.toLocaleString()} msgs
                        </span>
                        <span>•</span>
                        <span>Active {member.lastActive}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Level & XP Bar */}
                  <div className="w-full sm:w-64 space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-turtle-400">
                        Level {member.level}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {member.currentLevelXp.toLocaleString()} / {member.nextLevelXp.toLocaleString()} XP
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
                      <div
                        className="h-full bg-gradient-to-r from-turtle-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-slate-900/40">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white">
                  {searchQuery ? 'No members found' : 'No Activity Recorded Yet'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery
                    ? `No ranking members found matching "${searchQuery}"`
                    : 'Members have not earned XP yet. Chat or join voice channels in Discord to rank up!'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
