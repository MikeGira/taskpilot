'use client';

import { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditCheck { name: string; status: 'pass' | 'warn' | 'fail'; detail: string; }
interface AuditResult {
  runAt: string;
  summary: { total: number; pass: number; warn: number; fail: number };
  checks: AuditCheck[];
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5',  label: 'Pass' },
  warn: { icon: AlertTriangle, color: 'text-amber-400',  border: 'border-amber-500/20',  bg: 'bg-amber-500/5',   label: 'Warn' },
  fail: { icon: XCircle,       color: 'text-red-400',    border: 'border-red-500/20',    bg: 'bg-red-500/5',     label: 'Fail' },
};

export function SecurityAuditClient() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function runAudit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/security-audit');
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? `Error ${res.status}`);
        return;
      }
      setResult(await res.json());
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#6B7280]" />
          <h2 className="text-sm font-semibold text-[#F9FAFB]">Security Self-Scan</h2>
        </div>
        <Button
          onClick={runAudit}
          disabled={loading}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          {loading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning…</>
            : <><RefreshCw className="h-3.5 w-3.5" /> {result ? 'Re-scan' : 'Run Scan'}</>
          }
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400 mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Summary bar */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total', value: result.summary.total, color: 'text-[#F9FAFB]' },
              { label: 'Pass',  value: result.summary.pass,  color: 'text-emerald-400' },
              { label: 'Warn',  value: result.summary.warn,  color: 'text-amber-400' },
              { label: 'Fail',  value: result.summary.fail,  color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/8 bg-[#0D0D0D] p-3 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-[#6B7280] mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>

          {/* Checks list */}
          <div className="space-y-2">
            {result.checks.map((check) => {
              const { icon: Icon, color, border, bg } = STATUS_CONFIG[check.status];
              return (
                <div key={check.name} className={`rounded-xl border ${border} ${bg} px-4 py-3 flex items-start gap-3`}>
                  <Icon className={`h-4 w-4 ${color} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#F9FAFB] mb-0.5">{check.name}</p>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">{check.detail}</p>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${color} shrink-0`}>
                    {STATUS_CONFIG[check.status].label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-[#4B5563] text-right">
            Scanned {new Date(result.runAt).toLocaleString()}
          </p>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="rounded-xl border border-white/8 bg-[#0D0D0D] p-8 text-center">
          <Shield className="h-8 w-8 text-[#374151] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">Run a scan to check env vars, RLS, security headers, and API reachability.</p>
        </div>
      )}
    </div>
  );
}
