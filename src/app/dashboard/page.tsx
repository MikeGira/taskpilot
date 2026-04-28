import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { DownloadCard } from '@/components/dashboard/download-card';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Downloads' };

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userId = user?.id ?? '';
  const userEmail = user?.email ?? '';

  let purchases: Record<string, unknown>[] = [];

  if (userId || userEmail) {
    try {
      const db = getAdminClient();
      const { data, error } = await db
        .from('purchases')
        .select('*, products(id, slug, name, tagline)')
        .eq('status', 'completed')
        .or(`user_id.eq.${userId},email.eq.${userEmail}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[dashboard] purchases query error:', error.message);
      } else {
        purchases = (data ?? []) as Record<string, unknown>[];
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
            <DownloadCard key={p.id as string} purchase={p} />
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
