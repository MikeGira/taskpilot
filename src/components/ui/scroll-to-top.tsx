'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-6 left-4 sm:left-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-sm hover:bg-white/20 active:scale-95 transition-all duration-200"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
