'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wrench,
  Check,
  Zap,
  Info,
  ExternalLink,
  Loader2,
  Lock,
} from 'lucide-react';

interface AuditFinding {
  id: string;
  title: string;
  description: string;
  category: 'SECURITY' | 'PERMISSIONS' | 'ENGAGEMENT' | 'AUTOMOD';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  passed: boolean;
  fixable: boolean;
  fixAction?: string;
  details?: string;
}

interface AuditData {
  score: number;
  grade: string;
  metrics: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    criticalIssues: number;
  };
  findings: AuditFinding[];
}

export default function SecurityAuditPage() {
  const { guildId } = useParams() as { guildId: string };
  const [data, setData] = useState<AuditData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ISSUES' | 'PASSED'>('ISSUES');
  const [notification, setNotification] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadAudit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/audit`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      } else {
        showFeedback(resData.error || 'Failed to scan server security.');
      }
    } catch {
      showFeedback('Network error running security audit.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [guildId]);

  const handleFix = async (action: string, itemTitle: string) => {
    setIsFixing(action);
    try {
      const res = await fetch(`/api/guilds/${guildId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (result.success) {
        showFeedback(result.message || `Fixed ${itemTitle}!`);
        loadAudit();
      } else {
        showFeedback(result.error || 'Failed to apply fix.');
      }
    } catch {
      showFeedback('Network error applying fix.');
    } finally {
      setIsFixing(null);
    }
  };

  const handleFixAll = async () => {
    setIsFixing('fix_all');
    try {
      const res = await fetch(`/api/guilds/${guildId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix_all' }),
      });
      const result = await res.json();
      if (result.success) {
        showFeedback(result.message || 'All resolvable security issues fixed!');
        loadAudit();
      } else {
        showFeedback(result.error || 'Failed to apply fixes.');
      }
    } catch {
      showFeedback('Network error applying fixes.');
    } finally {
      setIsFixing(null);
    }
  };

  const filteredFindings = data?.findings.filter((f) => {
    if (filter === 'ISSUES') return !f.passed;
    if (filter === 'PASSED') return f.passed;
    return true;
  });

  const fixableCount = data?.findings.filter((f) => !f.passed && f.fixable).length || 0;

  return (
    <div className="space-y-6 w-full pb-16">
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
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span>Security & Health Auditor</span>
            </h1>
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5">
              Lighthouse for Discord
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Automated server audit scanner detecting permission leaks, unmanaged member rights, dead channels, and missing automod guards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAudit}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0d0f17] border border-white/[0.08] hover:bg-white/[0.04] text-zinc-300 hover:text-white transition text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Re-Scan Server</span>
          </button>

          {fixableCount > 0 && (
            <button
              onClick={handleFixAll}
              disabled={isFixing !== null}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-semibold text-xs shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition disabled:opacity-50"
            >
              {isFixing === 'fix_all' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying Fixes...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Auto-Fix All ({fixableCount})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {isLoading && !data ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-xs font-mono">Running automated security audit...</span>
        </div>
      ) : data ? (
        <>
          {/* Top Score Banner */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f17] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-6">
              {/* Radial Score Gauge */}
              <div
                className={`w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0 shadow-lg ${
                  data.score >= 80
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : data.score >= 60
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                }`}
              >
                <span className="text-3xl font-extrabold tracking-tight font-mono leading-none">
                  {data.score}
                </span>
                <span className="text-[11px] font-mono mt-0.5 uppercase tracking-widest font-bold">
                  Grade {data.grade}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-white">
                  {data.score >= 85
                    ? 'Server Security is Excellent'
                    : data.score >= 70
                    ? 'Good Standing, minor fixes recommended'
                    : 'Action Required: Security Vulnerabilities Detected'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-xl">
                  {data.metrics.criticalIssues > 0
                    ? `Found ${data.metrics.criticalIssues} critical permission leak(s) that could allow malicious members to compromise server configuration.`
                    : `${data.metrics.passedChecks} of ${data.metrics.totalChecks} baseline security and governance checks passed.`}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {data.metrics.passedChecks} Passed
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {data.metrics.failedChecks} Warnings
                  </span>
                  {data.metrics.criticalIssues > 0 && (
                    <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      {data.metrics.criticalIssues} Critical
                    </span>
                  )}
                </div>
              </div>
            </div>

            {fixableCount > 0 && (
              <div className="flex flex-col items-center sm:items-end gap-1.5 border-t sm:border-t-0 sm:border-l border-white/[0.08] pt-4 sm:pt-0 sm:pl-6 shrink-0 w-full sm:w-auto">
                <span className="text-[11px] font-mono text-zinc-400">
                  {fixableCount} automated fix{fixableCount > 1 ? 'es' : ''} available
                </span>
                <button
                  onClick={handleFixAll}
                  disabled={isFixing !== null}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition shadow"
                >
                  {isFixing === 'fix_all' ? 'Applying...' : 'Apply All Fixes Now'}
                </button>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 bg-[#0d0f17] p-1 rounded-lg border border-white/[0.08]">
              <button
                onClick={() => setFilter('ISSUES')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  filter === 'ISSUES'
                    ? 'bg-white/[0.08] text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Issues ({data.metrics.failedChecks})
              </button>
              <button
                onClick={() => setFilter('PASSED')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  filter === 'PASSED'
                    ? 'bg-white/[0.08] text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Passed ({data.metrics.passedChecks})
              </button>
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  filter === 'ALL'
                    ? 'bg-white/[0.08] text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Checks ({data.metrics.totalChecks})
              </button>
            </div>

            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              Scanner v1.2 • Tortuga Engine
            </span>
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            {filteredFindings?.map((finding) => (
              <div
                key={finding.id}
                className={`rounded-xl border p-4 transition ${
                  finding.passed
                    ? 'border-white/[0.06] bg-[#0d0f17]/50'
                    : finding.severity === 'CRITICAL'
                    ? 'border-rose-500/30 bg-rose-500/[0.03]'
                    : finding.severity === 'HIGH'
                    ? 'border-amber-500/30 bg-amber-500/[0.03]'
                    : 'border-white/[0.08] bg-[#0d0f17]'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="pt-0.5 shrink-0">
                      {finding.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : finding.severity === 'CRITICAL' ? (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-semibold text-white">
                          {finding.title}
                        </h3>
                        <span className="px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06] text-[10px] font-mono">
                          {finding.category}
                        </span>
                        {!finding.passed && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                              finding.severity === 'CRITICAL'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : finding.severity === 'HIGH'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-white/[0.04] text-zinc-400'
                            }`}
                          >
                            {finding.severity}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {finding.description}
                      </p>

                      {finding.details && (
                        <p className="text-[11px] font-mono text-zinc-500 mt-1.5">
                          → {finding.details}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  {!finding.passed && finding.fixable && finding.fixAction && (
                    <button
                      onClick={() => handleFix(finding.fixAction!, finding.title)}
                      disabled={isFixing !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition text-xs font-semibold shrink-0 self-end sm:self-auto disabled:opacity-50"
                    >
                      {isFixing === finding.fixAction ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Fixing...</span>
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3 h-3" />
                          <span>Auto Fix</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredFindings?.length === 0 && (
              <div className="py-12 rounded-xl border border-dashed border-white/[0.08] text-center text-zinc-500 text-xs bg-white/[0.01]">
                No findings matching this filter.
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
