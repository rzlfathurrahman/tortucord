'use client';

import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { DiscordEmbedPreview } from '@/components/DiscordEmbedPreview';
import { DEFAULT_SAMPLE_EMBED } from '@/lib/mock-data';
import { APP_CONFIG } from '@tortuga/config';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Shield,
  Smile,
  Pin,
  Trophy,
  ScrollText,
  Palette,
  ArrowRight,
  Zap,
  Lock,
  Unlock,
  Layers,
  HeartHandshake,
  Star,
  GitFork,
  BookOpen,
} from 'lucide-react';

export default function LandingPage() {
  const comparisonFeatures = [
    {
      feature: 'Reaction Roles Capacity',
      otherBots: 'Capped / Tiered (250 - 1,000 max)',
      tortuga: 'Unlimited (Pro & Enterprise)',
      highlight: true,
    },
    {
      feature: 'Drama Watcher & Raid Defense',
      otherBots: '❌ Locked behind $25+/mo tiers',
      tortuga: '✅ Built-in (Pro & Enterprise)',
      highlight: true,
    },
    {
      feature: 'Sticky Messages per Server',
      otherBots: '1 - 5 messages only ($5 - $25/mo)',
      tortuga: 'Unlimited channels on Pro',
      highlight: true,
    },
    {
      feature: 'Weblogs Audit Log History',
      otherBots: '24 hours - 30 days retention',
      tortuga: 'Up to Permanent Retention',
      highlight: true,
    },
    {
      feature: 'Interactive Embed Builder',
      otherBots: 'Basic / Restricted web form',
      tortuga: 'Real-Time Discord Simulator',
      highlight: false,
    },
    {
      feature: 'Timed & Verification Roles',
      otherBots: 'Limited or Paywalled',
      tortuga: 'All modes included',
      highlight: false,
    },
    {
      feature: 'Leveling & Public Leaderboards',
      otherBots: 'Rate limited / Paywalled rewards',
      tortuga: 'Real-time & Custom XP',
      highlight: false,
    },
    {
      feature: 'Managed Cloud & Dedicated SLA',
      otherBots: '❌ Generic shared rate limits',
      tortuga: '✅ 99.9% Enterprise Cloud SLA',
      highlight: true,
    },
    {
      feature: 'Pricing Model',
      otherBots: 'Expensive single-bot lock-in ($25 - $30/mo)',
      tortuga: 'Flexible SaaS (From $0 to $4.99/mo)',
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-turtle-500/30 selection:text-turtle-300">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32 bg-grid-pattern">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-turtle-500/15 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-discord-blurple/15 blur-[120px] pointer-events-none rounded-full" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Top pill badge */}
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-turtle-500/30 bg-turtle-500/10 px-4 py-1.5 text-xs font-semibold text-turtle-400 mb-8 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-turtle-400 animate-pulse" />
              <span>100% Free & Open-Source (MIT License)</span>
              <span className="bg-turtle-500/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-turtle-300">
                Self-Hostable
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> 1.2k+ Stars
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300">
                <GitFork className="w-3 h-3 text-emerald-400" /> 280+ Forks
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
              Own Your Discord Community.{' '}
              <span className="bg-gradient-to-r from-turtle-400 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
                Free Forever.
              </span>
            </h1>

            {/* Subhead */}
            <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
              Full-featured Discord bot suite released under the <strong>MIT License</strong>. 
              Zero recurring subscriptions, self-host on your own server, fork freely, or commercialize without vendor lock-in.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/docs"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl bg-turtle-600 hover:bg-turtle-500 text-white shadow-xl shadow-turtle-600/30 hover:scale-[1.02] transition duration-150"
              >
                <BookOpen className="w-4 h-4" />
                <span>Self-Host Guide (Docs)</span>
              </Link>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 transition duration-150"
              >
                <span>Go to Dashboard</span>
                <span className="text-xs bg-slate-900/80 px-2 py-0.5 rounded text-turtle-400 font-mono">
                  Manage Servers
                </span>
              </Link>
            </div>

            {/* Sub text reassurance */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                MIT License (Fork & Sell Allowed)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Docker 1-Click Deployment
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Zero Data Tracking or Paywalls
              </span>
            </div>

            {/* Interactive Live Embed Simulator Showcase */}
            <div className="mt-16 max-w-4xl mx-auto rounded-2xl border border-border/80 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-md shadow-2xl text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/60"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500/60"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500/60"></span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    live-simulator.discord • TortuCord Interactive Preview
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-turtle-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-turtle-400 border border-turtle-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-turtle-400 animate-pulse"></span>
                    Interactive Preview
                  </span>
                  <Link
                    href="/builder"
                    className="text-xs text-emerald-400 hover:underline font-medium"
                  >
                    Open Builder →
                  </Link>
                </div>
              </div>

              {/* Real simulator rendered */}
              <DiscordEmbedPreview embed={DEFAULT_SAMPLE_EMBED} />
            </div>
          </div>
        </section>

        {/* COMPARISON TABLE: Traditional Bots vs TortuCord */}
        <section id="comparison" className="py-20 border-t border-border/60 bg-slate-950/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs font-bold uppercase tracking-widest text-turtle-400 mb-2">
                Fair & Scalable Architecture
              </h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Traditional Bots vs. TortuCord Cloud
              </h3>
              <p className="mt-4 text-sm text-slate-400">
                Discover why top communities migrate to TortuCord’s managed cloud platform.
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-border bg-slate-900/60 shadow-2xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-slate-900/90 text-slate-300">
                    <th className="py-4 px-6 font-semibold w-1/2">Feature / Capability</th>
                    <th className="py-4 px-6 font-semibold text-slate-400 w-1/4">Traditional Bots (Commercial)</th>
                    <th className="py-4 px-6 font-semibold bg-turtle-950/40 text-turtle-300 border-l border-r border-turtle-500/20 w-1/4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🐢</span>
                        <span className="font-bold">TortuCord Platform</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {comparisonFeatures.map((item, idx) => (
                    <tr
                      key={idx}
                      className={item.highlight ? 'bg-slate-900/40' : 'hover:bg-slate-800/30'}
                    >
                      <td className="py-4 px-6 font-medium text-white flex items-center gap-2">
                        {item.feature}
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {item.otherBots}
                      </td>
                      <td className="py-4 px-6 font-semibold text-turtle-400 bg-turtle-950/20 border-l border-r border-turtle-500/20">
                        {item.tortuga}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Callout */}
            <div className="mt-8 rounded-xl border border-turtle-500/30 bg-gradient-to-r from-turtle-950/40 via-slate-900 to-slate-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-turtle-400" />
                  Enterprise security with frictionless subscription tiers
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Built for high-traffic Discord ecosystems that need continuous uptime and zero maintenance headaches.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-turtle-600 hover:bg-turtle-500 text-white font-semibold text-xs uppercase tracking-wider transition"
              >
                Launch Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* OPEN SOURCE & LICENSE NOTICE */}
        <section className="py-16 border-t border-border/80 bg-slate-900/40">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-turtle-500/30 bg-gradient-to-r from-turtle-950/30 via-slate-900 to-slate-900 p-8 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-turtle-500/10 text-turtle-400 border border-turtle-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    100% Free & Open-Source (MIT License)
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Freedom to Self-Host, Fork, or Commercialize
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    TortuCord is released under the permissive <strong>MIT License</strong>. Anyone is free to fork, self-host on their own hardware, modify, or even package and sell their own managed deployment. 
                    The software is provided strictly <em>as-is</em> with zero warranty, protecting the original author from any external liability.
                  </p>
                </div>
                <div className="shrink-0">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-turtle-600 hover:bg-turtle-500 text-white font-semibold text-xs transition shadow-lg shadow-turtle-600/20"
                  >
                    Open Console
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING & SUBSCRIPTION TIERS SECTION */}
        <section id="pricing" className="py-24 border-t border-border/80 bg-slate-950/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs font-bold uppercase tracking-widest text-turtle-400 mb-2">
                Predictable SaaS Pricing
              </h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Choose the Right Tier for Your Guild
              </h3>
              <p className="mt-4 text-sm text-slate-400">
                Transparent subscriptions built for high reliability. Superadmin can adjust tiers manually via the management console.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Plan 1: Starter */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-8 flex flex-col justify-between space-y-6 hover:border-border transition">
                <div className="space-y-4">
                  <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                    Starter
                  </div>
                  <h4 className="text-2xl font-bold text-white">Starter Free</h4>
                  <p className="text-xs text-slate-400">
                    Perfect for new Discord servers getting started with core moderation.
                  </p>
                  <div className="pt-2">
                    <span className="text-4xl font-extrabold text-white">$0</span>
                    <span className="text-xs text-slate-400 ml-1">/ month</span>
                  </div>
                  <ul className="space-y-3 pt-4 border-t border-border/60 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Up to 5 Reaction Role Sets (50 mappings)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      2 Sticky Message Channels
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Standard AutoMod & Anti-Spam
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      7-day Audit Log Retention
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                      Drama Watcher AI Sentiment
                    </li>
                  </ul>
                </div>

                <Link
                  href="/dashboard"
                  className="w-full py-3 text-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                >
                  Get Started Free
                </Link>
              </div>

              {/* Plan 2: Pro (Featured) */}
              <div className="rounded-2xl border-2 border-turtle-500 bg-gradient-to-b from-turtle-950/30 via-card to-card p-8 flex flex-col justify-between space-y-6 shadow-2xl relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-turtle-500 text-black text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-md">
                  Most Popular
                </div>
                <div className="space-y-4">
                  <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-turtle-500/10 text-turtle-400 border border-turtle-500/20">
                    Pro Guild
                  </div>
                  <h4 className="text-2xl font-bold text-white">Full Supercharged</h4>
                  <p className="text-xs text-slate-400">
                    Built for active gaming communities, streamers, and growing Discord hubs.
                  </p>
                  <div className="pt-2">
                    <span className="text-4xl font-extrabold text-white">$4.99</span>
                    <span className="text-xs text-slate-400 ml-1">/ month</span>
                  </div>
                  <ul className="space-y-3 pt-4 border-t border-border/60 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-turtle-400 shrink-0" />
                      <strong>Unlimited</strong> Reaction Roles (All Modes)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-turtle-400 shrink-0" />
                      <strong>Unlimited</strong> Sticky Messages
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-turtle-400 shrink-0" />
                      Drama Watcher & Raid Defense AI
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-turtle-400 shrink-0" />
                      90-Day Filterable Weblog Retention
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-turtle-400 shrink-0" />
                      Priority Discord Gateway Dispatch
                    </li>
                  </ul>
                </div>

                <a
                  href={APP_CONFIG.botInviteUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 text-center rounded-xl bg-turtle-600 hover:bg-turtle-500 text-white text-xs font-bold shadow-lg shadow-turtle-600/30 transition"
                >
                  Upgrade to Pro
                </a>
              </div>

              {/* Plan 3: Enterprise */}
              <div className="rounded-2xl border border-amber-500/30 bg-card/60 p-8 flex flex-col justify-between space-y-6 hover:border-amber-500/50 transition">
                <div className="space-y-4">
                  <div className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Enterprise
                  </div>
                  <h4 className="text-2xl font-bold text-white">Guild Prime</h4>
                  <p className="text-xs text-slate-400">
                    For enterprise servers, DAOs, multi-server networks, and e-sports teams.
                  </p>
                  <div className="pt-2">
                    <span className="text-4xl font-extrabold text-white">$14.99</span>
                    <span className="text-xs text-slate-400 ml-1">/ month</span>
                  </div>
                  <ul className="space-y-3 pt-4 border-t border-border/60 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      Covers up to <strong>3 Discord Servers</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <strong>Permanent</strong> Weblog History & Audit Trails
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      Dedicated MCP Server API & Custom Webhooks
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      Custom Branding for Bot Identity
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      99.9% Uptime SLA & Dedicated Staff Support
                    </li>
                  </ul>
                </div>

                <Link
                  href="/dashboard"
                  className="w-full py-3 text-center rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-500/30 transition"
                >
                  Contact / Manage
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CORE MODULES SPOTLIGHT */}
        <section id="features" className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs font-bold uppercase tracking-widest text-turtle-400 mb-2">
                Built For Server Owners
              </h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Every Discord Tool Under One Shell
              </h3>
              <p className="mt-4 text-sm text-slate-400">
                Crafted with love, optimized for speed, and powered by modern Next.js 15 & Discord.js.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4 hover:border-turtle-500/40 transition duration-200">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Smile className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Unlimited Reaction Roles</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Configure normal, unique, verification gates, reverse, timed, and modern Discord dropdown menus with zero limits on how many roles you assign.
                </p>
                <div className="pt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <span>Emoji & Button Modes</span> →
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4 hover:border-turtle-500/40 transition duration-200">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">AutoMod & Drama Watcher</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Block raid spam, invite floods, bad links, and detect toxic feuds before they escalate. Drama Watcher routes heated channels to mod review automatically.
                </p>
                <div className="pt-2 text-xs font-semibold text-indigo-400 flex items-center gap-1">
                  <span>Advanced Security Tier Included</span> →
                </div>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4 hover:border-turtle-500/40 transition duration-200">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Pin className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Sticky Messages Everywhere</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pin critical channel rules, FAQ alerts, and TagScript variables to the bottom of active chat rooms with smart anti-rate-limit cooldowns.
                </p>
                <div className="pt-2 text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <span>Multi-channel support</span> →
                </div>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4 hover:border-turtle-500/40 transition duration-200">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Leveling & Public Leaderboards</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Reward active chatters with XP multipliers and automatic role tier unlocks. Showcase top members on a standalone public web leaderboard!
                </p>
                <div className="pt-2 text-xs font-semibold text-sky-400 flex items-center gap-1">
                  <span>Custom XP curves & Role tiers</span> →
                </div>
              </div>

              {/* Feature 5 */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4 hover:border-turtle-500/40 transition duration-200">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Palette className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Visual Embed Builder</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Design complex announcements, rules, and guides with real-time Discord embed preview simulator. Copy JSON, TagScript, or send directly to channels.
                </p>
                <div className="pt-2 text-xs font-semibold text-rose-400 flex items-center gap-1">
                  <span>Real-time Discord renderer</span> →
                </div>
              </div>

              {/* Feature 6 */}
              <div className="rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4 hover:border-turtle-500/40 transition duration-200">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <ScrollText className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Filterable Weblogs</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Permanent audit log viewer with search, diff views for edited & deleted messages, role changes, and AutoMod intervention timestamps.
                </p>
                <div className="pt-2 text-xs font-semibold text-purple-400 flex items-center gap-1">
                  <span>Permanent moderation history</span> →
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="py-20 border-t border-border/80 bg-gradient-to-b from-card/30 to-background text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-30" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-turtle-500/10 border border-turtle-500/30 flex items-center justify-center text-3xl mx-auto shadow-xl shadow-turtle-500/10">
              🐢
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to upgrade your Discord server?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
              Add TortuCord to your community in 30 seconds. Choose flexible subscriptions or launch with our standard tier.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={APP_CONFIG.botInviteUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl bg-turtle-600 hover:bg-turtle-500 text-white shadow-xl shadow-turtle-600/30 transition"
              >
                <span>Add TortuCord to Discord</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <span>Open Web Dashboard</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
