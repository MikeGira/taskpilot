import Link from 'next/link';
import { Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/12 bg-[#000000]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 border border-white/12 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-200">
              <Terminal className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-[#F9FAFB] group-hover:text-white transition-colors duration-200">
              Task<span className="text-white">Pilot</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#6B7280]">
            <Link href="/privacy" className="hover:text-[#9CA3AF] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#9CA3AF] transition-colors">
              Terms of Service
            </Link>
            <Link href="/#contact" className="hover:text-[#9CA3AF] transition-colors">
              Contact
            </Link>
          </nav>

          <p className="text-xs text-[#4B5563]">
            &copy; {new Date().getFullYear()} TaskPilot. Built in Toronto.
          </p>
        </div>
      </div>
    </footer>
  );
}
