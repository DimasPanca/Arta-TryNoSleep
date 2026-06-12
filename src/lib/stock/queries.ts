import { createServerClient } from '@/lib/supabase/server';
import type { BatchStatus, QualityGrade, StockBatch, StorageType } from '@/types/stock';

interface StockBatchRow {
  id: string;
  tenant_id: string;
  commodity: string;
  quantity_kg: number;
  grade: QualityGrade | null;
  quality_score: number | null;
  storage_type: StorageType;
  status: BatchStatus;
  received_at: string;
  expires_at: string | null;
  blockchain_tx: string | null;
}

export async function getStockBatches(
  tenantId: string,
  filters?: { status?: BatchStatus; grade?: QualityGrade },
): Promise<StockBatch[]> {
  const supabase = createServerClient();

  let query = supabase
    .from('stock_batches')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('received_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.grade) {
    query = query.eq('grade', filters.grade);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[stock/queries] Gagal mengambil daftar batch:', error);
    throw new Error('Gagal mengambil daftar batch');
  }

  return (data as StockBatchRow[]).map(mapRow);
}

export async function getStockBatchById(
  tenantId: string,
  batchId: string,
): Promise<StockBatch | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stock_batches')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', batchId)
    .maybeSingle();

  if (error) {
    console.error('[stock/queries] Gagal mengambil batch:', error);
    throw new Error('Gagal mengambil detail batch');
  }

  return data ? mapRow(data as StockBatchRow) : null;
}

export async function createStockBatch(
  tenantId: string,
  data: Omit<StockBatch, 'id' | 'tenantId' | 'receivedAt'>,
): Promise<StockBatch> {
  const supabase = createServerClient();

  const { data: inserted, error } = await supabase
    .from('stock_batches')
    .insert({ tenant_id: tenantId, ...toRowFields(data) })
    .select()
    .single();

  if (error) {
    console.error('[stock/queries] Gagal membuat batch:', error);
    throw new Error('Gagal menyimpan batch baru');
  }

  return mapRow(inserted as StockBatchRow);
}

export async function updateStockBatch(
  tenantId: string,
  batchId: string,
  updates: Partial<StockBatch>,
): Promise<StockBatch> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('stock_batches')
    .update(toRowFields(updates))
    .eq('tenant_id', tenantId)
    .eq('id', batchId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[stock/queries] Gagal memperbarui batch:', error);
    throw new Error('Gagal memperbarui batch');
  }
  if (!data) {
    throw new Error('Batch tidak ditemukan');
  }

  return mapRow(data as StockBatchRow);
}

export async function deleteStockBatch(tenantId: string, batchId: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('stock_batches')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', batchId);

  if (error) {
    console.error('[stock/queries] Gagal menghapus batch:', error);
    throw new Error('Gagal menghapus batch');
  }
}

export async function getExpiredBatches(tenantId: string): Promise<StockBatch[]> {
  return getStockBatches(tenantId, { status: 'expired' });
}

function mapRow(row: StockBatchRow): StockBatch {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    commodity: row.commodity,
    quantityKg: Number(row.quantity_kg),
    grade: row.grade ?? undefined,
    qualityScore: row.quality_score ?? undefined,
    storageType: row.storage_type,
    status: row.status,
    receivedAt: row.received_at,
    expiresAt: row.expires_at ?? undefined,
    blockchainTx: row.blockchain_tx ?? undefined,
  };
}

function toRowFields(fields: Partial<StockBatch>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (fields.commodity !== undefined) row.commodity = fields.commodity;
  if (fields.quantityKg !== undefined) row.quantity_kg = fields.quantityKg;
  if (fields.grade !== undefined) row.grade = fields.grade;
  if (fields.qualityScore !== undefined) row.quality_score = fields.qualityScore;
  if (fields.storageType !== undefined) row.storage_type = fields.storageType;
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.expiresAt !== undefined) row.expires_at = fields.expiresAt;
  if (fields.blockchainTx !== undefined) row.blockchain_tx = fields.blockchainTx;
  return row;
}
