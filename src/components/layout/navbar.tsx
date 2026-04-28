'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Terminal, Menu, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const NAV_LINKS = [
  { href: '/generate', label: 'Generator' },
  { href: '/#includes', label: "What's included" },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

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
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-black/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-base">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-white/8 border border-white/12">
            <Terminal className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-white tracking-tight">TaskPilot</span>
        </Link>

        {/* Desktop nav — plain text links, Vercel style */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-[#888] hover:text-white font-medium transition-colors duration-150"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/checkout">Get the Kit $19</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-[#888] hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/8 bg-black px-4 py-4 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="text-sm text-[#888] hover:text-white font-medium px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-white/8">
            {user ? (
              <Button asChild>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/checkout" onClick={() => setMobileOpen(false)}>Get the Kit $19</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
