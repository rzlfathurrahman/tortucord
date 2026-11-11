<div align="center">

# 🐢 TortuCord

**The 100% Free & Open-Source Discord Bot & Web Management Dashboard Platform**  
*Full-featured alternative to Carl-bot & MEE6 — zero paywalls, zero subscriptions, free forever under MIT License.*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2.svg)](https://discord.js.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-3982CE.svg)](https://www.prisma.io/)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-EF4444.svg)](https://turbo.build/)

🌐 **Official Landing & Docs Repo**: [rzlfathurrahman/tortucord-landing](https://github.com/rzlfathurrahman/tortucord-landing)

</div>

---

## 🌟 Mengapa TortuCord?

Bot populer seperti **Carl-bot** dan **MEE6** mengunci fitur-fitur esensial komunitas di balik langganan **Premium ($5 - $25/bulan)** — mulai dari Auto-Role, Onboarding, Sticky Messages, Leveling, hingga Drama Watcher.

**TortuCord** hadir sebagai platform *self-hostable* mandiri berkelas enterprise dengan **seluruh fitur premium terbuka penuh dan gratis**:

| Fitur Utama | Carl-bot | MEE6 | 🐢 **TortuCord (Open-Source)** |
| :--- | :---: | :---: | :---: |
| **Auto-Role on Join** | Limit | 🔒 **Berbayar ($12/bln)** | **✅ Gratis & Unlimited** (Human & Bot roles) |
| **Welcome & Onboarding GUI** | Parsial | 🔒 Sebagian Berbayar | **✅ Gratis** (Embed + DM + Live Simulator) |
| **Reaction Roles** | 250 limit | 250 limit | **✅ Unlimited** (Emoji, Tombol Interaktif, Select Menu) |
| **Timed Roles** | 🔒 $5/bln | ❌ | **✅ Gratis** (Cabut role otomatis setelah X jam) |
| **Sticky Messages** | 🔒 Max 5 channel | ❌ | **✅ Unlimited Channels** (Debounced anti-spam) |
| **Leveling & Leaderboard** | 🔒 $5/bln | 🔒 Sebagian Berbayar | **✅ Gratis** (XP multiplier, role reward, public web leaderboard) |
| **Drama Watcher & AutoMod** | 🔒 $25/bln | 🔒 Berbayar | **✅ Gratis** (Anti-spam Redis, anti-invite, drama review queue) |
| **Role Hierarchy GUI** | ❌ | Terbatas | **✅ Visual Hierarchy & Safety Check** |
| **Audit Weblogs** | 24 Jam | Terbatas | **✅ Permanen di PostgreSQL** dengan search & filter |
| **Visual Embed Builder** | Web basic | Web basic | **✅ Live Simulator** (Kirim langsung ke Discord channel) |
| **Biaya Bulanan** | $5 - $25/bln | $12 - $20/bln | **$0 (100% Free & Open-Source)** |

---

## 🎨 Linear / Raycast Aesthetic Dashboard

Dashboard TortuCord dirancang dengan standar desain engineering modern:
- **Single Unified Topbar**: Navigasi breadcrumb presisi (`TortuCord / [Server ▾] / Halaman`) dengan status Gateway live dan profil Discord.
- **Dark Obsidian Canvas**: Palet matte gelap (`#08090d`), layer panel yang rapi (`#0e111a`), dan border ultra-crisp `border-white/[0.08]`.
- **Pixel-Perfect Discord Simulator**: Pratinjau pesan sambutan dan embed interaktif langsung sesuai tampilan aplikasi Discord asli.

---

## 🏗️ Arsitektur Monorepo

Repository ini fokus pada **Engine Bot & Web Dashboard Control Panel**. Landing page & dokumentasi publik dipisahkan ke repo [`tortucord-landing`](https://github.com/rzlfathurrahman/tortucord-landing).

```
tortucord/
├── apps/
│   ├── bot/                 # Discord Bot Core (Discord.js v14)
│   │   ├── src/events/      # Gateway listeners (guildMemberAdd, reaction, voice, automod)
│   │   ├── src/commands/    # Slash commands (/warn, /timeout, /ban, /purge, /reactionrole, dll)
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

## 🚀 Panduan Menjalankan

### Cara 1: Menggunakan Docker Compose (Satu Perintah Siap Pakai)

TortuCord sudah dilengkapi konfigurasi Docker lengkap (Postgres + Redis + Bot + Web Standalone):

1. **Clone repository dan salin environment**:
   ```bash
   git clone https://github.com/rzlfathurrahman/tortucord.git
   cd tortucord
   cp .env.example .env
   ```

2. **Isi kredensial Discord di file `.env`**:
   - `DISCORD_BOT_TOKEN`: Token bot dari Discord Developer Portal
   - `DISCORD_CLIENT_ID`: Application ID bot kamu
   - `DISCORD_CLIENT_SECRET`: Client Secret bot kamu
   - `DISCORD_PUBLIC_KEY`: Public Key bot kamu

3. **Daftarkan OAuth2 Redirect URI di Discord Developer Portal**:
   - Buka [Discord Developer Portal](https://discord.com/developers/applications) → Pilih Bot → **OAuth2**.
   - Masukkan Redirect URI:
     ```text
     http://localhost:3000/api/auth/discord/callback
     ```
   - Klik **Save Changes**.

4. **Jalankan semua container**:
   ```bash
   docker compose up -d --build
   ```

5. **Akses Dashboard**:
   Buka browser di **[http://localhost:3000](http://localhost:3000)**!

---

### Cara 2: Menjalankan Mode Development Lokal

1. **Install dependensi monorepo**:
   ```bash
   pnpm install
   ```

2. **Jalankan Database & Redis**:
   ```bash
   docker compose up -d postgres redis
   ```

3. **Sinkronisasi Database**:
   ```bash
   pnpm --filter @tortuga/database run generate
   pnpm --filter @tortuga/database run push
   ```

4. **Jalankan Bot dan Web secara bersamaan**:
   ```bash
   pnpm dev
   ```

---

## 💖 Sponsor & Support

TortuCord adalah proyek open-source independen 100% gratis tanpa fitur berbayar. Dukung pengembangan TortuCord melalui:
- **Patreon**: [patreon.com/rzlfathurrahman](https://patreon.com/rzlfathurrahman)
- **Ko-fi**: [ko-fi.com/rzlfathurrahman](https://ko-fi.com/rzlfathurrahman)
- **Saweria (QRIS / E-Wallet)**: [saweria.co/rzlfathurrahman](https://saweria.co/rzlfathurrahman)

---

## 📜 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT License** — 100% bebas digunakan, dimodifikasi, dan di-hosting untuk komunitas kamu!
