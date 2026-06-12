'use client';

import type { AnimationItem } from 'lottie-web';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * LottieSlot — menampilkan animasi Lottie di panel brand.
 *
 * File JSON di-load saat runtime dari /public (via `path`), BUKAN diimpor
 * sebagai modul — supaya file besar tidak ikut ke dalam bundle halaman.
 *
 * Ganti animasi: taruh file baru di /public/lottie/ lalu ubah prop `src`
 * (atau default di bawah).
 */
interface LottieSlotProps {
  src?: string;
  label?: string;
  className?: string;
}

export function LottieSlot({
  src = '/lottie/card.json',
  label = 'Animasi Arta',
  className = '',
}: LottieSlotProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let anim: AnimationItem | null = null;
    let cancelled = false;

    void (async () => {
      const lottie = (await import('lottie-web')).default;
      if (cancelled || !containerRef.current) return;
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: src,
      });
      anim.addEventListener('DOMLoaded', () => {
        if (!cancelled) setLoaded(true);
      });
    })();

    return () => {
      cancelled = true;
      if (anim) anim.destroy();
    };
  }, [src]);

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative aspect-square w-full max-w-[22rem] ${className}`}
    >
      {/* Glow lembut di belakang animasi */}
      <div
        aria-hidden
        className="absolute inset-[6%] rounded-[2rem]"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(90,158,90,0.28), transparent 68%)',
        }}
      />

      {/* Spinner saat animasi belum siap */}
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="h-8 w-8 rounded-full border-2 border-white/25 border-t-white/80 animate-arta-spin" />
        </div>
      )}

      {/* Kontainer animasi Lottie */}
      <div
        ref={containerRef}
        className={`relative h-full w-full transition-opacity duration-700 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
