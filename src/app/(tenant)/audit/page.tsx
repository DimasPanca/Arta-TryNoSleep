import type { Metadata } from 'next';
import type React from 'react';

import { AuditWorkspace } from '@/components/audit/AuditWorkspace';
import { hasPermission } from '@/constants/roles';
import {
  SAMPLE_ACTIVITIES,
  SAMPLE_ANOMALIES,
  SAMPLE_BLOCKCHAIN,
  SAMPLE_FABRIC_INTEGRITY,
  SAMPLE_PORTFOLIO,
  SAMPLE_REPORTS,
  SAMPLE_TRUST_SIGNALS,
  TREND_ACTIVITY,
  TREND_ANCHORED,
  TREND_DISBURSED,
  TREND_TRUST,
} from '@/lib/audit/audit-samples';
import { getDashboardIdentity } from '@/lib/auth/identity';

export const metadata: Metadata = {
  title: 'Audit & Portofolio — Arta',
};

export const dynamic = 'force-dynamic';

export default async function AuditPage(): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();

  if (!hasPermission(identity.role, 'audit:read')) {
    return <NoAccess />;
  }

  const tenantName = identity.tenantId ? identity.tenantName : 'Koperasi Melati Jaya';

  return (
    <AuditWorkspace
      anomalies={SAMPLE_ANOMALIES}
      activities={SAMPLE_ACTIVITIES}
      blockchain={SAMPLE_BLOCKCHAIN}
      reports={SAMPLE_REPORTS}
      portfolio={SAMPLE_PORTFOLIO}
      fabric={SAMPLE_FABRIC_INTEGRITY}
      signals={SAMPLE_TRUST_SIGNALS}
      trends={{
        anchored: TREND_ANCHORED,
        disbursed: TREND_DISBURSED,
        activity: TREND_ACTIVITY,
        trust: TREND_TRUST,
      }}
      viewerRole={identity.role}
      tenantName={tenantName}
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
      <h1 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">Akses audit tidak tersedia</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Halaman ini hanya tersedia untuk bendahara, dinas, mitra, ketua, dan wakil ketua.
      </p>
    </div>
  );
}
