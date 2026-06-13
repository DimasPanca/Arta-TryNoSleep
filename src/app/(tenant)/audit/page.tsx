import type { Metadata } from 'next';
import type React from 'react';

import { AuditWorkspace } from '@/components/audit/AuditWorkspace';
import { hasPermission } from '@/constants/roles';
import type {
  CoopPortfolio,
  FabricIntegrity,
  TrustSignals,
} from '@/lib/audit/audit-overview';
import { getDashboardIdentity } from '@/lib/auth/identity';

export const metadata: Metadata = {
  title: 'Audit & Portofolio · Arta',
};

export const dynamic = 'force-dynamic';

export default async function AuditPage(): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();

  if (!hasPermission(identity.role, 'audit:read')) {
    return <NoAccess />;
  }

  const tenantName = identity.tenantName;
  const fabricUrl = process.env.HYPERLEDGER_API_URL ?? '';

  let fabricOnline = false;
  if (fabricUrl) {
    try {
      const res = await fetch(`${fabricUrl}/health`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      fabricOnline = res.ok;
    } catch {
      fabricOnline = false;
    }
  }

  const fabric: FabricIntegrity = {
    online: fabricOnline,
    configuredUrl: fabricUrl,
    checkedAt: new Date().toISOString(),
    totalAnchored: 0,
    totalUnanchored: 0,
    connectedPeers: [],
  };

  const signals: TrustSignals = {
    repaymentRate: 0,
    anchoringCoverage: 0,
    nplRate: 0,
    crossVerifiedRatio: 0,
    anomalyResolution: 0,
    yearsActive: 0,
  };

  const portfolio: CoopPortfolio = {
    coopName: tenantName,
    coopId: identity.tenantId ?? '',
    sector: '',
    location: '',
    establishedYear: new Date().getFullYear(),
    scope: 'full',
    sections: [],
    generatedAt: new Date().toISOString(),
  };

  return (
    <AuditWorkspace
      anomalies={[]}
      activities={[]}
      blockchain={[]}
      reports={[]}
      portfolio={portfolio}
      fabric={fabric}
      signals={signals}
      trends={{ anchored: [], disbursed: [], activity: [], trust: [] }}
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
