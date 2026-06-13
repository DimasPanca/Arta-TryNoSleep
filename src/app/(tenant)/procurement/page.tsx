import type { Metadata } from 'next';
import type React from 'react';

import { ProcurementWorkspace } from '@/components/procurement/ProcurementWorkspace';
import { hasPermission } from '@/constants/roles';
import { getDashboardIdentity } from '@/lib/auth/identity';
import { MELATI_JAYA_ID } from '@/lib/procurement/cooperatives';
import { getProcurementFabricStatus } from '@/lib/procurement/fabric';

export const metadata: Metadata = {
  title: 'Pengadaan Bersama · Arta',
};

export const dynamic = 'force-dynamic';

export default async function ProcurementPage(): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();

  if (!hasPermission(identity.role, 'procurement:read')) {
    return <NoAccess />;
  }

  const canCreate = hasPermission(identity.role, 'procurement:write');
  const tenantId = identity.tenantId ?? MELATI_JAYA_ID;

  const fabric = await getProcurementFabricStatus(tenantId);

  return (
    <ProcurementWorkspace
      orders={[]}
      tenantName={identity.tenantName}
      fabric={fabric}
      canCreate={canCreate}
      preview={identity.preview}
    />
  );
}

function NoAccess(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-amber-100)] text-[var(--color-amber-400)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h1 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">Akses pengadaan tidak tersedia</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Peran Anda tidak memiliki izin melihat modul pengadaan.
      </p>
    </div>
  );
}
