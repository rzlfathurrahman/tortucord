'use client';

import { useState, useEffect, use } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Check,
  Send,
  Power,
  Clock,
  X,
  Sparkles,
  GraduationCap,
  Users,
  Hash,
  AlertCircle,
  RefreshCw,
  Layers,
  Shield,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { DiscordChannel, DiscordRole } from '@/lib/types';

interface ScheduledMessageItem {
  id: string;
  name: string;
  channelId: string;
  cronSchedule: string;
  content: string;
  enabled: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

interface StandupConfigData {
  guildId: string;
  enabled: boolean;
  time: string;
  days: number[];
  categoryId: string | null;
  mentorRoleIds: string[];
  standupTemplate: string;
  deadlineTime: string;
  lastRunDate: string | null;
}

const CRON_PRESETS = [
  { label: 'Every Day at 09:00 AM', cron: '0 9 * * *' },
  { label: 'Every Monday at 09:00 AM', cron: '0 9 * * 1' },
  { label: 'Every 6 Hours', cron: '0 */6 * * *' },
  { label: 'Every 12 Hours', cron: '0 */12 * * *' },
  { label: 'Weekly on Friday Evening (18:00)', cron: '0 18 * * 5' },
];

const DAYS_OF_WEEK = [
  { id: 1, label: 'Senin' },
  { id: 2, label: 'Selasa' },
  { id: 3, label: 'Rabu' },
  { id: 4, label: 'Kamis' },
  { id: 5, label: 'Jumat' },
  { id: 6, label: 'Sabtu' },
  { id: 7, label: 'Minggu' },
];

export default function ScheduledDispatchesPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = use(params);

  // Active Tab: 'standup' | 'broadcasts'
  const [activeTab, setActiveTab] = useState<'standup' | 'broadcasts'>('standup');

  // Common notification
  const [notification, setNotification] = useState<string | null>(null);

  // ==========================================
  // STANDUP STATE
  // ==========================================
  const [standupLoading, setStandupLoading] = useState(true);
  const [standupSaving, setStandupSaving] = useState(false);
  const [standupTriggering, setStandupTriggering] = useState(false);
  const [forceStandup, setForceStandup] = useState(false);

