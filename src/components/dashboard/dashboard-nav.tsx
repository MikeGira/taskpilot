'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, Settings, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE_ITEMS = [
  { href: '/dashboard', label: 'Downloads', icon: Download },
  { href: '/dashboard/account', label: 'Account', icon: Settings },
];

export function DashboardNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...BASE_ITEMS, { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 }]
    : BASE_ITEMS;

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden sm:flex flex-col gap-1 w-44 shrink-0">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-white/10 text-white border border-white/15'
                : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/20 bg-black/95 backdrop-blur-sm">
        <div className="flex">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors',
                pathname === href ? 'text-white' : 'text-[#9CA3AF] hover:text-white'
              )}
            >
              <Icon className={cn('h-5 w-5', pathname === href ? 'text-white' : 'text-[#9CA3AF]')} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
