import type { Metadata } from 'next';
import type React from 'react';

import { ApplicantView } from '@/components/finance/ApplicantView';
import { FinanceWorkspace } from '@/components/finance/FinanceWorkspace';
import { hasPermission } from '@/constants/roles';
import { getDashboardIdentity } from '@/lib/auth/identity';
import { getApplicationsByApplicant, getLoanApplications } from '@/lib/finance/applications';
import { createServerClient } from '@/lib/supabase/server';
import type { LoanApplication } from '@/types/finance';
import type { TenantRole } from '@/types/tenant';

export const metadata: Metadata = {
  title: 'Keuangan · Arta',
};

export const dynamic = 'force-dynamic';

const APPROVER_ROLES: TenantRole[] = ['bendahara', 'ketua', 'wakil_ketua'];
const VIEWER_ROLES: TenantRole[] = ['mitra', 'dinas'];

export default async function FinancePage(): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();

  if (!hasPermission(identity.role, 'finance:read') && !hasPermission(identity.role, 'finance:apply')) {
    return <NoAccess />;
  }

  const isApprover = APPROVER_ROLES.includes(identity.role);
  const isViewer = VIEWER_ROLES.includes(identity.role);
  const isApplicant = identity.role === 'anggota';

  // ── Mode pratinjau (belum login) ──
  if (identity.preview || !identity.tenantId) {
    if (isApplicant) {
      return (
        <ApplicantView
          tenantId={identity.tenantId ?? ''}
          tenantName={identity.tenantName}
          applications={[]}
          preview
        />
      );
    }
    return (
      <FinanceWorkspace
        applications={[]}
        tenantName={identity.tenantName}
        canDecide={false}
        canVerify={false}
        preview
      />
    );
  }

  // ── Anggota: ajukan + pantau pengajuan sendiri ──
  if (isApplicant) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let mine: LoanApplication[] = [];
    if (user) {
      try {
        mine = await getApplicationsByApplicant(user.id);
      } catch {
        mine = [];
      }
    }
    return (
      <ApplicantView
        tenantId={identity.tenantId}
        tenantName={identity.tenantName}
        applications={mine}
        preview={false}
      />
    );
  }

  // ── Pengurus / pengawas: kelola pengajuan masuk ──
  let applications: LoanApplication[] = [];
  try {
    applications = await getLoanApplications(identity.tenantId);
  } catch {
    applications = [];
  }

  return (
    <FinanceWorkspace
      applications={applications}
      tenantName={identity.tenantName}
      canDecide={isApprover}
      canVerify={isApprover || isViewer}
      preview={false}
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
      <h1 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">Akses keuangan tidak tersedia</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Peran Anda tidak memiliki izin melihat modul pembiayaan.
      </p>
    </div>
  );
}
