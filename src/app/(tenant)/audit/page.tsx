import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  title: 'Audit — Arta',
};

export default function AuditPage(): React.JSX.Element {
  return <ComingSoon title="Audit" desc="Monitor anomali transaksi, log aktivitas, dan laporan kepatuhan koperasi." />;
}

function ComingSoon({ title, desc }: { title: string; desc: string }): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-brand-100)]">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--color-brand-600)]" fill="none" aria-hidden>
          <path
            d="M12 3l8 3v5c0 4.5-3 8.5-8 10-5-1.5-8-5.5-8-10V6l8-3Zm-1 9 1.5 1.5L15 10"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-text-secondary)]">{desc}</p>
      </div>
      <span className="rounded-full bg-[var(--color-amber-100)] px-3 py-1 text-xs font-semibold text-[var(--color-amber-400)]">
        Segera hadir
      </span>
    </div>
  );
}
