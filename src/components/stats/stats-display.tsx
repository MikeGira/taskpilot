'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { StatsResponse, VisitorStats, Period } from '@/lib/stats';
import { CountUp } from './count-up';
import { AnimatedBar } from './animated-bar';

const WorldMap = dynamic(
  () => import('./world-map').then((m) => m.WorldMap),
  { ssr: false, loading: () => <div className="aspect-[2/1] bg-[#0a0a0a] rounded-lg animate-pulse" /> }
);

const PERIODS: { value: Period; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'all' },
];

const OS_LABELS: Record<string, string> = {
  windows: 'Windows', linux: 'Linux', macos: 'macOS', 'cross-platform': 'Cross-Platform',
};
const ENV_LABELS: Record<string, string> = {
  'on-premises': 'On-Prem', hybrid: 'Hybrid', cloud: 'Cloud', 'multi-cloud': 'Multi-Cloud',
};
const LANG_LABELS: Record<string, string> = {
  powershell: 'PowerShell', bash: 'Bash', python: 'Python', yaml: 'YAML',
  terraform: 'Terraform', typescript: 'TypeScript', dockerfile: 'Dockerfile',
};
const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-3">
      {children}
    </p>
  );
}

function Card({ children, delay = 0, className = '' }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`rounded-xl border border-white/[0.18] bg-black p-5
        shadow-[0_0_28px_rgba(52,211,153,0.06)]
        hover:shadow-[0_0_40px_rgba(52,211,153,0.14)]
        transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function HeroCard({
  label,
  value,
  prefix = '',
  suffix = '',
  note,
  delay,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  note?: string;
  delay: number;
}) {
  return (
    <Card delay={delay}>
      <SectionLabel>{label}</SectionLabel>
      <p className="text-3xl font-bold font-mono text-white leading-none">
        <CountUp value={value} prefix={prefix} suffix={suffix} />
      </p>
      {note && <p className="text-xs text-[#D1D5DB] mt-2">{note}</p>}
    </Card>
  );
}

function BreakdownCard({
  label,
  items,
  labels,
  delay,
}: {
  label: string;
  items: { name: string; count: number; pct: number }[];
  labels: Record<string, string>;
  delay: number;
}) {
  return (
    <Card delay={delay}>
      <SectionLabel>{label}</SectionLabel>
      {items.length === 0 ? (
        <p className="text-xs text-[#9CA3AF]">No data yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <AnimatedBar
              key={item.name}
              label={labels[item.name] ?? item.name}
              pct={item.pct}
              delay={delay + i * 80}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function VisitorSection({ v, baseDelay }: { v: VisitorStats; baseDelay: number }) {
  return (
    <>
      {/* World map */}
      <Card delay={baseDelay} className="col-span-full">
        <SectionLabel>Global Reach</SectionLabel>
        <WorldMap
          countryCounts={v.countryCounts}
          uniqueCountries={v.uniqueCountries}
        />
      </Card>

      {/* Country top list */}
      {v.topCountries.length > 0 && (
        <Card delay={baseDelay + 100}>
          <SectionLabel>Top Countries</SectionLabel>
          <div className="space-y-3">
            {v.topCountries.map((c, i) => (
              <AnimatedBar
                key={c.code}
                label={c.name}
                pct={c.pct}
                delay={baseDelay + 100 + i * 60}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Browsers */}
      <Card delay={baseDelay + 160}>
        <SectionLabel>Browsers</SectionLabel>
        {v.topBrowsers.length === 0 ? (
          <p className="text-xs text-[#9CA3AF]">No data yet</p>
        ) : (
          <div className="space-y-3">
            {v.topBrowsers.map((b, i) => (
              <AnimatedBar
                key={b.name}
                label={b.name}
                pct={b.pct}
                delay={baseDelay + 160 + i * 60}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Devices */}
      <Card delay={baseDelay + 220}>
        <SectionLabel>Devices</SectionLabel>
        {v.topDevices.length === 0 ? (
          <p className="text-xs text-[#9CA3AF]">No data yet</p>
        ) : (
          <div className="space-y-3">
            {v.topDevices.map((d, i) => (
              <AnimatedBar
                key={d.name}
                label={DEVICE_LABELS[d.name] ?? d.name}
                pct={d.pct}
                delay={baseDelay + 220 + i * 60}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Visitor OS */}
      <Card delay={baseDelay + 280}>
        <SectionLabel>Visitor OS</SectionLabel>
        {v.topOs.length === 0 ? (
          <p className="text-xs text-[#9CA3AF]">No data yet</p>
        ) : (
          <div className="space-y-3">
            {v.topOs.map((o, i) => (
              <AnimatedBar
                key={o.name}
                label={o.name}
                pct={o.pct}
                delay={baseDelay + 280 + i * 60}
              />
            ))}
          </div>
        )}
      </Card>
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
  const v = d?.visitorStats ?? null;

  return (
    <div className="space-y-3">
      {/* Period selector + header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-[#9CA3AF]">
            live · updates every 60s
          </span>
          {loading && <span className="text-xs text-[#9CA3AF] animate-pulse">loading...</span>}
        </div>
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => selectPeriod(p.value)}
              disabled={loading}
              className={[
                'px-3 py-1 text-xs font-mono rounded border transition-all duration-150 disabled:opacity-50',
                period === p.value
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
                  : 'border-white/20 text-[#9CA3AF] hover:text-white hover:border-white/35',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {fetchError && (
        <p className="text-red-400 text-xs">{fetchError}</p>
      )}

      {d ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Hero row */}
          <HeroCard
            label="Scripts Generated"
            value={d.totalGenerated}
            note={`${d.periodCount.toLocaleString('en-US')} in selected period`}
            delay={0}
          />
          <HeroCard
            label="Satisfaction Rate"
            value={d.satisfactionRate}
            suffix="%"
            note={`${d.positiveCount} thumbs up · ${d.negativeCount} thumbs down`}
            delay={60}
          />
          <HeroCard
            label="Estimated Time Saved"
            value={d.timeSavedDollars}
            prefix="$"
            note="2 hr avg x $50/hr sysadmin rate"
            delay={120}
          />

          {/* Script breakdowns */}
          <BreakdownCard label="Script Platforms" items={d.topOs} labels={OS_LABELS} delay={200} />
          <BreakdownCard label="Environments" items={d.topEnvironments} labels={ENV_LABELS} delay={260} />
          <BreakdownCard label="Script Languages" items={d.topLanguages} labels={LANG_LABELS} delay={320} />

          {/* Visitor section */}
          {v ? (
            <VisitorSection v={v} baseDelay={400} />
          ) : (
            <Card delay={400} className="col-span-full">
              <SectionLabel>Visitor Analytics</SectionLabel>
              <p className="text-xs text-[#9CA3AF]">
                Tracking active — visitor data will appear once the first page view is recorded.
              </p>
            </Card>
          )}
        </div>
      ) : (
        !loading && (
          <div className="rounded-xl border border-white/[0.18] bg-black p-8 text-center">
            <p className="text-sm text-[#D1D5DB]">No data available yet.</p>
          </div>
        )
      )}

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <a
          href="https://ko-fi.com/mtwagirayezu"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-mono
            text-[#f0ab00] bg-[rgba(240,171,0,0.08)] border border-[rgba(240,171,0,0.2)]
            hover:bg-[rgba(240,171,0,0.15)] hover:border-[rgba(240,171,0,0.4)]
            transition-all duration-150"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
            <line x1="6" y1="1" x2="6" y2="4"/>
            <line x1="10" y1="1" x2="10" y2="4"/>
            <line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
          Support on Ko-fi
        </a>
        <p className="text-xs text-[#9CA3AF] text-center">
          Aggregate data only · No personal data stored
        </p>
      </div>
    </div>
  );
}