  const [standupEnabled, setStandupEnabled] = useState(true);
  const [standupTime, setStandupTime] = useState('08:30');
  const [standupDays, setStandupDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [standupCategoryId, setStandupCategoryId] = useState<string>('');
  const [mentorRoleIds, setMentorRoleIds] = useState<string[]>([]);
  const [standupTemplate, setStandupTemplate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('10:00');
  const [lastRunDate, setLastRunDate] = useState<string | null>(null);

  const [categories, setCategories] = useState<DiscordChannel[]>([]);
  const [batchChannels, setBatchChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);

  // ==========================================
  // GENERAL SCHEDULES STATE
  // ==========================================
  const [schedules, setSchedules] = useState<ScheduledMessageItem[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [cronSchedule, setCronSchedule] = useState('0 9 * * *');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Load Standup Data
  const loadStandupData = async () => {
    setStandupLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/standup`);
      const data = await res.json();
      if (data.success) {
        const cfg: StandupConfigData = data.config;
        setStandupEnabled(cfg.enabled ?? true);
        setStandupTime(cfg.time || '08:30');
        setStandupDays(cfg.days || [1, 2, 3, 4, 5, 6, 7]);
        setStandupCategoryId(cfg.categoryId || data.autoDetectedCategory?.id || '');
        setMentorRoleIds(cfg.mentorRoleIds || []);
        setStandupTemplate(cfg.standupTemplate || '');
        setDeadlineTime(cfg.deadlineTime || '10:00');
        setLastRunDate(cfg.lastRunDate || null);

        if (data.categories) setCategories(data.categories);
        if (data.batchChannels) setBatchChannels(data.batchChannels);
        if (data.roles) setRoles(data.roles);
      }
    } catch {
      showFeedback('Gagal memuat konfigurasi Daily Standup.');
    } finally {
      setStandupLoading(false);
    }
  };

  // Load General Schedules
  const loadBroadcastData = async () => {
    try {
      const [sRes, gRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/schedules`),
        fetch(`/api/guilds/${guildId}`),
      ]);
      const sData = await sRes.json();
      const gData = await gRes.json();

      if (sData.schedules) setSchedules(sData.schedules);
      if (gData.channels) {
        const textChans = gData.channels.filter(
          (c: DiscordChannel) => c.type === 'text' || c.type === 'announcement'
        );
        setChannels(textChans);
        if (textChans.length > 0 && !channelId) {
          setChannelId(textChans[0].id);
        }
      }
    } catch {
      showFeedback('Failed to load broadcast schedules.');
    }
  };

  useEffect(() => {
    loadStandupData();
    loadBroadcastData();
  }, [guildId]);

  // Save Standup Config
  const handleSaveStandup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStandupSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/standup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: standupEnabled,
          time: standupTime,
          days: standupDays,
          categoryId: standupCategoryId || null,
          mentorRoleIds,
          standupTemplate,
          deadlineTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Konfigurasi Daily Standup berhasil disimpan!');
        loadStandupData();
      } else {
        showFeedback(data.error || 'Gagal menyimpan konfigurasi.');
      }
    } catch {
      showFeedback('Terjadi kesalahan jaringan.');
    } finally {
      setStandupSaving(false);
    }
  };

  // Trigger Standup Immediately
  const handleTriggerStandup = async () => {
    if (!confirm('Buka thread Daily Standup sekarang di seluruh kanal batch magang?')) return;
    setStandupTriggering(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/standup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', force: forceStandup }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.createdCount > 0) {
          showFeedback(`Berhasil membuka thread di ${data.createdCount} kanal magang!`);
        } else {
          showFeedback(data.message || 'Standup hari ini sudah dibuka sebelumnya. Gunakan opsi Force jika ingin membuka ulang.');
        }
        loadStandupData();
      } else {
        showFeedback(data.error || 'Gagal membuka Daily Standup.');
      }
    } catch {
      showFeedback('Terjadi kesalahan saat memicu standup.');
    } finally {
      setStandupTriggering(false);
    }
  };

  const toggleDay = (dayId: number) => {
    if (standupDays.includes(dayId)) {
      if (standupDays.length === 1) {
        showFeedback('Minimal pilih satu hari aktif.');
        return;
      }
      setStandupDays(standupDays.filter((d) => d !== dayId));
    } else {
      setStandupDays([...standupDays, dayId].sort());
    }
  };

  const toggleMentorRole = (roleId: string) => {
    if (mentorRoleIds.includes(roleId)) {
      setMentorRoleIds(mentorRoleIds.filter((id) => id !== roleId));
    } else {
      setMentorRoleIds([...mentorRoleIds, roleId]);
    }
  };

  // Broadcast Actions
  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !channelId || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: name.trim(),
          channelId,
          cronSchedule,
          content,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(`Created schedule "${name}"!`);
        setIsCreateOpen(false);
        setName('');
        setContent('');
        loadBroadcastData();
      } else {
        showFeedback(data.error || 'Failed to create schedule.');
      }
    } catch {
      showFeedback('Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBroadcast = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id, enabled: !current }),
      });
      if (res.ok) {
        setSchedules(schedules.map((s) => (s.id === id ? { ...s, enabled: !current } : s)));
        showFeedback(!current ? 'Schedule enabled' : 'Schedule paused');
      }
    } catch {
      showFeedback('Failed to toggle schedule.');
    }
  };

  const handleTestBroadcast = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/guilds/${guildId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', id }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Broadcast sent immediately to Discord!');
        loadBroadcastData();
      } else {
        showFeedback(data.error || 'Failed to send broadcast.');
      }
    } catch {
      showFeedback('Network error.');
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteBroadcast = async (id: string, schName: string) => {
    if (!confirm(`Delete recurring schedule "${schName}"?`)) return;
    try {
      const res = await fetch(`/api/guilds/${guildId}/schedules?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showFeedback(`Deleted "${schName}".`);
        loadBroadcastData();
      }
    } catch {
      showFeedback('Failed to delete schedule.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-500 text-black px-4 py-2.5 shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Schedules & Standup Automation
            </h2>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              Automated Dispatches
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Atur rutinitas otomatis server: Daily Standup kanal magang, pengumuman terjadwal, dan reminder cron.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#0d0f17] border border-white/[0.08] text-xs">
          <button
            onClick={() => setActiveTab('standup')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'standup'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Daily Standup Magang</span>
          </button>
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'broadcasts'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Custom Cron Broadcasts</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY STANDUP MAGANG */}
      {/* ========================================================================= */}
      {activeTab === 'standup' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Quick Overview & Trigger Action Bar */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-5 lg:p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Daily Standup Otomatis Kelompok Magang</span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                          standupEnabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {standupEnabled ? `Aktif (${standupTime} WIB)` : 'Nonaktif'}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Setiap pagi membuka thread baru di seluruh kanal batch magang privat, me-mention anggota batch & mentor, serta menyertakan format standup.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Jadwal: <strong className="text-white font-mono">{standupTime} WIB</strong></span>
                  </div>
                  <span className="text-zinc-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Target: <strong className="text-white font-mono">{batchChannels.length} kanal batch</strong></span>
                  </div>
                  <span className="text-zinc-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Hari: <strong className="text-white">{standupDays.length === 7 ? 'Setiap Hari' : standupDays.length === 5 && !standupDays.includes(6) && !standupDays.includes(7) ? 'Senin - Jumat' : `${standupDays.length} hari terpilih`}</strong></span>
                  </div>
                  {lastRunDate && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-[11px] font-mono text-zinc-500">Terakhir dijalankan: {lastRunDate}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={forceStandup}
                    onChange={(e) => setForceStandup(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Force (abaikan cek duplikat)</span>
                </label>

                <button
                  onClick={handleTriggerStandup}
                  disabled={standupTriggering}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:from-cyan-600 active:to-blue-700 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${standupTriggering ? 'animate-spin' : ''}`} />
                  <span>{standupTriggering ? 'Membuka Thread...' : 'Buka Standup Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveStandup} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Timing & Channels Settings (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Scheduler Timing */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white">Jadwal & Waktu Standup</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={standupEnabled}
                      onChange={(e) => setStandupEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    <span className="ml-2 text-xs text-zinc-300 font-medium">
                      {standupEnabled ? 'Scheduler Aktif' : 'Scheduler Nonaktif'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Jam Pembukaan Standup (WIB / UTC+7)
                    </label>
                    <input
                      type="time"
                      required
                      value={standupTime}
                      onChange={(e) => setStandupTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Default 08:30 WIB setiap pagi.</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Batas Akhir Pengisian Standup
                    </label>
                    <input
                      type="text"
                      required
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      placeholder="10:00 WIB"
                      className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Dicantumkan pada embed sebagai batas pengumpulan.</p>
                  </div>
                </div>

                {/* Days of Week */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Hari Aktif Pengiriman Standup
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStandupDays([1, 2, 3, 4, 5])}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 hover:text-cyan-400 transition"
                      >
                        Senin - Jumat Saja
                      </button>
                      <button
                        type="button"
                        onClick={() => setStandupDays([1, 2, 3, 4, 5, 6, 7])}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 hover:text-cyan-400 transition"
                      >
                        Setiap Hari
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = standupDays.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDay(d.id)}
                          className={`py-2 rounded-lg text-xs font-semibold transition flex flex-col items-center gap-1 border ${
                            isSelected
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                              : 'bg-[#08090d] border-white/[0.06] text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <span>{d.label.slice(0, 3)}</span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-cyan-400' : 'bg-transparent'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Target Category & Channels */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">Target Kategori & Kanal Batch Magang</h4>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Pilih Kategori Discord
                  </label>
                  <select
                    value={standupCategoryId}
                    onChange={(e) => setStandupCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Deteksi Otomatis (Kategori mengandung kata &quot;magang&quot;)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-zinc-400">
                      Kanal Batch yang Terdeteksi Otomatis ({batchChannels.length}):
                    </span>
                    <button
                      type="button"
                      onClick={loadStandupData}
                      className="text-[10px] text-zinc-400 hover:text-cyan-400 flex items-center gap-1 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh Kanal</span>
                    </button>
                  </div>

                  {batchChannels.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {batchChannels.map((ch) => (
                        <div
                          key={ch.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.06] text-xs font-mono text-zinc-300"
                        >
                          <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">#{ch.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-[#08090d] border border-dashed border-white/[0.08] text-center text-xs text-zinc-500">
                      Belum ada kanal batch privat terdeteksi. Gunakan command <code className="text-cyan-400">/magang batch-create</code> di Discord untuk membuat kelompok magang baru.
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Mentor Roles to Ping */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Notifikasi Role Mentor</h4>
                    <p className="text-[11px] text-zinc-400">
                      Role batch magang masing-masing otomatis di-tag. Pilih role mentor tambahan yang ingin ikut di-mention pada setiap standup.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                  {roles
                    .filter((r) => r.name !== '@everyone')
                    .map((r) => {
                      const isSelected = mentorRoleIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggleMentorRole(r.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                              : 'bg-[#08090d] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: r.color && r.color !== '#000000' ? (r.color.startsWith('#') ? r.color : `#${r.color}`) : '#71717a' }}
                          />
                          <span>@{r.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0 ml-0.5" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Right: Template & Live Discord Preview (1 Col) */}
            <div className="space-y-6">
              {/* Template Editor */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">Format Template Standup</h4>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                    Format Isian Standup (YAML / Markdown)
                  </label>
                  <textarea
                    rows={8}
                    required
                    value={standupTemplate}
                    onChange={(e) => setStandupTemplate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500"
                    placeholder="Nama: <Nama Lengkap>&#10;Tanggal: <DD/MM/YYYY>&#10;..."
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Gunakan placeholder <code className="text-cyan-400">&lt;DD/MM/YYYY&gt;</code> untuk tanggal otomatis.
                  </p>
                </div>
              </div>

              {/* Discord Live Preview */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-bold text-zinc-300">Pratinjau Thread Discord</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#2b2d31] border-l-4 border-cyan-500 text-white space-y-2 text-xs select-none">
                  <div className="font-bold text-sm text-cyan-400">
                    Daily Standup Magang • Hari Ini
                  </div>
                  <div className="text-zinc-300 text-[11px]">
                    Selamat pagi rekan-rekan magang. Thread ini dibuka otomatis untuk laporan <strong>Daily Standup</strong> hari ini.
                  </div>

                  <div className="p-2.5 rounded bg-[#1e1f22] font-mono text-[10px] text-zinc-200 whitespace-pre-wrap">
                    {standupTemplate || 'Template kosong'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                    <div>
                      <span className="text-zinc-400 block font-semibold">Batas Pengisian</span>
                      <span className="text-zinc-200">{deadlineTime || '10:00 WIB'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block font-semibold">Review Mentor</span>
                      <span className="text-zinc-200">Diskusi langsung di thread</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={standupSaving}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{standupSaving ? 'Menyimpan Perubahan...' : 'Simpan Konfigurasi Standup'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GENERAL SCHEDULED DISPATCHES */}
      {/* ========================================================================= */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Custom Broadcast Schedules</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kirim pesan otomatis berkala ke kanal Discord tertentu dengan ekspresi cron.
              </p>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Schedule</span>
            </button>
          </div>

          {/* Schedules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {schedules.map((sch) => {
              const chan = channels.find((c) => c.id === sch.channelId);
              return (
                <div
                  key={sch.id}
                  className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                    sch.enabled
                      ? 'border-white/[0.08] bg-[#0d0f17] hover:border-white/[0.16]'
                      : 'border-white/[0.04] bg-[#0d0f17]/50 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{sch.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-zinc-400">
                              #{chan?.name || sch.channelId}
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-[10px] font-mono text-emerald-400">
                              {sch.cronSchedule}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleBroadcast(sch.id, sch.enabled)}
                        className={`p-1.5 rounded-lg border transition ${
                          sch.enabled
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-white/[0.04] border-white/[0.08] text-zinc-500'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-[#08090d] border border-white/[0.06] text-xs text-zinc-300 font-mono line-clamp-3">
                      {sch.content}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {sch.lastSentAt
                          ? `Last sent: ${new Date(sch.lastSentAt).toLocaleTimeString()}`
                          : 'Never dispatched yet'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestBroadcast(sch.id)}
                        disabled={testingId === sch.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] text-xs font-medium transition disabled:opacity-50"
                      >
                        <Send className="w-3 h-3 text-emerald-400" />
                        <span>{testingId === sch.id ? 'Sending...' : 'Send Now'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteBroadcast(sch.id, sch.name)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {schedules.length === 0 && (
            <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] space-y-3">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">No scheduled broadcasts configured yet.</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-black font-semibold text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Schedule</span>
              </button>
            </div>
          )}

          {/* CREATE MODAL */}
          {isCreateOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Create Scheduled Dispatch</span>
                  </h3>
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="p-1 rounded text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateBroadcast} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Schedule Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Weekly Product Update"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Target Discord Channel
                    </label>
                    <select
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    >
                      {channels.map((c) => (
                        <option key={c.id} value={c.id}>
                          #{c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Interval / Frequency Preset
                    </label>
                    <select
                      value={cronSchedule}
                      onChange={(e) => setCronSchedule(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 mb-2"
                    >
                      {CRON_PRESETS.map((p) => (
                        <option key={p.cron} value={p.cron}>
                          {p.label} ({p.cron})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Custom Cron (e.g. 0 9 * * *)"
                      value={cronSchedule}
                      onChange={(e) => setCronSchedule(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#08090d] border border-white/[0.08] text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                      Broadcast Message Content
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Write message to send..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Schedule'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
