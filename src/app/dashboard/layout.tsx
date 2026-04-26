import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Terminal, Download, Settings, LogOut } from 'lucide-react';
import { SignOutButton } from '@/components/dashboard/sign-out-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex flex-col">
      {/* Dashboard header */}
      <header className="border-b border-white/6 bg-[#0B0F1A]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/15 border border-sky-500/30">
              <Terminal className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <span className="text-[#F9FAFB]">Task<span className="text-sky-400">Pilot</span></span>
          </Link>
          <div className="flex items-center gap-1">
            <span className="hidden sm:block text-xs text-[#6B7280] mr-3">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Sidebar nav + content */}
      <div className="flex flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 gap-8">
        <nav className="hidden sm:flex flex-col gap-1 w-44 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5 transition-colors"
          >
            <Download className="h-4 w-4" />
            Downloads
          </Link>
          <Link
            href="/dashboard/account"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Account
          </Link>
        </nav>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
