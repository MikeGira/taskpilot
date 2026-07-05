'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

const SURFACE_TITLES: Record<string, string> = {
  '/generate': 'Script generator',
  '/workflow': 'Workflow generator',
};

const PRODUCT_LINKS = [
  { href: '/generate', label: 'Scripts' },
  { href: '/workflow', label: 'Workflows' },
];

export function ProductHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const title = SURFACE_TITLES[pathname] ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-black">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Terminal className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold tracking-tight text-white">TaskPilot</span>
          </Link>
          {title && (
            <>
              <span aria-hidden className="hidden h-4 w-px bg-white/8 sm:block" />
              <span className="hidden truncate text-sm text-[#A1A1AA] sm:block">{title}</span>
            </>
          )}
        </div>
        <nav className="flex items-center gap-4">
          {PRODUCT_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'text-[13px] font-medium transition-colors duration-150',
                pathname === href ? 'text-white' : 'text-[#A1A1AA] hover:text-white'
              )}
            >
              {label}
            </Link>
          ))}
          <span aria-hidden className="h-4 w-px bg-white/8" />
          {user ? (
            <Link
              href="/dashboard"
              className="text-[13px] font-medium text-[#A1A1AA] transition-colors duration-150 hover:text-white"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#A1A1AA] transition-colors duration-150 hover:text-white"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
