'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DiscordUser } from '@/lib/types';
import { APP_CONFIG } from '@tortuga/config';
import { Sparkles, ExternalLink, LogIn, LogOut, ChevronDown, Search } from 'lucide-react';
import { TortugaLogo } from '@/components/TortugaLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Navbar() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard');

  const [user, setUser] = useState<DiscordUser | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/discord')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#08090d]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-2.5 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/15 transition duration-200">
              <TortugaLogo className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-zinc-100 group-hover:text-white transition">
                TortuCord
              </span>
              <span className="text-[10px] text-zinc-500 -mt-0.5 font-medium">Discord Cloud Platform</span>
            </div>
          </Link>

          {/* Navigation links for marketing pages */}
          {!isDashboard && (
            <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-zinc-400">
              <Link href="/#features" className="hover:text-zinc-200 transition">
                Features
              </Link>
              <Link href="/docs" className="hover:text-zinc-200 transition">
                Documentation
              </Link>
              <Link href="/#pricing" className="hover:text-zinc-200 transition">
                Pricing
              </Link>
              <Link href="/#comparison" className="hover:text-zinc-200 transition">
                Comparison
              </Link>
              <Link href="/dashboard" className="hover:text-zinc-200 transition">
                Dashboard
              </Link>
            </nav>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition shadow-sm"
            title="Search or jump to... (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline text-zinc-300">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
              ⌘K
            </kbd>
          </button>

          <ThemeToggle />

          <a
            href={APP_CONFIG.botInviteUrl()}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-turtle-400" />
            <span>Invite Bot</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* Direct link to dashboard instead of sign in button on landing page */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm transition"
          >
            <span>Dashboard</span>
            <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
          </Link>
        </div>
      </div>
    </header>
  );
}
