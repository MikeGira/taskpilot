import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { StatsDisplay } from '@/components/stats/stats-display';
import { buildStats } from '@/lib/stats';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Live Stats',
  description:
    'Real-time aggregate statistics for TaskPilot — total scripts generated, satisfaction rate, top platforms and languages.',
};

export default async function StatsPage() {
  let initialData = null;
  try {
    initialData = await buildStats('all');
  } catch (err) {
    console.error('[stats page]', err);
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      <main className="flex-1 flex flex-col items-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <p className="text-xs text-emerald-400/70 uppercase tracking-widest font-mono mb-2">
              live · aggregate data
            </p>
            <h1 className="text-2xl font-semibold text-white mb-2">
              TaskPilot Usage Stats
            </h1>
            <p className="text-sm text-[#6B7280]">
              Scripts generated, satisfaction rate, and top platforms — updated every 60 seconds.
            </p>
          </div>
          <StatsDisplay initialData={initialData} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
