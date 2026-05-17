import Link from 'next/link';
import { Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/20 bg-[#000000]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1a1a1a] border border-white/25 group-hover:bg-[#222] group-hover:border-white/38 transition-all duration-200">
              <Terminal className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-[#F9FAFB] group-hover:text-white transition-colors duration-200">
              Task<span className="text-white">Pilot</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#6B7280]">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/#contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </nav>

          <p className="text-xs text-[#6B7280]">
            &copy; {new Date().getFullYear()} TaskPilot. Built in Toronto.
          </p>
        </div>
      </div>
    </footer>
  );
}
