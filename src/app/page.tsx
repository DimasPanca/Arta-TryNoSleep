import type React from 'react';

export default function HomePage(): React.JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-surface-base)]">
      <div className="text-center space-y-4 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] text-sm font-medium">
          Beta
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Arta
        </h1>
        <p className="text-[var(--color-text-secondary)] max-w-md">
          Platform digitalisasi koperasi pertanian multi-tenant.
          Traceability sayuran, manajemen stok, dan keuangan koperasi dalam satu sistem.
        </p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-brand-600)] text-white font-medium text-sm hover:bg-[var(--color-brand-700)] transition-colors"
          >
            Masuk
          </a>
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-medium text-sm hover:bg-[var(--color-brand-50)] transition-colors"
          >
            Daftar Anggota
          </a>
        </div>
      </div>
    </main>
  );
}
