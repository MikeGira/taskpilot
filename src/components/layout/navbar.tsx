'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Terminal, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

const NAV_LINKS = [
  { href: '/generate', label: 'Generator' },
  { href: '/#includes', label: "What's included" },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

function NavItem({ href, label }: { href: string; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative inline-flex items-center text-sm font-medium px-4 py-2 rounded-full"
      style={{
        color: hovered ? '#ffffff' : '#999999',
        transition: 'color 0.12s ease',
        zIndex: 0,
      }}
    >
      {/* Visible pill — solid enough to see on black */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: hovered
            ? 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.10) 100%)'
            : 'transparent',
          border: hovered ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
          boxShadow: hovered ? '0 2px 12px rgba(0,0,0,0.3)' : 'none',
          transform: hovered ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(3px)',
          transformOrigin: 'center',
          opacity: hovered ? 1 : 0,
          transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

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
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-base group">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-white/8 border border-white/12 group-hover:bg-white/12 group-hover:border-white/20 transition-all duration-200">
            <Terminal className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-white tracking-tight">TaskPilot</span>
        </Link>

        {/* Desktop nav — pill pop-up hover */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <NavItem key={href} href={href} label={label} />
          ))}
        </div>

        {/* Desktop auth — Sign In uses NavItem (same spring pill), CTA uses Button */}
        <div className="hidden md:flex items-center gap-1">
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <NavItem href="/login" label="Sign In" />
              <Button asChild size="sm" className="ml-1">
                <Link href="/checkout">Get the Kit $19</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile */}
        <button
          className="md:hidden p-2 text-[#888] hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/8 bg-black px-4 py-4 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              className="text-sm text-[#888] hover:text-white font-medium px-3 py-2.5 rounded-full hover:bg-white/7 transition-all duration-200">
              {label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-white/8">
            {user ? (
              <Button asChild><Link href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline"><Link href="/login" onClick={() => setMobileOpen(false)}>Sign In</Link></Button>
                <Button asChild><Link href="/checkout" onClick={() => setMobileOpen(false)}>Get the Kit $19</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
