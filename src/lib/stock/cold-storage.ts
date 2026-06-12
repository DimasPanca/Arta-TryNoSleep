import { COLD_STORAGE_CAPACITY_KG } from '@/constants/cold-storage';
import { recordQualityUpdate } from '@/lib/blockchain/record';
import { getStockBatchById, getStockBatches, updateStockBatch } from '@/lib/stock/queries';
import type { StockBatch } from '@/types/stock';

interface ColdStorageStatus {
  occupied: number;
  capacity: number;
  batches: StockBatch[];
}

export async function getColdStorageStatus(tenantId: string): Promise<ColdStorageStatus> {
  const available = await getStockBatches(tenantId, { status: 'available' });
  const batches = available.filter((batch) => batch.storageType === 'cold');
  const occupied = batches.reduce((sum, batch) => sum + batch.quantityKg, 0);

  return { occupied, capacity: COLD_STORAGE_CAPACITY_KG, batches };
}

export async function scheduleColdStorageTransfer(
  batchId: string,
  tenantId: string,
): Promise<void> {
  const batch = await getStockBatchById(tenantId, batchId);
  if (!batch) {
    throw new Error('Batch tidak ditemukan');
  }
  if (batch.storageType === 'cold') {
    return;
  }

  const { occupied } = await getColdStorageStatus(tenantId);
  if (occupied + batch.quantityKg > COLD_STORAGE_CAPACITY_KG) {
    throw new Error('Kapasitas cold storage tidak mencukupi untuk batch ini');
  }

  await updateStockBatch(tenantId, batchId, { storageType: 'cold' });

  if (!batch.grade || batch.qualityScore === undefined) {
    return;
  }

  // Chaincode hanya punya empat action; transfer storage dicatat sebagai quality_updated
  void recordQualityUpdate({
    batchId,
    tenantId,
    commodity: batch.commodity,
    quantityKg: batch.quantityKg,
    grade: batch.grade,
    qualityScore: batch.qualityScore,
    receivedAt: batch.receivedAt,
    operatorId: 'system',
  }).catch((error) => {
    console.error('[stock/cold-storage] Gagal mencatat transfer ke blockchain:', error);
  });
}
