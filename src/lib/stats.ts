import { getAdminClient } from '@/lib/supabase/admin';

export const VALID_PERIODS = ['24h', '7d', '30d', 'all'] as const;
export type Period = typeof VALID_PERIODS[number];

export interface StatsResponse {
  period: Period;
  totalGenerated: number;
  periodCount: number;
  satisfactionRate: number;
  positiveCount: number;
  negativeCount: number;
  topOs: { name: string; count: number; pct: number }[];
  topEnvironments: { name: string; count: number; pct: number }[];
  topLanguages: { name: string; count: number; pct: number }[];
  timeSavedHours: number;
  timeSavedDollars: number;
}

type FeedbackRow = {
  os: string;
  environment: string;
  language: string | null;
  rating: number;
  created_at: string;
};

const PERIOD_MS: Record<Period, number | null> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  'all': null,
};

function makeTopList(counts: Record<string, number>): { name: string; count: number; pct: number }[] {
  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({
      name,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

export async function buildStats(period: Period): Promise<StatsResponse> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('generation_feedback')
    .select('os, environment, language, rating, created_at')
    .order('created_at', { ascending: false })
    .limit(100000);

  if (error) throw new Error(error.message);

  const all = (data ?? []) as FeedbackRow[];
  const totalGenerated = all.length;

  const windowMs = PERIOD_MS[period];
  const now = Date.now();
  const periodCount =
    windowMs == null
      ? totalGenerated
      : all.filter((r) => now - new Date(r.created_at).getTime() <= windowMs).length;

  const positiveCount = all.filter((r) => r.rating === 1).length;
  const negativeCount = all.filter((r) => r.rating === -1).length;
  const ratedCount = positiveCount + negativeCount;
  const satisfactionRate = ratedCount > 0 ? Math.round((positiveCount / ratedCount) * 100) : 0;

  const osMap: Record<string, number> = {};
  const envMap: Record<string, number> = {};
  const langMap: Record<string, number> = {};

  for (const r of all) {
    osMap[r.os] = (osMap[r.os] ?? 0) + 1;
    envMap[r.environment] = (envMap[r.environment] ?? 0) + 1;
    if (r.language) langMap[r.language] = (langMap[r.language] ?? 0) + 1;
  }

  return {
    period,
    totalGenerated,
    periodCount,
    satisfactionRate,
    positiveCount,
    negativeCount,
    topOs: makeTopList(osMap),
    topEnvironments: makeTopList(envMap),
    topLanguages: makeTopList(langMap),
    timeSavedHours: totalGenerated * 2,
    timeSavedDollars: totalGenerated * 2 * 50,
  };
}
