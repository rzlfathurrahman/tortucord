<div align="center">

# 🐢 Tortuga

**The 100% Free & Open-Source Discord Bot & Management Dashboard**  
*Menggabungkan fitur premium Carl-bot & MEE6 — tanpa paywall, tanpa langganan, gratis selamanya.*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2.svg)](https://discord.js.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-3982CE.svg)](https://www.prisma.io/)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-EF4444.svg)](https://turbo.build/)

</div>

---

## 🌟 Mengapa Tortuga?

Bot populer seperti **Carl-bot** dan **MEE6** mengunci fitur-fitur esensial komunitas di balik langganan **Premium ($5 - $25/bulan)** — mulai dari Auto-Role, Onboarding, Sticky Messages, Leveling, hingga Drama Watcher.

**Tortuga** hadir sebagai platform *self-hostable* mandiri berkelas enterprise dengan **seluruh fitur premium terbuka penuh dan gratis**:

| Fitur Utama | Carl-bot | MEE6 | 🐢 **Tortuga (Open-Source)** |
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

## 🎨 Linear / Raycast Aesthetic (Zero AI-Slop)

Dashboard Tortuga dirancang dengan standar desain engineering modern:
- **Single Unified Topbar**: Navigasi breadcrumb presisi (`Tortuga / [Server ▾] / Halaman`) dengan status Gateway live dan profil Discord — tanpa topbar dobel.
- **Dark Obsidian Canvas**: Palet matte gelap (`#08090d`), layer panel yang rapi (`#0e111a`), dan border ultra-crisp `border-white/[0.08]`.
- **High Data-Density**: Tata letak terstruktur tanpa badge warna-warni yang berlebihan.
- **Pixel-Perfect Discord Simulator**: Pratinjau pesan sambutan dan embed langsung sesuai tampilan aplikasi Discord asli.

---

## 🏗️ Arsitektur Monorepo

Dibangun menggunakan **Turborepo** dan **pnpm workspaces**:

```
tortuga/
├── apps/
│   ├── bot/                 # Discord Bot Core (Discord.js v14)
│   │   ├── src/events/      # Gateway listeners (guildMemberAdd, guildMemberRemove, messageCreate, reaction, voice)
│   │   ├── src/commands/    # Slash & prefix commands (/warn, /timeout, /ban, /purge, /reactionrole, dll)
│   │   ├── src/modules/     # automod, leveling, reaction-roles, sticky, starboard, suggestions, logging
│   │   └── src/index.ts
│   └── web/                 # Web Dashboard (Next.js 15 App Router + Tailwind CSS)
│       ├── src/app/         # Dashboard pages, guild settings, onboarding, roles, embeds, public leaderboard
│       ├── src/components/  # Unified Topbar, Linear Sidebar, Discord Simulator
│       └── src/lib/         # Discord REST client, session auth, types
├── packages/
│   ├── config/              # Shared enums, permissions, intents, and constants
│   ├── database/            # Prisma ORM Schema & PostgreSQL Client
│   └── tagscript/           # Sandboxed TagScript parser ({user.mention}, {server.name}, {memberCount})
├── docker-compose.yml       # Full-stack Docker (PostgreSQL 5434, Redis 6380, Bot, Web)
└── turbo.json
```

---

## 🚀 Panduan Menjalankan

### Cara 1: Menggunakan Docker Compose (Satu Perintah Siap Pakai)

Tortuga sudah dilengkapi konfigurasi Docker lengkap (Postgres + Redis + Bot + Web Standalone):

1. **Clone repository dan salin environment**:
   ```bash
   git clone https://github.com/rzlfathurrahman/tortucord.git
   cd tortuga
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
   pnpm db:generate
   pnpm db:push
   ```

4. **Jalankan Bot dan Web secara bersamaan**:
   ```bash
   pnpm dev
   ```

---

## 🛠️ Fitur yang Siap Digunakan dari Dashboard

- **👋 Onboarding & Welcome**: Pengaturan pesan sambutan publik, pesan perpisahan (goodbye), pesan privat DM ke member baru, serta template dinamis (`{user.mention}`, `{server.name}`, `{memberCount}`).
- **⚡ Auto-Role on Join**: Berikan role otomatis secara instan kepada member baru atau bot yang baru masuk server.
- **🛡️ Role Hierarchy Manager**: Tampilan visual urutan hierarki role Discord, pengecekan permission (Admin, Manage Roles, Moderate), serta indikator keamanan batas role bot.
- **🎭 Reaction Roles**: Pembuatan prompt tombol interaktif Discord yang langsung terkirim ke channel pilihan.
- **🤖 AutoMod & Drama Watcher**: Rate-limiting anti-spam dengan Redis, blokir invite Discord, proteksi mass mention, filter kata terlarang, dan review queue keributan.
- **📌 Sticky Messages**: Pesan penting yang selalu otomatis berada di paling bawah channel chat.
- **🎨 Visual Embed Builder**: Desain pengumuman dan tata tertib server dengan live preview, lalu kirim ke channel dengan satu klik tombol.
- **🏆 Leveling & Public Leaderboard**: Penghitungan XP chat/voice otomatis dengan halaman leaderboard publik yang siap dibagikan ke member.
- **📜 Audit Weblogs**: Rekap seluruh tindakan moderasi dan perubahan server secara permanen di database PostgreSQL.

---

## 📜 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT License** — 100% bebas digunakan, dimodifikasi, dan di-hosting untuk komunitas kamu!
