import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AnalyticsClient } from '@/components/dashboard/analytics-client';

export const metadata = { title: 'Analytics' };

interface FeedbackRow {
  os: string;
  environment: string;
  language: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Bucket { pos: number; neg: number }

export default async function AnalyticsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  const db = getAdminClient();
  const { data } = await db
    .from('generation_feedback')
    .select('os, environment, language, rating, comment, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const entries: FeedbackRow[] = (data as FeedbackRow[]) ?? [];
  const total = entries.length;
  const positive = entries.filter((f) => f.rating === 1).length;
  const negative = total - positive;
  const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;

  const byOs: Record<string, Bucket> = {};
  const byEnv: Record<string, Bucket> = {};
  const byLang: Record<string, Bucket> = {};

  for (const f of entries) {
    const pos = f.rating === 1;
    if (!byOs[f.os]) byOs[f.os] = { pos: 0, neg: 0 };
    pos ? byOs[f.os].pos++ : byOs[f.os].neg++;
    if (!byEnv[f.environment]) byEnv[f.environment] = { pos: 0, neg: 0 };
    pos ? byEnv[f.environment].pos++ : byEnv[f.environment].neg++;
    if (f.language) {
      if (!byLang[f.language]) byLang[f.language] = { pos: 0, neg: 0 };
      pos ? byLang[f.language].pos++ : byLang[f.language].neg++;
    }
  }

  const recent = entries.slice(0, 25);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F9FAFB]">Script Generator Analytics</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">User feedback and AI prompt improvement.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Feedback', value: String(total), color: '' },
          { label: 'Positive', value: `${positive}`, sub: `${positiveRate}%`, color: 'text-emerald-400' },
          { label: 'Needs Work', value: String(negative), color: 'text-amber-400' },
          { label: 'Satisfaction', value: `${positiveRate}%`, color: positiveRate >= 70 ? 'text-emerald-400' : 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-[#0D0D0D] p-4">
            <p className="text-xs text-[#6B7280] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color || 'text-[#F9FAFB]'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Breakdowns */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <BreakdownCard
          title="By OS"
          data={byOs}
          labels={{ windows: 'Windows', linux: 'Linux', macos: 'macOS', 'cross-platform': 'Cross-Platform' }}
        />
        <BreakdownCard
          title="By Environment"
          data={byEnv}
          labels={{ 'on-premises': 'On-Prem', hybrid: 'Hybrid', cloud: 'Cloud', 'multi-cloud': 'Multi-Cloud' }}
        />
        <BreakdownCard
          title="By Language"
          data={byLang}
          labels={{ powershell: 'PowerShell', bash: 'Bash', python: 'Python', zsh: 'Zsh' }}
        />
      </div>

      {/* Recent feedback */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[#F9FAFB] mb-3">
          Recent Feedback {total > 0 && <span className="text-[#4B5563] font-normal">(last {recent.length})</span>}
        </h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-[#0D0D0D] p-8 text-center">
            <p className="text-sm text-[#6B7280]">No feedback submitted yet.</p>
            <p className="text-xs text-[#4B5563] mt-1">Ratings will appear here after users try the script generator.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((f, i) => (
              <div key={i} className="rounded-lg border border-white/6 bg-[#0D0D0D] px-4 py-3 flex items-start gap-3">
                <span className="text-base shrink-0 mt-0.5">{f.rating === 1 ? '👍' : '👎'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-[#9CA3AF]">{f.os}</span>
                    <span className="text-xs text-[#374151]">·</span>
                    <span className="text-xs text-[#9CA3AF]">{f.environment}</span>
                    {f.language && (
                      <>
                        <span className="text-xs text-[#374151]">·</span>
                        <span className="text-xs text-[#9CA3AF]">{f.language}</span>
                      </>
                    )}
                    <span className="text-xs text-[#4B5563] ml-auto">
                      {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {f.comment
                    ? <p className="text-xs text-[#D1D5DB] leading-relaxed">{f.comment}</p>
                    : <p className="text-xs text-[#374151] italic">No comment</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Prompt Improvement */}
      <AnalyticsClient negativeCount={negative} />
    </div>
  );
}

function BreakdownCard({
  title, data, labels,
}: {
  title: string;
  data: Record<string, Bucket>;
  labels: Record<string, string>;
}) {
  const entries = Object.entries(data).sort(
    (a, b) => (b[1].pos + b[1].neg) - (a[1].pos + a[1].neg)
  );

  return (
    <div className="rounded-xl border border-white/8 bg-[#0D0D0D] p-4">
      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">{title}</p>
      {entries.length === 0 ? (
        <p className="text-xs text-[#374151]">No data yet</p>
      ) : (
        <div className="space-y-2.5">
          {entries.map(([key, { pos, neg }]) => {
            const tot = pos + neg;
            const pct = Math.round((pos / tot) * 100);
            return (
              <div key={key}>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-[#9CA3AF]">{labels[key] ?? key}</span>
                  <span className="text-[#4B5563]">{tot} · {pct}% 👍</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400/60 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
