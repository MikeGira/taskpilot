import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Terminal } from 'lucide-react';
import { SignOutButton } from '@/components/dashboard/sign-out-button';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { Footer } from '@/components/layout/footer';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/dashboard');
  }

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="border-b border-white/28 bg-black/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8 border border-white/32">
              <Terminal className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-white">Task<span className="text-white/70">Pilot</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-[#9CA3AF]">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 gap-8">
        <DashboardNav isAdmin={isAdmin} />
        <main className="flex-1 min-w-0 pb-20 sm:pb-0">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
