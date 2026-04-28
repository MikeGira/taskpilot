'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Terminal, Menu, X, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-black/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-base tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8 border border-white/10">
            <Terminal className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-white">Task<span className="text-white">Pilot</span></span>
        </Link>

        {/* Desktop nav — pill-shaped links */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          <NavPill href="/generate" icon={<Wand2 className="h-3 w-3" />} accent>
            Generator
          </NavPill>
          <NavPill href="/#includes">What&apos;s included</NavPill>
          <NavPill href="/#pricing">Pricing</NavPill>
          <NavPill href="/#faq">FAQ</NavPill>
        </div>

        {/* Desktop auth — rectangular Vercel style */}
        <div className="hidden md:flex items-center gap-2">
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
          className="md:hidden p-2 text-[#888] hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/8 bg-black px-4 py-4 flex flex-col gap-2">
          <MobileLink href="/generate" onClick={() => setMobileOpen(false)} accent>
            <Wand2 className="h-3.5 w-3.5" /> Generator
          </MobileLink>
          <MobileLink href="/#includes" onClick={() => setMobileOpen(false)}>What&apos;s included</MobileLink>
          <MobileLink href="/#pricing" onClick={() => setMobileOpen(false)}>Pricing</MobileLink>
          <MobileLink href="/#faq" onClick={() => setMobileOpen(false)}>FAQ</MobileLink>
          <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/8">
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                </Button>
                <Button asChild size="sm">
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

function NavPill({
  href, children, icon, accent,
}: {
  href: string; children: React.ReactNode; icon?: React.ReactNode; accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        accent
          ? 'text-white hover:text-zinc-300 border border-white/12 hover:border-white/12 bg-white/5'
          : 'text-[#888] hover:text-white hover:bg-white/6 border border-transparent hover:border-white/10'
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileLink({
  href, children, onClick, accent,
}: {
  href: string; children: React.ReactNode; onClick: () => void; accent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        accent ? 'text-white hover:text-zinc-300' : 'text-[#888] hover:text-white hover:bg-white/5'
      )}
    >
      {children}
    </Link>
  );
}
