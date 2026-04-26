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
  const { data: purchase } = await db
    .from('purchases')
    .select('id, products(storage_path)')
    .eq('product_slug', productSlug)
    .eq('status', 'completed')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  if (!purchase) {
    return NextResponse.json({ error: 'Purchase not found' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product = (purchase as any).products as { storage_path: string } | null;
  if (!product?.storage_path) {
    return NextResponse.json({ error: 'Product not configured' }, { status: 500 });
  }

  // Generate a time-limited signed URL (1 hour)
  const { data: signedUrl, error } = await db.storage
    .from('products')
    .createSignedUrl(product.storage_path, 3600);

  if (error || !signedUrl) {
    console.error('[download] Signed URL error:', error?.message);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }

  return NextResponse.json({ url: signedUrl.signedUrl });
}
