import Link from 'next/link';
import { CheckCircle2, Download, ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata = { title: 'Purchase Complete' };

const KIT_HIGHLIGHTS = [
  '9 production-ready PowerShell scripts',
  'Config template with 6 fields to edit',
  'Windows Task Scheduler XML',
  'Step-by-step setup guide',
];

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id ?? '';

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full">

          {/* Success icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/8 border border-white/20 mx-auto mb-8">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-3">You&apos;re all set!</h1>
            <p className="text-[#A0A0A0] leading-relaxed mb-2">
              Your purchase is confirmed. Download your kit right now, no account needed.
            </p>
            <p className="text-sm text-[#A0A0A0]">
              A backup download link was also sent to your inbox.
            </p>
          </div>

          {/* What's included */}
          <div className="rounded-xl border border-white/20 bg-white/3 p-5 mb-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 border border-white/15">
                <Package className="h-4 w-4 text-white/70" />
              </div>
              <p className="text-sm font-semibold text-white">IT Helpdesk Starter Kit</p>
            </div>
            <ul className="space-y-2">
              {KIT_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-[#9CA3AF]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-white/50" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            {sessionId ? (
              <Button asChild size="lg" className="flex-1">
                <a href={`/api/download/session?session_id=${encodeURIComponent(sessionId)}`}>
                  <Download className="h-4 w-4" />
                  Download Kit
                </a>
              </Button>
            ) : (
              <Button asChild size="lg" className="flex-1">
                <Link href="/dashboard">
                  <Download className="h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg" className="flex-1">
              <Link href="/">
                Back to Home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {sessionId && (
            <p className="mt-6 text-center text-xs text-[#9CA3AF]">
              Want to re-download later?{' '}
              <Link href="/login" className="text-[#A0A0A0] hover:text-white underline underline-offset-2 transition-colors">
                Sign in
              </Link>{' '}
              to access your dashboard any time.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
