import { useEffect, useRef, useState } from 'react';

/**
 * Progressive, restrained content reveal hook for below-the-fold sections.
 * - Never used on Hero LCP content.
 * - Respects prefers-reduced-motion: reduce (reveals immediately).
 * - Fails open immediately if IntersectionObserver is unavailable.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(threshold = 0.08) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (typeof window.IntersectionObserver === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (revealed) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: '0px 0px -32px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [revealed, threshold]);

  return { ref, revealed };
}
