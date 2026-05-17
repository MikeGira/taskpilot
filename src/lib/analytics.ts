import { getAdminClient } from '@/lib/supabase/admin';
import type { Period, VisitorStats } from '@/lib/stats';

export type { VisitorStats };

type PageViewRow = {
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  created_at: string;
};

const PERIOD_MS: Record<Period, number | null> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  'all': null,
};

export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway',
  DK: 'Denmark', FI: 'Finland', NZ: 'New Zealand', SG: 'Singapore', IE: 'Ireland',
  CH: 'Switzerland', AT: 'Austria', BE: 'Belgium', PL: 'Poland', IT: 'Italy',
  ES: 'Spain', PT: 'Portugal', CZ: 'Czech Republic', RO: 'Romania', HU: 'Hungary',
  IN: 'India', JP: 'Japan', KR: 'South Korea', CN: 'China', TW: 'Taiwan',
  HK: 'Hong Kong', PH: 'Philippines', VN: 'Vietnam', TH: 'Thailand', MY: 'Malaysia',
  ID: 'Indonesia', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka',
  BR: 'Brazil', MX: 'Mexico', AR: 'Argentina', CO: 'Colombia', CL: 'Chile',
  ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana', RW: 'Rwanda',
  ET: 'Ethiopia', TZ: 'Tanzania', UG: 'Uganda', EG: 'Egypt', MA: 'Morocco',
  IL: 'Israel', TR: 'Turkey', AE: 'UAE', SA: 'Saudi Arabia', UA: 'Ukraine',
  RU: 'Russia',
};

function makeTopList(counts: Record<string, number>, n = 5): { name: string; count: number; pct: number }[] {
  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({
      name,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

export async function getVisitorStats(period: Period): Promise<VisitorStats> {
  const db = getAdminClient();
  const { data, error } = await db
    .from('page_views')
    .select('country, device, browser, os, created_at')
    .order('created_at', { ascending: false })
    .limit(500000);

  if (error) throw new Error(error.message);

  const all = (data ?? []) as PageViewRow[];
  const windowMs = PERIOD_MS[period];
  const now = Date.now();
  const rows =
    windowMs == null
      ? all
      : all.filter((r) => now - new Date(r.created_at).getTime() <= windowMs);

  const countryMap: Record<string, number> = {};
  const deviceMap: Record<string, number> = {};
  const browserMap: Record<string, number> = {};
  const osMap: Record<string, number> = {};

  for (const r of rows) {
    if (r.country) countryMap[r.country] = (countryMap[r.country] ?? 0) + 1;
    if (r.device) deviceMap[r.device] = (deviceMap[r.device] ?? 0) + 1;
    if (r.browser) browserMap[r.browser] = (browserMap[r.browser] ?? 0) + 1;
    if (r.os) osMap[r.os] = (osMap[r.os] ?? 0) + 1;
  }

  const topCountriesRaw = makeTopList(countryMap, 6);
  const topCountries = topCountriesRaw.map(({ name: code, count, pct }) => ({
    code,
    name: COUNTRY_NAMES[code] ?? code,
    count,
    pct,
  }));

  return {
    totalPageViews: rows.length,
    uniqueCountries: Object.keys(countryMap).length,
    topCountries,
    topBrowsers: makeTopList(browserMap),
    topDevices: makeTopList(deviceMap),
    topOs: makeTopList(osMap),
    countryCounts: countryMap,
  };
}
