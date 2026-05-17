import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { StatsDisplay } from '@/components/stats/stats-display';
import { buildStats } from '@/lib/stats';
import { getVisitorStats } from '@/lib/analytics';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Live Stats',
  description:
    'Real-time aggregate statistics for TaskPilot: scripts generated, satisfaction rate, global reach, and visitor analytics.',
};

export default async function StatsPage() {
  let initialData = null;
  try {
    const [scriptStats, visitorStats] = await Promise.allSettled([
      buildStats('all'),
      getVisitorStats('all'),
    ]);

    if (scriptStats.status === 'fulfilled') {
      initialData = scriptStats.value;
      initialData.visitorStats =
        visitorStats.status === 'fulfilled' ? visitorStats.value : null;
    }
  } catch (err) {
    console.error('[stats page]', err);
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-5xl">

          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9CA3AF] hover:text-white transition-colors duration-150"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>

          <div className="mb-8 text-center">
            <p className="text-xs text-emerald-400/80 uppercase tracking-widest font-mono mb-2">
              live · aggregate data
            </p>
            <h1 className="text-2xl font-semibold text-white mb-2">
              TaskPilot Usage Stats
            </h1>
            <p className="text-sm text-[#A0A0A0]">
              Scripts generated, satisfaction rate, global reach, and visitor analytics.
            </p>
          </div>

          <StatsDisplay initialData={initialData} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
