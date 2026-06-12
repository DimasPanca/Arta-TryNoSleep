import type { Metadata } from 'next';
import type React from 'react';

import { StockLedgerDashboard } from '@/components/stock/StockLedgerDashboard';
import { getDashboardIdentity } from '@/lib/auth/identity';
import { getBatchesByTenant } from '@/lib/blockchain/query';
import { buildStockLedgerRows, type StockLedgerRow } from '@/lib/stock/ledger';

export const metadata: Metadata = {
  title: 'Stok Ledger - Arta',
};

const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111';

interface StockPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StockPage({
  searchParams,
}: StockPageProps): Promise<React.JSX.Element> {
  const params = searchParams ? await searchParams : {};
  const identity = await getDashboardIdentity();
  const tenantParam = readSearchParam(params, 'tenantId');
  const tenantId = identity.tenantId ?? tenantParam ?? DEMO_TENANT_ID;
  const tenantSourceLabel = getTenantSourceLabel(Boolean(identity.tenantId), Boolean(tenantParam));
  const tenantName = identity.tenantId
    ? identity.tenantName
    : tenantParam
      ? 'Tenant pratinjau'
      : 'Koperasi Demo Arta';

  let rows: StockLedgerRow[] = [];
  let error: string | null = null;

  try {
    const histories = await getBatchesByTenant(tenantId);
    rows = buildStockLedgerRows(histories);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Hyperledger Fabric tidak terjangkau.';
  }

  return (
    <StockLedgerDashboard
      rows={rows}
      tenantId={tenantId}
      tenantName={tenantName}
      tenantSourceLabel={tenantSourceLabel}
      configuredUrl={process.env.HYPERLEDGER_API_URL ?? '(tidak diset)'}
      generatedAt={new Date().toISOString()}
      error={error}
      preview={identity.preview}
    />
  );
}

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getTenantSourceLabel(hasSessionTenant: boolean, hasTenantParam: boolean): string {
  if (hasSessionTenant) return 'Tenant akun aktif';
  if (hasTenantParam) return 'Tenant dari URL';
  return 'Tenant demo lokal';
}
