'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Archive,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  Check,
  FolderTree,
  Shield,
  Clock,
  User,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';

interface SnapshotItem {
  id: string;
  guildId: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: string | null;
  summary: {
    channelsCount: number;
    rolesCount: number;
    hasAutoMod: boolean;
    hasLeveling: boolean;
    hasOnboarding: boolean;
    customCommandsCount: number;
  };
}

export default function SnapshotsPage() {
  const { guildId } = useParams() as { guildId: string };
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Restore state
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/snapshots`);
      const data = await res.json();
      if (data.success && data.snapshots) {
        setSnapshots(data.snapshots);
      }
    } catch {
      showFeedback('Failed to load server snapshots.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotName.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: snapshotName, description: snapshotDesc }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback(`Snapshot "${snapshotName}" created successfully!`);
        setIsCreateOpen(false);
        setSnapshotName('');
        setSnapshotDesc('');
        loadData();
      } else {
        showFeedback(data.error || 'Failed to create snapshot.');
      }
    } catch {
      showFeedback('Network error creating snapshot.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (snap: SnapshotItem) => {
    if (
      !confirm(
        `Are you sure you want to restore snapshot "${snap.name}"?\nThis will recreate any missing channels and restore bot configuration modules.`
      )
    ) {
      return;
    }

    setRestoringId(snap.id);
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/snapshots/${snap.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(
          data.message ||
            `Restored snapshot: ${data.restored?.channelsCreated || 0} channels created.`
        );
      } else {
        showFeedback(data.error || 'Failed to restore snapshot.');
      }
    } catch {
      showFeedback('Network error during restore.');
    } finally {
      setIsRestoring(false);
      setRestoringId(null);
    }
  };

  const handleDelete = async (snap: SnapshotItem) => {
    if (!confirm(`Permanently delete snapshot "${snap.name}"?`)) return;

    try {
      const res = await fetch(`/api/guilds/${guildId}/snapshots/${snap.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(`Deleted snapshot "${snap.name}".`);
        loadData();
      } else {
        showFeedback(data.error || 'Failed to delete snapshot.');
      }
    } catch {
      showFeedback('Network error deleting snapshot.');
    }
  };

  const handleDownload = async (snap: SnapshotItem) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/snapshots/${snap.id}`);
      const data = await res.json();
      if (data.success && data.snapshot) {
        const jsonStr = JSON.stringify(data.snapshot.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tortuga-snapshot-${snap.name.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      showFeedback('Failed to download snapshot file.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-500 text-black px-4 py-2.5 shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Archive className="w-6 h-6 text-emerald-400" />
              <span>Server Snapshots & Backup Studio</span>
            </h1>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              {snapshots.length} backups
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Capture full server states (channels, categories, roles, and bot modules) and restore instantly in case of accidental deletions or raids.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-[#0d0f17] border border-white/[0.08] hover:bg-white/[0.04] text-zinc-300 hover:text-white transition"
            title="Refresh snapshots"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Snapshot</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-4">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
            Stored Snapshots
          </span>
          <span className="text-2xl font-bold text-white mt-1 block">
            {snapshots.length}
          </span>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">
            Ready for instant disaster recovery
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-4">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
            Latest Backup
          </span>
          <span className="text-sm font-semibold text-emerald-400 mt-1 block font-mono truncate">
            {snapshots.length > 0
              ? new Date(snapshots[0].createdAt).toLocaleString()
              : 'No backups yet'}
          </span>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">
            {snapshots.length > 0 ? `By ${snapshots[0].createdBy}` : 'Create your first snapshot'}
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] p-4">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
            Recovery Speed
          </span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block font-mono">
            &lt; 5s
          </span>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">
            Automated Discord API channel reconciler
          </span>
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0d0f17] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 font-mono text-[10px] uppercase">
              <tr>
                <th className="px-5 py-3">Snapshot Name</th>
                <th className="px-5 py-3">Captured Elements</th>
                <th className="px-5 py-3">Created By</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {snapshots.map((snap) => (
                <tr key={snap.id} className="hover:bg-white/[0.01] transition">
                  <td className="px-5 py-3.5">
                    <div>
                      <span className="font-semibold text-white block text-sm">
                        {snap.name}
                      </span>
                      {snap.description && (
                        <span className="text-zinc-400 text-[11px] mt-0.5 block line-clamp-1">
                          {snap.description}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06] text-[10px] font-mono">
                        {snap.summary.channelsCount} channels
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06] text-[10px] font-mono">
                        {snap.summary.rolesCount} roles
                      </span>
                      {snap.summary.hasAutoMod && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                          AutoMod
                        </span>
                      )}
                      {snap.summary.hasLeveling && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono">
                          Leveling
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-zinc-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-zinc-500" />
                      <span>{snap.createdBy || 'System'}</span>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-zinc-500 font-mono">
                    {new Date(snap.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => handleRestore(snap)}
                        disabled={isRestoring && restoringId === snap.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition text-xs font-semibold disabled:opacity-50"
                        title="Restore channels and configs from this snapshot"
                      >
                        {isRestoring && restoringId === snap.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Restoring...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownload(snap)}
                        className="p-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] transition"
                        title="Download JSON Template"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(snap)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 transition"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {snapshots.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 text-xs">
                    No snapshots created yet. Click &ldquo;Create Snapshot&rdquo; to save a backup of this server.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SNAPSHOT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-xl border border-white/[0.1] bg-[#0d0f17] p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-emerald-400" />
                <span>Create Server Snapshot</span>
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Snapshot Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pre-Event Stable Backup"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  placeholder="Reason for snapshot or changes included..."
                  value={snapshotDesc}
                  onChange={(e) => setSnapshotDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#08090d] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[11px] text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-300">What will be captured:</p>
                <ul className="list-disc list-inside space-y-0.5 text-zinc-500">
                  <li>Discord Channels & Categories hierarchy</li>
                  <li>Role configurations & permissions</li>
                  <li>AutoMod, Welcome Onboarding, Leveling & Weblogs settings</li>
                </ul>
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
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
                >
                  {isCreating ? 'Capturing...' : 'Capture Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
