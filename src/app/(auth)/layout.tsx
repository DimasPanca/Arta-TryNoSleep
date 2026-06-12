import type React from 'react';

import { LottieSlot } from '@/components/auth/LottieSlot';

const TRUST_SIGNALS = [
  {
    label: 'Terenkripsi end-to-end',
    icon: (
      <path
        d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm3 8H9V7a3 3 0 1 1 6 0v3Z"
        fill="currentColor"
      />
    ),
  },
  {
    label: 'Tercatat di blockchain',
    icon: (
      <path
        d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 6.5 3.6L12 11.5 5.5 7.9 12 4.3Zm-7 5.3 6 3.4v6.8l-6-3.3V9.6Zm14 0v6.9l-6 3.3v-6.8l6-3.4Z"
        fill="currentColor"
      />
    ),
  },
  {
    label: 'Multi-tenant koperasi',
    icon: (
      <path
        d="M3 21V9l6-4 6 4v12h-4v-6H7v6H3Zm14 0V9.6l-1.8-1.2L17 7v14h4V11l-2-1.3V21h-2Z"
        fill="currentColor"
      />
    ),
  },
];

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      {/* ── Panel brand (desktop) ───────────────────────────── */}
      <aside className="relative hidden w-[46%] max-w-2xl flex-col overflow-hidden bg-[var(--color-brand-900)] px-12 py-10 text-white lg:flex">
        {/* Tekstur latar */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 15%, rgba(90,158,90,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(30,74,30,0.6), transparent 50%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-brand-400)] text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path
                d="M12 3c4 2 7 5 7 9a7 7 0 1 1-14 0c0-1.6.5-3 1.3-4.2C7.6 9.7 9.5 11 12 11c-1.3-2-1-5 0-8Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="font-[var(--font-display)] text-2xl tracking-tight">Arta</span>
        </div>

        {/* Lottie + tagline */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          <LottieSlot className="mb-8" />
          <h2 className="max-w-sm font-[var(--font-display)] text-[2rem] leading-[1.15] tracking-tight">
            Koperasi pertanian, kini dalam genggaman.
          </h2>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/70">
            Traceability sayuran, manajemen stok, dan pembiayaan koperasi terhubung
            dan transparan dalam satu sistem.
          </p>
        </div>

        {/* Trust signals */}
        <ul className="relative z-10 flex flex-wrap gap-x-6 gap-y-2.5">
          {TRUST_SIGNALS.map((signal) => (
            <li key={signal.label} className="flex items-center gap-2 text-sm text-white/75">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-brand-200)]" aria-hidden>
                {signal.icon}
              </svg>
              {signal.label}
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Panel form ──────────────────────────────────────── */}
      <main className="flex flex-1 flex-col">
        {/* Header brand (mobile) */}
        <div className="flex items-center justify-center gap-2.5 px-6 pt-8 lg:hidden">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-brand-600)] text-white">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
              <path
                d="M12 3c4 2 7 5 7 9a7 7 0 1 1-14 0c0-1.6.5-3 1.3-4.2C7.6 9.7 9.5 11 12 11c-1.3-2-1-5 0-8Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="font-[var(--font-display)] text-xl text-[var(--color-text-primary)]">
            Arta
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[26rem] animate-arta-rise">{children}</div>
        </div>

        <footer className="px-6 pb-8 text-center text-xs text-[var(--color-text-muted)]">
          © {new Date().getFullYear()} Arta · Platform Digitalisasi Koperasi
        </footer>
      </main>
    </div>
  );
}
