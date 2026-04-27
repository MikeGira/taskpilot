'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Terminal, Menu, X, Wand2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/6 bg-[#0B0F1A]/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-500/30">
            <Terminal className="h-4 w-4 text-sky-400" />
          </div>
          <span className="text-[#F9FAFB]">Task<span className="text-sky-400">Pilot</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm text-[#9CA3AF]">
          <Link
            href="/generate"
            className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Generator
          </Link>
          <Link href="/#includes" className="hover:text-[#F9FAFB] transition-colors">
            What&apos;s included
          </Link>
          <Link href="/#pricing" className="hover:text-[#F9FAFB] transition-colors">
            Pricing
          </Link>
          <Link href="/#faq" className="hover:text-[#F9FAFB] transition-colors">
            FAQ
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/checkout">Get the Kit — $19</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-[#9CA3AF] hover:text-[#F9FAFB]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/6 bg-[#0B0F1A] px-4 py-4 flex flex-col gap-3">
          <Link href="/generate" className="text-sm text-violet-400 hover:text-violet-300 py-1 flex items-center gap-1.5 font-medium" onClick={() => setMobileOpen(false)}>
            <Wand2 className="h-3.5 w-3.5" /> Generator
          </Link>
          <Link href="/#includes" className="text-sm text-[#9CA3AF] hover:text-[#F9FAFB] py-1" onClick={() => setMobileOpen(false)}>
            What&apos;s included
          </Link>
          <Link href="/#pricing" className="text-sm text-[#9CA3AF] hover:text-[#F9FAFB] py-1" onClick={() => setMobileOpen(false)}>
            Pricing
          </Link>
          <Link href="/#faq" className="text-sm text-[#9CA3AF] hover:text-[#F9FAFB] py-1" onClick={() => setMobileOpen(false)}>
            FAQ
          </Link>
          <div className="flex flex-col gap-2 pt-2 border-t border-white/6">
            {user ? (
              <Button asChild>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/checkout" onClick={() => setMobileOpen(false)}>Get the Kit — $19</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
