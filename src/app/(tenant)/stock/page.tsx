import type { Metadata } from 'next';
import type React from 'react';

import { StockLedgerDashboard } from '@/components/stock/StockLedgerDashboard';
import { getDashboardIdentity } from '@/lib/auth/identity';
import { getBatchesByTenant } from '@/lib/blockchain/query';
import { buildStockLedgerRows, buildStockLedgerRowsFromDb, type DbStockBatch, type StockLedgerRow } from '@/lib/stock/ledger';
import { createServerClient } from '@/lib/supabase/server';

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

  // Coba baca dari Fabric terlebih dahulu
  try {
    const histories = await getBatchesByTenant(tenantId);
    rows = buildStockLedgerRows(histories);
  } catch {
    // Fabric offline/tidak tersedia — lanjut baca DB
  }

  // Selalu baca dari DB juga — tampilkan batch DB yang belum ada di Fabric
  try {
    const supabase = await createServerClient();
    const { data, error: dbErr } = await supabase
      .from('stock_batches')
      .select('id, tenant_id, commodity, quantity_kg, grade, quality_score, status, storage_type, received_at, expires_at, updated_at, created_by')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });

    if (dbErr) {
      if (rows.length === 0) error = `Database: ${dbErr.message}`;
    } else if (data && data.length > 0) {
      // Ambil kondisi scan terbaru per batch untuk prediksi masa simpan.
      const batchIds = (data as Array<{ id: string }>).map((b) => b.id);
      const ripenessByBatch = new Map<string, { color_ripeness: string; surface_condition: string }>();
      const { data: scans } = await supabase
        .from('scan_records')
        .select('batch_id, color_ripeness, surface_condition, scanned_at')
        .in('batch_id', batchIds)
        .order('scanned_at', { ascending: false });

      for (const s of (scans ?? []) as Array<{ batch_id: string | null; color_ripeness: string; surface_condition: string }>) {
        if (s.batch_id && !ripenessByBatch.has(s.batch_id)) {
          ripenessByBatch.set(s.batch_id, {
            color_ripeness: s.color_ripeness,
            surface_condition: s.surface_condition,
          });
        }
      }

      // Hanya tambahkan batch DB yang belum ada di Fabric (hindari duplikat)
      const fabricIds = new Set(rows.map((r) => r.batchId));
      const dbOnly = (data as DbStockBatch[]).filter((b) => !fabricIds.has(b.id));

      if (dbOnly.length > 0) {
        const enriched: DbStockBatch[] = dbOnly.map((b) => {
          const scan = ripenessByBatch.get(b.id);
          return {
            ...b,
            color_ripeness: scan?.color_ripeness ?? null,
            surface_condition: scan?.surface_condition ?? null,
          };
        });
        rows = [...rows, ...buildStockLedgerRowsFromDb(enriched)];
      }
      error = null;
    }
  } catch (caught) {
    if (rows.length === 0) {
      error = caught instanceof Error ? caught.message : 'Gagal memuat data stok.';
    }
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
