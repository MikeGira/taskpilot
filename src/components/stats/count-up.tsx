'use client';

import { useEffect, useState } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function CountUp({ value, duration = 1400, prefix = '', suffix = '', decimals = 0 }: CountUpProps) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    let cancelled = false;
    setDisplay(0);
    const startTime = performance.now();

    const animate = (now: number) => {
      if (cancelled) return;
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = eased * value;
      setDisplay(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));
      if (t < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    return () => { cancelled = true; };
  }, [value, duration, decimals]);

  const formatted =
    decimals > 0
      ? display.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : display.toLocaleString('en-US');

  return <>{prefix}{formatted}{suffix}</>;
}
