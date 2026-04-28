import Link from 'next/link';
import { CheckCircle2, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata = { title: 'Purchase Complete' };

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
        <div className="max-w-md w-full text-center">

          {/* Icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/8 border border-white/15 mx-auto mb-8">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-white mb-3">You&apos;re all set!</h1>
          <p className="text-[#888] leading-relaxed mb-2">
            Your purchase is confirmed. Click below to download your kit immediately — no account needed.
          </p>
          <p className="text-sm text-[#888] mb-10">
            We also sent a download link to your inbox as a backup.
          </p>

          {/* Primary action */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {sessionId ? (
              <Button asChild size="lg">
                <a href={`/api/download/session?session_id=${sessionId}`}>
                  <Download className="h-4 w-4" />
                  Download Kit
                </a>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/dashboard">
                  <Download className="h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                Back to Home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {sessionId && (
            <p className="mt-8 text-xs text-[#777]">
              Want to re-download later?{' '}
              <Link href="/login" className="text-[#888] hover:text-white underline underline-offset-2 transition-colors">
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
