import Link from 'next/link';
import type React from 'react';

import { CommandBar } from '@/components/dashboard/CommandBar';
import { getDashboardIdentity } from '@/lib/auth/identity';

export default async function TenantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();

  if (identity.noMembership) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-8 text-center shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)]">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-brand-50)]">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--color-brand-600)]" fill="none" aria-hidden>
              <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a2.5 2.5 0 1 0 0-5M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5m2 0c0-2-1-3.6-2.5-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="font-[var(--font-display)] text-[1.6rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
            Akun belum terhubung
          </h1>
          <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
            Akun <span className="font-semibold text-[var(--color-text-primary)]">{identity.name}</span> belum
            terdaftar sebagai anggota aktif di koperasi manapun. Hubungi pengurus untuk mendapatkan undangan,
            atau daftar melalui tautan undangan.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)]"
            >
              Daftar sebagai anggota
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-brand-50)]"
            >
              Masuk dengan akun lain
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <CommandBar
        role={identity.role}
        name={identity.name}
        tenantName={identity.tenantName}
        preview={identity.preview}
      />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
