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
              <Link href="/#comparison" className="hover:text-zinc-200 transition">
                Comparison
              </Link>
              <Link href="/#support" className="hover:text-zinc-200 transition">
                Sponsor / Support
              </Link>
            </nav>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {isDashboard && (
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
          )}

          <a
            href="https://github.com/rzlfathurrahman/tortucord"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="hidden sm:inline">GitHub</span>
          </a>

          <ThemeToggle />

          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm transition"
          >
            <span>Documentation</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
