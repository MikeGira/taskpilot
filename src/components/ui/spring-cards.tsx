'use client';
import { useEffect } from 'react';

export function CardSpringProvider() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const card = (e.target as Element).closest('[data-spring]') as HTMLElement | null;
      if (!card) return;
      card.classList.remove('card-spring-active');
      void card.offsetWidth;
      card.classList.add('card-spring-active');
      card.addEventListener('animationend', () => card.classList.remove('card-spring-active'), { once: true });
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
  return null;
}
