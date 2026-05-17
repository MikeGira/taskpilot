import { NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';
import { getAdminClient } from '@/lib/supabase/admin';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const VALID_PATH = /^\/[a-zA-Z0-9\-_/]*$/;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`track:${ip}`, 30, 60 * 1000);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let path: string;
  try {
    const body = await request.json();
    if (
      typeof body?.path !== 'string' ||
      !VALID_PATH.test(body.path) ||
      body.path.length > 200
    ) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    path = body.path;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Geo headers set by Vercel infrastructure — not user-controllable
  const country = request.headers.get('x-vercel-ip-country')?.slice(0, 10) ?? null;
  const city = request.headers.get('x-vercel-ip-city')?.slice(0, 100) ?? null;
  const rawLang = request.headers.get('accept-language') ?? '';
  const language = rawLang.split(',')[0].split(';')[0].trim().slice(0, 20) || null;

  const ua = request.headers.get('user-agent') ?? '';
  const parser = new UAParser(ua);
  const browser = parser.getBrowser().name?.slice(0, 50) ?? null;
  const os = parser.getOS().name?.slice(0, 50) ?? null;
  const rawDevice = parser.getDevice().type;
  const device = rawDevice === 'mobile' || rawDevice === 'tablet' ? rawDevice : 'desktop';

  try {
    const db = getAdminClient();
    await db.from('page_views').insert({ path, country, city, device, browser, os, language });
  } catch (err) {
    console.error('[track]', err);
  }

  return NextResponse.json({ ok: true });
}
