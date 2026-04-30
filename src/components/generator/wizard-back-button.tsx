'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function WizardBackButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById('header-back-btn');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="w-full max-w-2xl mx-auto mb-6 transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      aria-hidden={!visible}
    >
      <Link
        href="/"
        tabIndex={visible ? 0 : -1}
        className="inline-flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
