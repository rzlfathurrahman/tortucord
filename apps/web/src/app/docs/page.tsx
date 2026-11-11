'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Terminal,
  Server,
  Key,
  Shield,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Database,
  Bot,
  Settings,
  Flame,
} from 'lucide-react';

export default function DocsPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const envSample = `# Discord Developer Portal Credentials
DISCORD_CLIENT_ID="your_application_id_here"
DISCORD_CLIENT_SECRET="your_client_secret_here"
DISCORD_BOT_TOKEN="your_bot_token_here"

# Web App Public URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DISCORD_CLIENT_ID="your_application_id_here"
DISCORD_REDIRECT_URI="http://localhost:3000/api/auth/discord/callback"

# Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tortucord?schema=public"

# Session & Security
JWT_SECRET="generate_a_random_32_character_string_here"
SUPERADMIN_PASSWORD="set_your_initial_dashboard_password"

# Optional Redis Cache
REDIS_URL="redis://localhost:6379"`;

  const dockerComposeSnippet = `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: tortucord-postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: tortucord
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: tortucord-redis
    restart: always
    ports:
      - "6379:6379"

volumes:
  pgdata:`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-turtle-500/30 selection:text-turtle-300">
      <Navbar />

      <main className="flex-1 py-12 lg:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="space-y-4 border-b border-border/80 pb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-turtle-500/30 bg-turtle-500/10 px-3.5 py-1 text-xs font-semibold text-turtle-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Self-Hosting Documentation & Setup Guide</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Self-Host TortuCord on Your Server
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
              TortuCord is released under the permissive <strong>MIT License</strong>. You have complete legal freedom to run it on your own hardware, fork it, adapt it, or even package and distribute it.
            </p>
          </div>

          {/* Quick Step Guide */}
          <div className="space-y-10">
            {/* Step 1: Discord Bot Setup */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-turtle-600 text-white font-bold text-sm">
                  1
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-turtle-400" />
                  Create Your Discord Bot Application
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-11">
                You need a Discord Application from the developer portal to authenticate users and power the bot runner.
              </p>
              <div className="pl-11 space-y-3">
                <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-300 space-y-2 bg-slate-900/60 border border-border/80 rounded-2xl p-5">
                  <li>
                    Go to the{' '}
                    <a
                      href="https://discord.com/developers/applications"
                      target="_blank"
                      rel="noreferrer"
                      className="text-turtle-400 underline font-medium hover:text-turtle-300 inline-flex items-center gap-1"
                    >
                      Discord Developer Portal <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and click <strong>New Application</strong>.
                  </li>
                  <li>
                    In the <strong>Bot</strong> tab, click <strong>Reset Token</strong> and copy your <code>DISCORD_BOT_TOKEN</code>.
                  </li>
                  <li>
                    Scroll down to <strong>Privileged Gateway Intents</strong> and enable all three:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-slate-400">
                      <li>Presence Intent</li>
                      <li>Server Members Intent</li>
                      <li>Message Content Intent</li>
                    </ul>
                  </li>
                  <li>
                    Go to the <strong>OAuth2</strong> tab, copy your <strong>Client ID</strong> and <strong>Client Secret</strong>.
                  </li>
                  <li>
                    Add Redirect URI under OAuth2: <code>http://localhost:3000/api/auth/discord/callback</code> (or your public domain).
                  </li>
                </ol>
              </div>
            </section>

            {/* Step 2: Environment Variables */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-turtle-600 text-white font-bold text-sm">
                  2
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-turtle-400" />
                  Configure Environment Variables (.env)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-11">
                Copy <code>.env.example</code> to <code>.env</code> in the project root and fill in your Discord credentials and database URL:
              </p>

              <div className="pl-11">
                <div className="relative rounded-2xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-200">
                  <button
                    onClick={() => copyToClipboard(envSample, 1)}
                    className="absolute right-4 top-4 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 transition"
                  >
                    {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === 1 ? 'Copied' : 'Copy .env'}</span>
                  </button>
                  <pre className="overflow-x-auto pr-16">{envSample}</pre>
                </div>
              </div>
            </section>

            {/* Step 3: Database & Services */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-turtle-600 text-white font-bold text-sm">
                  3
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-turtle-400" />
                  Run PostgreSQL with Docker Compose
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-11">
                Spin up local PostgreSQL and Redis with a single command:
              </p>

              <div className="pl-11 space-y-3">
                <div className="relative rounded-2xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-200">
                  <button
                    onClick={() => copyToClipboard(dockerComposeSnippet, 2)}
                    className="absolute right-4 top-4 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 transition"
                  >
                    {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === 2 ? 'Copied' : 'Copy docker-compose.yml'}</span>
                  </button>
                  <pre className="overflow-x-auto pr-16">{dockerComposeSnippet}</pre>
                </div>

                <div className="rounded-xl border border-border/80 bg-slate-900/80 p-3.5 font-mono text-xs text-turtle-400 flex items-center justify-between">
                  <span>docker compose up -d</span>
                  <button
                    onClick={() => copyToClipboard('docker compose up -d', 3)}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </section>

            {/* Step 4: Install & Launch */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-turtle-600 text-white font-bold text-sm">
                  4
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-turtle-400" />
                  Install Dependencies & Start
                </h2>
              </div>
              <div className="pl-11 space-y-3">
                <div className="rounded-2xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-200 space-y-2">
                  <p className="text-slate-500"># 1. Install dependencies across monorepo</p>
                  <p className="text-emerald-400">pnpm install</p>
                  <p className="text-slate-500 pt-2"># 2. Push database schema via Prisma</p>
                  <p className="text-emerald-400">cd packages/database && pnpm exec prisma db push && pnpm exec prisma generate</p>
                  <p className="text-slate-500 pt-2"># 3. Start web dashboard and bot daemon</p>
                  <p className="text-emerald-400">pnpm run dev</p>
                </div>
                <p className="text-xs text-slate-400">
                  Open <code>http://localhost:3000</code> in your browser to access the management dashboard!
                </p>
              </div>
            </section>

            {/* Legal Notice */}
            <section className="rounded-2xl border border-turtle-500/30 bg-turtle-950/20 p-6 space-y-3">
              <div className="flex items-center gap-2 text-turtle-400 font-bold text-sm">
                <Shield className="w-4 h-4" />
                <span>MIT License Terms & Liability Protection</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                TortuCord is provided <em>"as is"</em>, without warranty of any kind, express or implied. 
                You are free to use, fork, commercialize, or modify the code. 
                Under the MIT license terms, the original author bears zero liability for any data loss, downtime, or external damages incurred during self-hosting.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
