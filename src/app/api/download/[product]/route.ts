import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: { product: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const productSlug = params.product;
  const db = getAdminClient();

  // Verify purchase — check by user_id OR email (covers guest-to-account upgrade)
  const conditions: string[] = [];
  if (user.id) conditions.push(`user_id.eq.${user.id}`);
  if (user.email) conditions.push(`email.eq.${user.email}`);

  const { data: purchase } = await db
    .from('purchases')
    .select('id, products(storage_path)')
    .eq('product_slug', productSlug)
    .eq('status', 'completed')
    .or(conditions.join(','))
    .maybeSingle();

  if (!purchase) {
    return NextResponse.json({ error: 'Purchase not found' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storagePath = ((purchase as any).products as { storage_path: string } | null)?.storage_path;
  if (!storagePath) {
    return NextResponse.json({ error: 'Product not configured' }, { status: 500 });
  }

  // Try multiple path variants — handles common upload path confusion
  const pathsToTry = [
    storagePath,
    storagePath.split('/').pop() ?? '',
    `products/${storagePath.split('/').pop() ?? ''}`,
  ].filter((p, i, a) => p && a.indexOf(p) === i);

  for (const p of pathsToTry) {
    const { data, error } = await db.storage.from('products').createSignedUrl(p, 3600);
    if (!error && data?.signedUrl) {
      return NextResponse.json({ url: data.signedUrl });
    }
    console.log('[download] path not found:', p, '|', error?.message);
  }

  return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
}
