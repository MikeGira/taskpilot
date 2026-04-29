import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { GeneratorWizard } from '@/components/generator/generator-wizard';
import { Wand2, Zap, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Script Generator',
  description: 'Generate custom IT automation scripts for your exact OS and environment — Windows, Linux, macOS, on-premises, cloud, or hybrid.',
};

export default function GeneratePage({
  searchParams,
}: {
  searchParams: { task?: string };
}) {
  const initialTask = searchParams.task ? decodeURIComponent(searchParams.task) : '';

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />

      <main className="flex-1">
        {/* Back link */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Header */}
        <section className="relative overflow-hidden border-b border-white/6">
          <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-radial from-white/3 via-transparent to-transparent pointer-events-none" />

          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-xs font-medium text-white mb-6 animate-float-up">
              <Wand2 className="h-3.5 w-3.5 animate-spin-slow" />
              AI-Powered Script Generator
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 animate-fade-in">
              Generate a script that{' '}
              <span className="text-white/70">actually works</span>{' '}
              in your environment
            </h1>

            <p className="text-[#888] max-w-xl mx-auto leading-relaxed animate-slide-up">
              Tell us your OS and infrastructure. Describe what you want to automate.
              Get a production-ready script with error handling, logging, and a config section. Ready in under 10 seconds.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-[#888]">
              {['Windows · Linux · macOS', 'On-Prem · Hybrid · Cloud · Multi-Cloud', '10 free scripts per hour', 'No sign-up required'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-white/40" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Wizard */}
        <section className="py-12 px-4 sm:px-6">
          <GeneratorWizard initialTask={initialTask} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
