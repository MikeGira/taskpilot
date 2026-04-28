import Link from 'next/link';
import { CheckCircle2, ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata = { title: 'Purchase Complete' };

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#000000]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-[#F9FAFB] mb-4">You&apos;re all set!</h1>
          <p className="text-[#9CA3AF] mb-4">
            Your purchase is confirmed. Check your inbox — we sent you a confirmation email with
            a link to your download.
          </p>
          <p className="text-sm text-[#6B7280] mb-8">
            You can also access your kit any time from your dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/dashboard">
                <Download className="h-4 w-4" />
                Go to dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                Back to home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
