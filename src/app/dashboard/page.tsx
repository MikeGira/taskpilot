import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { DownloadCard } from '@/components/dashboard/download-card';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Downloads' };

async function getSignedUrl(db: ReturnType<typeof getAdminClient>, storagePath: string): Promise<string | null> {
  const pathsToTry = [
    storagePath,
    storagePath.split('/').pop() ?? '',
    `products/${storagePath.split('/').pop() ?? ''}`,
  ].filter((p, i, a) => p && a.indexOf(p) === i);

  for (const p of pathsToTry) {
    const { data, error } = await db.storage.from('products').createSignedUrl(p, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  return null;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userEmail = user?.email ?? '';
  const userId = user?.id ?? '';

  // Fetch all completed purchases for this user — already verified server-side
  let purchases: (Record<string, unknown> & { downloadUrl: string | null })[] = [];

  if (userEmail || userId) {
    try {
      const db = getAdminClient();
      const conditions: string[] = [];
      if (userId) conditions.push(`user_id.eq.${userId}`);
      if (userEmail) conditions.push(`email.eq.${userEmail}`);

      const { data, error } = await db
        .from('purchases')
        .select('*, products(id, slug, name, tagline, storage_path)')
        .eq('status', 'completed')
        .or(conditions.join(','))
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[dashboard] purchases error:', error.message);
      } else {
        // Generate signed download URLs server-side — no separate API call needed
        purchases = await Promise.all(
          (data ?? []).map(async (p) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const storagePath = (p as any).products?.storage_path as string | undefined;
            const downloadUrl = storagePath ? await getSignedUrl(db, storagePath) : null;
            return { ...(p as Record<string, unknown>), downloadUrl };
          })
        );
      }
    } catch (err) {
      console.error('[dashboard] unexpected error:', err);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F9FAFB]">Your downloads</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          {purchases.length ? 'Click Download to get your files.' : 'No purchases yet.'}
        </p>
      </div>

      {purchases.length > 0 ? (
        <div className="space-y-4">
          {purchases.map((p) => (
            <DownloadCard key={p.id as string} purchase={p} downloadUrl={p.downloadUrl} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-[#0D0D0D] p-10 text-center">
          <ShoppingBag className="h-10 w-10 text-[#4B5563] mx-auto mb-4" />
          <h2 className="font-semibold text-[#F9FAFB] mb-2">No purchases yet</h2>
          <p className="text-sm text-[#9CA3AF] mb-6">
            Get the IT Helpdesk Automation Starter Kit and automate your most repetitive tasks.
          </p>
          <Button asChild>
            <Link href="/checkout">Get the Kit $19</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
