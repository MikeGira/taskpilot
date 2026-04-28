import Link from 'next/link';
import { Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/6 bg-[#000000]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 border border-emerald-500/30">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="font-semibold text-[#F9FAFB]">
              Task<span className="text-emerald-400">Pilot</span>
            </span>
          </div>

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
            © {new Date().getFullYear()} TaskPilot. Built in Toronto.
          </p>
        </div>
      </div>
    </footer>
  );
}
