<div align="center">

# TortuCord

**Open-Source Discord Bot Platform & Web Management Dashboard**  
*A modular, modern, full-stack Discord automation suite — free forever under the MIT License.*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2.svg)](https://discord.js.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-3982CE.svg)](https://www.prisma.io/)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-EF4444.svg)](https://turbo.build/)

Official Landing & Docs Repo: [rzlfathurrahman/tortucord-landing](https://github.com/rzlfathurrahman/tortucord-landing)

</div>

---

> This project was developed with a vibecoding workflow using Gemini AI.

---

## About TortuCord

The Discord ecosystem features exceptional tools like **Carl-bot** (celebrated for its battle-tested stability and comprehensive reaction role system) and **MEE6** (widely appreciated for smooth onboarding, leveling gamification, and ease of management for large communities).

TortuCord draws inspiration from the strengths of both platforms while providing a **self-hosted, open-source alternative**:
- **Full Ownership**: All server data, logs, and configurations reside privately within your self-hosted PostgreSQL and Redis instances.
- **Uncapped Flexibility**: Build unlimited reaction roles, welcome embeds, sticky messages, and automod rules without tier caps.
- **Full Source Extensibility**: Fully customizable codebase with easy webhook integration and modular bot architecture.

### Key Capabilities:
- **Auto-Role on Join**: Seamless automated assignment for both human members and bot accounts.
- **Welcome & Onboarding**: Custom rich embeds, personalized direct messages, and an interactive simulator.
- **Reaction Roles**: Unlimited emoji, interactive buttons, and select dropdown menus.
- **Timed Roles**: Auto-revoking roles based on custom durations (temporary / trial roles).
- **Sticky Messages**: Persistent messages across multi-channels powered by an integrated TagScript parser.
- **Leveling & Leaderboard**: Configurable XP multipliers, role rewards, and a clean web-based leaderboard.
- **Automod & Safety**: Redis-backed spam protection, invitation filters, word blocklists, and drama surveillance.
- **Visual Embed Builder**: Pixel-perfect Discord message simulator with live webhook dispatching.

---

## Design System

The TortuCord Dashboard is built with modern engineering principles:
- **Single Unified Topbar**: Precise breadcrumb routing (`TortuCord / [Server] / Page`) with real-time Gateway status and user profiles.
- **Dark Obsidian Canvas**: Deep matte palette (`#08090d`), layered panels (`#0e111a`), and subtle borders (`border-white/[0.08]`).
- **Pixel-Perfect Discord Simulator**: Live WYSIWYG preview matching official Discord client styling.

---

## Monorepo Architecture

This repository contains the Bot Core Engine and Web Dashboard. The public marketing landing page and docs are separated into [`tortucord-landing`](https://github.com/rzlfathurrahman/tortucord-landing).

```
tortucord/
├── apps/
│   ├── bot/                 # Discord Bot Core (Discord.js v14)
│   │   ├── src/events/      # Gateway listeners (guildMemberAdd, reaction, voice, automod)
│   │   ├── src/commands/    # Slash commands (/warn, /timeout, /ban, /purge, /reactionrole, etc.)
│   │   ├── src/modules/     # automod, leveling, reaction-roles, sticky, starboard, suggestions, tickets
│   │   └── src/index.ts
│   └── web/                 # Web Dashboard & Discord OAuth (Next.js 15 App Router)
│       ├── src/app/         # Dashboard control panel, guild settings, roles, embeds
│       ├── src/components/  # Unified Topbar, Sidebar, Discord Simulator
│       └── src/lib/         # Discord REST client, session auth, types
├── packages/
│   ├── config/              # Shared enums, permissions, intents, and constants
│   ├── database/            # Prisma ORM Schema & PostgreSQL Client
│   └── tagscript/           # Sandboxed TagScript parser ({user.mention}, {server.name}, {memberCount})
├── docker-compose.yml       # Full-stack Docker (PostgreSQL 5434, Redis 6380, Bot, Web Dashboard)
└── turbo.json
```

---

## Getting Started

### Option 1: Docker Compose (Recommended)

TortuCord provides an all-in-one containerized deployment stack:

1. Clone the repository and prepare environment variables:
   ```bash
   git clone https://github.com/rzlfathurrahman/tortucord.git
   cd tortucord
   cp .env.example .env
   ```

2. Populate Discord credentials in `.env`:
   - `DISCORD_BOT_TOKEN`: Bot token from Discord Developer Portal
   - `DISCORD_CLIENT_ID`: Application ID
   - `DISCORD_CLIENT_SECRET`: Application Client Secret
   - `DISCORD_PUBLIC_KEY`: Application Public Key

3. Configure OAuth2 Redirect URI in Discord Developer Portal:
   - Navigate to Discord Developer Portal -> Application -> OAuth2.
   - Add Redirect URI:
     ```text
     http://localhost:3000/api/auth/discord/callback
     ```
   - Save changes.

4. Launch the stack:
   ```bash
   docker compose up -d --build
   ```

5. Access the Dashboard:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option 2: Local Development

1. Install monorepo dependencies:
   ```bash
   pnpm install
   ```

2. Start PostgreSQL and Redis:
   ```bash
   docker compose up -d postgres redis
   ```

3. Synchronize database schema:
   ```bash
   pnpm --filter @tortuga/database run generate
   pnpm --filter @tortuga/database run push
   ```

4. Run the Bot and Web Dashboard:
   ```bash
   pnpm dev
   ```

---

## Sponsorship & Support

TortuCord is an independent open-source project. If you find it valuable, support development here:
- Patreon: [patreon.com/rzlfathurrahman](https://patreon.com/rzlfathurrahman)
- Ko-fi: [ko-fi.com/zalon](https://ko-fi.com/zalon)
- Saweria (QRIS / E-Wallet): [saweria.co/zalon](https://saweria.co/zalon)

---

## License

Distributed under the MIT License. Feel free to use, modify, and self-host for your community.
