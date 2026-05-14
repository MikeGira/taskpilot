import { NextResponse } from 'next/server';
import { buildStats, VALID_PERIODS } from '@/lib/stats';
import type { Period } from '@/lib/stats';
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

  try {
    const stats = await buildStats(raw as Period);
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=30' },
    });
  } catch (err) {
    console.error('[stats]', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
