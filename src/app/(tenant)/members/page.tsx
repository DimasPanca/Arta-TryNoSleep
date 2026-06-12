import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  title: 'Anggota — Arta',
};

export default function MembersPage(): React.JSX.Element {
  return <ComingSoon title="Anggota" desc="Kelola keanggotaan, undangan bergabung, dan persetujuan pendaftaran." />;
}

function ComingSoon({ title, desc }: { title: string; desc: string }): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-brand-100)]">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--color-brand-600)]" fill="none" aria-hidden>
          <path
            d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a2.5 2.5 0 1 0 0-5M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5m2 0c0-2-1-3.6-2.5-4.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
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
