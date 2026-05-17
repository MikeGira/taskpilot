import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface HealRequest {
  action: string;
  targets?: string[];
}

const RLS_ALLOWLIST = new Set([
  'profiles', 'products', 'purchases', 'subscribers',
  'contact_requests', 'email_logs', 'generation_feedback', 'workflow_generations',
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: HealRequest;
  try {
    body = await request.json() as HealRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, targets = [] } = body;

  if (action === 'enable-rls') {
    const invalid = targets.filter((t) => !RLS_ALLOWLIST.has(t));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Table(s) not in allowlist: ${invalid.join(', ')}` }, { status: 400 });
    }

    const db = getAdminClient();
    const results: { table: string; success: boolean; message: string }[] = [];

    for (const table of targets) {
      try {
        const { error } = await db.rpc('enable_rls_on_table' as never, { target_table: table } as never);
        if (error) throw error;
        results.push({ table, success: true, message: `RLS enabled on ${table}` });
      } catch (err) {
        results.push({
          table,
          success: false,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const allOk = results.every((r) => r.success);
    return NextResponse.json({
      action,
      healed: results.filter((r) => r.success).length,
      total: targets.length,
      results,
      message: allOk
        ? `RLS enabled on ${results.length} table(s). Re-scan to confirm.`
        : `Partially applied. ${results.filter((r) => !r.success).length} table(s) failed.`,
    }, { status: allOk ? 200 : 207 });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
