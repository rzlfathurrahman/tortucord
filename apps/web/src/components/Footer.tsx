import Link from 'next/link';
import { APP_CONFIG } from '@tortuga/config';
import { Heart, Shield, Sparkles } from 'lucide-react';
import { TortugaLogo } from '@/components/TortugaLogo';

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-slate-950/50 py-12 text-sm text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TortugaLogo className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">TortuCord</span>
            </div>
            <p className="max-w-md text-xs text-slate-400 leading-relaxed">
              The modern Discord automation platform built for creators, gaming guilds, and enterprise communities.
              Reaction roles, auto-moderation, sticky messages, leveling, and weblogs.
            </p>
            <div className="flex items-center gap-4 pt-2 text-xs text-slate-500">
              <span>TortuCord Cloud SaaS</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-turtle-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" /> High Availability Guaranteed
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider text-slate-300">
              Features
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-turtle-400 transition">
                  Reaction Roles
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-turtle-400 transition">
                  AutoMod & Drama Watcher
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-turtle-400 transition">
                  Sticky Messages
                </Link>
              </li>
              <li>
                <Link href="/builder" className="hover:text-emerald-400 transition">
                  Interactive Embed Builder
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-emerald-400 transition">
                  Server Leaderboards
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider text-slate-300">
              Community & Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/docs" className="hover:text-white transition">
                  Self-Host Documentation
                </Link>
              </li>
              <li>
                <a
                  href={APP_CONFIG.discordSupportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition"
                >
                  Discord Community
                </a>
              </li>
              <li>
                <a
                  href={APP_CONFIG.botInviteUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition"
                >
                  Invite to Server
                </a>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition">
                  Management Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} TortuCord Platform. All rights reserved. Not affiliated with Discord Inc.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Crafted with <Heart className="w-3 h-3 text-red-500 fill-current" /> for Discord communities
          </p>
        </div>
      </div>
    </footer>
  );
}
