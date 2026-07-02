import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { dbWithRetry } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Liveness probe covering the database, not just page rendering. A paused
// Supabase project (free tier pauses after ~7 days of inactivity) fails DNS
// entirely, which page-level checks never notice. The daily query this endpoint
// makes also counts as project activity, preventing the auto-pause itself.
export async function GET() {
  try {
    const db = getAdminClient();
    const { error } = await dbWithRetry(() => db.from('products').select('id').limit(1), 1, 200);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, db: 'up' });
  } catch (err) {
    console.error('[health] db check failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, db: 'down' }, { status: 503 });
  }
}
