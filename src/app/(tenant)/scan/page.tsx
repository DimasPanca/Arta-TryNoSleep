import type { Metadata } from 'next';
import type React from 'react';

import { ScanStudio } from '@/components/scan/ScanStudio';
import { hasPermission } from '@/constants/roles';
import { getDashboardIdentity } from '@/lib/auth/identity';

export const metadata: Metadata = {
  title: 'Scan Kualitas · Arta',
};

export default async function ScanPage(): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();
  const canScan = hasPermission(identity.role, 'scan:execute');
  const iotConfigured = Boolean(process.env.IOT_DEVICE_KEY);

  if (!canScan) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-amber-100)] text-[var(--color-amber-400)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path d="M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">Akses scan tidak tersedia</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Peran Anda tidak memiliki izin memindai kualitas. Hubungi operator atau pengurus koperasi.
        </p>
      </div>
    );
  }

  return (
    <ScanStudio
      canSave={!identity.preview}
      preview={identity.preview}
      iotConfigured={iotConfigured}
      ingestPath="/api/scan/ingest"
    />
  );
}
