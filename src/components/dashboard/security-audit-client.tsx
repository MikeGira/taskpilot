'use client';

import { useState } from 'react';
import {
  Shield, CheckCircle2, AlertTriangle, XCircle,
  Loader2, RefreshCw, Wrench, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  healable?: boolean;
  healAction?: string;
  healTargets?: string[];
  fixSteps?: string[];
}

interface AuditResult {
  runAt: string;
  summary: { total: number; pass: number; warn: number; fail: number };
  checks: AuditCheck[];
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/45', bg: 'bg-emerald-500/5',  label: 'Pass' },
  warn: { icon: AlertTriangle, color: 'text-amber-400',  border: 'border-amber-500/45',  bg: 'bg-amber-500/5',   label: 'Warn' },
  fail: { icon: XCircle,       color: 'text-red-400',    border: 'border-red-500/45',    bg: 'bg-red-500/5',     label: 'Fail' },
};

function CheckRow({ check, expanded, onToggle }: {
  check: AuditCheck;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { icon: Icon, color, border, bg } = STATUS_CONFIG[check.status];
  const hasExtra = !!(check.fixSteps?.length);

  return (
    <div className={`rounded-xl border ${border} ${bg} overflow-hidden`}>
      <div className="px-4 py-3 flex items-start gap-3">
        <Icon className={`h-4 w-4 ${color} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#F9FAFB] mb-0.5">{check.name}</p>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">{check.detail}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {check.healable && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/45 px-1.5 py-0.5 rounded">
              Auto-fix
            </span>
          )}
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${color}`}>
            {STATUS_CONFIG[check.status].label}
          </span>
          {hasExtra && (
            <button
              type="button"
              onClick={onToggle}
              className="text-[#9CA3AF] hover:text-[#9CA3AF] transition-colors"
              aria-label="Toggle fix steps"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {expanded && check.fixSteps && (
        <div className="px-4 pb-3 border-t border-white/18 pt-3">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">How to fix</p>
          <ol className="space-y-1.5">
            {check.fixSteps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-[#9CA3AF]">
                <span className="text-[#4B5563] shrink-0 font-mono">{i + 1}.</span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

interface HealResult {
  table: string;
  success: boolean;
  message: string;
}

export function SecurityAuditClient() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
  const [healing, setHealing] = useState(false);
  const [healMessage, setHealMessage] = useState('');
  const [healResults, setHealResults] = useState<HealResult[]>([]);

  async function runAudit() {
    setLoading(true);
    setError('');
    setHealMessage('');
    setHealResults([]);
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

  async function healAll() {
    if (!result) return;
    const healable = result.checks.filter((c) => c.healable && c.healAction && c.healTargets?.length);
    if (healable.length === 0) return;

    setHealing(true);
    setHealMessage('');
    setHealResults([]);

    const allResults: HealResult[] = [];

    for (const check of healable) {
      try {
        const res = await fetch('/api/admin/security-heal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: check.healAction, targets: check.healTargets }),
        });
        const data = await res.json() as { results?: HealResult[]; message?: string };
        if (data.results) allResults.push(...data.results);
      } catch {
        allResults.push({ table: check.name, success: false, message: 'Network error' });
      }
    }

    setHealResults(allResults);
    setHealMessage(
      allResults.every((r) => r.success)
        ? 'All fixes applied. Re-scanning now...'
        : 'Some fixes applied with errors. Check results below.'
    );
    setHealing(false);
    await runAudit();
  }

  function toggleCheck(name: string) {
    setExpandedChecks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const autoFixable = result?.checks.filter((c) => c.healable && c.healTargets?.length) ?? [];
  const manualFixes = result?.checks.filter(
    (c) => (c.status === 'warn' || c.status === 'fail') && !c.healable && c.fixSteps?.length
  ) ?? [];
  const hasIssues = (result?.summary.warn ?? 0) + (result?.summary.fail ?? 0) > 0;

  return (
    <div className="mt-8 space-y-6">

      {/* Self-Scan */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#9CA3AF]" />
            <h2 className="text-sm font-semibold text-[#F9FAFB]">Security Self-Scan</h2>
          </div>
          <Button
            type="button"
            onClick={runAudit}
            disabled={loading}
            size="sm"
            variant="outline"
            className="gap-1.5"
          >
            {loading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning</>
              : <><RefreshCw className="h-3.5 w-3.5" /> {result ? 'Re-scan' : 'Run Scan'}</>
            }
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/45 bg-red-500/5 px-4 py-3 text-xs text-red-400 mb-4">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total', value: result.summary.total, color: 'text-[#F9FAFB]' },
                { label: 'Pass',  value: result.summary.pass,  color: 'text-emerald-400' },
                { label: 'Warn',  value: result.summary.warn,  color: 'text-amber-400' },
                { label: 'Fail',  value: result.summary.fail,  color: 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-3xl border border-white/22 bg-black p-3 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {result.checks.map((check) => (
                <CheckRow
                  key={check.name}
                  check={check}
                  expanded={expandedChecks.has(check.name)}
                  onToggle={() => toggleCheck(check.name)}
                />
              ))}
            </div>

            <p className="text-[10px] text-[#4B5563] text-right">
              Scanned {new Date(result.runAt).toLocaleString()}
            </p>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="rounded-3xl border border-white/22 bg-black p-8 text-center">
            <Shield className="h-8 w-8 text-[#374151] mx-auto mb-3" />
            <p className="text-sm text-[#9CA3AF]">Run a scan to check env vars, RLS, security headers, and API reachability.</p>
          </div>
        )}
      </div>

      {/* Self-Heal */}
      {result && hasIssues && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-4 w-4 text-[#9CA3AF]" />
            <h2 className="text-sm font-semibold text-[#F9FAFB]">Security Self-Heal</h2>
          </div>

          {/* Auto-fixable */}
          {autoFixable.length > 0 && (
            <div className="rounded-xl border border-emerald-500/45 bg-emerald-500/5 p-4 mb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-400 mb-0.5">Auto-fix available</p>
                    <p className="text-xs text-[#9CA3AF]">
                      {autoFixable.map((c) => `${c.name} (${c.healTargets?.join(', ')})`).join('; ')} can be fixed automatically.
                    </p>
                    {healResults.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {healResults.map((r) => (
                          <li key={r.table} className={`text-[11px] ${r.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {r.success ? 'Fixed' : 'Failed'}: {r.message}
                          </li>
                        ))}
                      </ul>
                    )}
                    {healMessage && !healResults.length && (
                      <p className="text-xs text-emerald-400 mt-1">{healMessage}</p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={healAll}
                  disabled={healing || loading}
                  size="sm"
                  className="shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                >
                  {healing
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Fixing</>
                    : <><Zap className="h-3.5 w-3.5" /> Apply Fixes</>
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Manual fixes */}
          {manualFixes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-1">Manual action required</p>
              {manualFixes.map((check) => (
                <CheckRow
                  key={`heal-${check.name}`}
                  check={check}
                  expanded={expandedChecks.has(`heal-${check.name}`)}
                  onToggle={() => toggleCheck(`heal-${check.name}`)}
                />
              ))}
            </div>
          )}

          {autoFixable.length === 0 && manualFixes.length === 0 && (
            <div className="rounded-3xl border border-white/22 bg-black px-4 py-3 text-xs text-[#9CA3AF]">
              No automated fixes available for the current warnings. Expand each check for step-by-step instructions.
            </div>
          )}
        </div>
      )}

      {/* All clear */}
      {result && !hasIssues && (
        <div className="rounded-xl border border-emerald-500/45 bg-emerald-500/5 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400 font-medium">All checks passed. No remediation needed.</p>
        </div>
      )}
    </div>
  );
}
