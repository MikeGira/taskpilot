import { NextResponse } from 'next/server';
import { buildStats, VALID_PERIODS } from '@/lib/stats';
import type { Period } from '@/lib/stats';
import { getVisitorStats } from '@/lib/analytics';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`stats:${ip}`, 60, 60 * 1000);
  if (!limited.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('period') ?? 'all';
  if (!(VALID_PERIODS as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  const period = raw as Period;

  try {
    const [scriptResult, visitorResult] = await Promise.allSettled([
      buildStats(period),
      getVisitorStats(period),
    ]);

    if (scriptResult.status === 'rejected') {
      console.error('[stats]', scriptResult.reason);
      return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }

    const stats = scriptResult.value;
    stats.visitorStats = visitorResult.status === 'fulfilled' ? visitorResult.value : null;

    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error('[stats]', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
