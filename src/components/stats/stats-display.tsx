'use client';

import { useState, useCallback } from 'react';
import type { StatsResponse, Period } from '@/lib/stats';

const PERIODS: { value: Period; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'all' },
];

const OS_LABELS: Record<string, string> = {
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS',
  'cross-platform': 'Cross-Platform',
};

const ENV_LABELS: Record<string, string> = {
  'on-premises': 'On-Prem',
  hybrid: 'Hybrid',
  cloud: 'Cloud',
  'multi-cloud': 'Multi-Cloud',
};

const LANG_LABELS: Record<string, string> = {
  powershell: 'PowerShell',
  bash: 'Bash',
  python: 'Python',
  yaml: 'YAML',
  terraform: 'Terraform',
  typescript: 'TypeScript',
  dockerfile: 'Dockerfile',
  puppet: 'Puppet',
  groovy: 'Groovy',
  bicep: 'Bicep',
  json: 'JSON',
};

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function bar(pct: number, width = 10): string {
  const filled = Math.min(width, Math.max(0, Math.round((pct / 100) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[9rem_1fr] gap-x-3 items-start">
      <span className="text-[#4B5563] uppercase tracking-widest text-[10px] pt-[3px] leading-5 shrink-0">
        {label}
      </span>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return (
    <div className="leading-5 flex items-baseline gap-0">
      <span className="text-white/20 mr-2 shrink-0">|</span>
      <span className="flex flex-wrap items-baseline gap-x-1">{children}</span>
    </div>
  );
}

function BreakdownLine({
  items,
  labels,
}: {
  items: { name: string; count: number; pct: number }[];
  labels: Record<string, string>;
}) {
  if (items.length === 0) return <span className="text-[#374151]">no data yet</span>;
  return (
    <>
      {items.map((item, i) => (
        <span key={item.name} className="whitespace-nowrap">
          <span className="text-[#D1D5DB]">{labels[item.name] ?? item.name}</span>
          <span className="text-[#6B7280]"> {item.pct}%</span>
          {i < items.length - 1 && <span className="text-[#374151]">{'  '}</span>}
        </span>
      ))}
    </>
  );
}

export function StatsDisplay({ initialData }: { initialData: StatsResponse | null }) {
  const [period, setPeriod] = useState<Period>(initialData?.period ?? 'all');
  const [data, setData] = useState<StatsResponse | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const selectPeriod = useCallback(
    async (p: Period) => {
      if (p === period || loading) return;
      setPeriod(p);
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/stats?period=${p}`);
        if (!res.ok) throw new Error('request failed');
        setData((await res.json()) as StatsResponse);
      } catch {
        setFetchError('Could not load stats. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [period, loading],
  );

  const d = data;

  return (
    <div className="font-mono">
      <div className="rounded-xl border border-white/10 bg-[#0D0D0D] overflow-hidden shadow-2xl">
        {/* macOS-style title bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/8 bg-[#111]">
          <div className="flex gap-1.5">
            <span className="block w-3 h-3 rounded-full bg-[#FF5F56]" />
            <span className="block w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <span className="block w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>
          <span className="text-xs text-[#4B5563] ml-auto">taskpilot — stats</span>
        </div>

        {/* Terminal body */}
        <div className="px-5 py-5 text-sm text-[#F9FAFB] space-y-4">
          {/* Prompt */}
          <div className="leading-5">
            <span className="text-emerald-400 select-none">$ </span>
            <span className="text-[#9CA3AF]">taskpilot stats</span>
            <span className="text-[#6B7280]"> --period </span>
            <span className="text-emerald-400">{period}</span>
            {loading && (
              <span className="text-[#6B7280] ml-2 animate-pulse">·</span>
            )}
          </div>

          {fetchError && (
            <p className="text-red-400 text-xs">{fetchError}</p>
          )}

          {d && (
            <div className="space-y-3">
              {/* Scripts Generated */}
              <Row label="GENERATED">
                <Line>
                  <span className="text-emerald-400 font-semibold">{fmt(d.totalGenerated)}</span>
                  <span className="text-[#6B7280]">total</span>
                </Line>
                <Line>
                  <span className="text-white">{fmt(d.periodCount)}</span>
                  <span className="text-[#6B7280]">
                    {period === 'all' ? 'all time' : `last ${period}`}
                  </span>
                </Line>
              </Row>

              {/* Satisfaction Rate */}
              <Row label="SATISFACTION">
                <Line>
                  <span className="text-emerald-400/60">{bar(d.satisfactionRate)}</span>
                  <span className="text-white font-semibold ml-2">{d.satisfactionRate}%</span>
                </Line>
                <Line>
                  <span className="text-emerald-400">{fmt(d.positiveCount)}</span>
                  <span className="text-[#6B7280]">👍</span>
                  <span className="text-[#9CA3AF] ml-2">{fmt(d.negativeCount)}</span>
                  <span className="text-[#6B7280]">👎</span>
                </Line>
              </Row>

              {/* Platform/Env/Language breakdowns */}
              <Row label="PLATFORMS">
                <Line>
                  <BreakdownLine items={d.topOs} labels={OS_LABELS} />
                </Line>
              </Row>

              <Row label="ENVIRONMENTS">
                <Line>
                  <BreakdownLine items={d.topEnvironments} labels={ENV_LABELS} />
                </Line>
              </Row>

              <Row label="LANGUAGES">
                <Line>
                  <BreakdownLine items={d.topLanguages} labels={LANG_LABELS} />
                </Line>
              </Row>

              {/* Time Saved */}
              <Row label="TIME SAVED">
                <Line>
                  <span className="text-emerald-400">~{fmt(d.timeSavedHours)} hrs</span>
                  <span className="text-[#6B7280] mx-1">≈</span>
                  <span className="text-white font-semibold">${fmt(d.timeSavedDollars)}</span>
                </Line>
                <Line>
                  <span className="text-[#4B5563] text-xs">2 hr avg × $50/hr sysadmin rate</span>
                </Line>
              </Row>
            </div>
          )}

          {!d && !loading && !fetchError && (
            <p className="text-[#4B5563]">No data available yet.</p>
          )}

          {/* Period selector */}
          <div className="border-t border-white/6 pt-3 flex items-center gap-1.5 flex-wrap">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => selectPeriod(p.value)}
                disabled={loading}
                className={[
                  'px-3 py-1 text-xs rounded border transition-all duration-150 disabled:opacity-50',
                  period === p.value
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
                    : 'border-white/10 text-[#6B7280] hover:text-[#9CA3AF] hover:border-white/20',
                ].join(' ')}
              >
                [{p.label}]
              </button>
            ))}
            <span className="ml-auto text-[11px] text-[#374151]">
              {loading ? 'loading...' : 'cache: 60s'}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-[#374151] mt-3 text-center">
        Aggregate data only · Refreshes every 60s · No personal data stored
      </p>
    </div>
  );
}
