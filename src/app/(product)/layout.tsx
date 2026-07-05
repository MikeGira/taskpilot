import Link from 'next/link';
import { ProductHeader } from '@/components/layout/product-header';

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <ProductHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/8">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4 text-xs text-[#6B7280] sm:px-6">
          <span>&copy; {new Date().getFullYear()} TaskPilot</span>
          <nav className="flex items-center gap-4">
            <Link href="/privacy" className="transition-colors duration-150 hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors duration-150 hover:text-white">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
