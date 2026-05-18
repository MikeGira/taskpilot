import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import * as crypto from 'crypto';

const FeedbackSchema = z.object({
  triggerType: z.string().max(50).optional(),
  integrations: z.array(z.string().max(50)).max(8).optional(),
  complexity: z.string().max(20).optional(),
  rating: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().max(500).trim().optional(),
});

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 4096) return NextResponse.json({ error: 'Request too large' }, { status: 413 });

  const ip = getClientIp(request);
  const limit = rateLimit(`wf_feedback:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit reached.' }, { status: 429 });
  }

  let body: unknown;
  try { body = JSON.parse(raw); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }

  const { triggerType, integrations, complexity, rating, comment } = parsed.data;
  const ipHash = crypto.createHash('sha256').update(ip + (process.env.UNSUB_HMAC_SECRET ?? '')).digest('hex').slice(0, 16);

  try {
    const db = getAdminClient();
    await db.from('workflow_generations').insert({
      trigger_type: triggerType ?? null,
      integrations: integrations ?? null,
      complexity: complexity ?? null,
      rating,
      comment: comment ?? null,
      ip_hash: ipHash,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[workflow/feedback] DB insert error:', err);
    return NextResponse.json({ ok: true });
  }
}
