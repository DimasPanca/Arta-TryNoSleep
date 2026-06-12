import { recordBatchReceived } from '@/lib/blockchain/record';
import { createStockBatch, getStockBatches, updateStockBatch } from '@/lib/stock/queries';
import type { ScanResult } from '@/types/scan';
import type { BatchStatus, QualityGrade, StockBatch, StorageType } from '@/types/stock';

const EXPIRY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface BatchReceivalData {
  commodity: string;
  quantityKg: number;
  storageType: StorageType;
  status: BatchStatus;
  expiresAt?: string;
  operatorId: string;
  farmerId?: string;
}

export async function processBatchReceival(
  tenantId: string,
  data: BatchReceivalData,
  scanResult: ScanResult,
): Promise<StockBatch> {
  const batch = await createStockBatch(tenantId, {
    commodity: data.commodity,
    quantityKg: data.quantityKg,
    storageType: data.storageType,
    status: data.status,
    expiresAt: data.expiresAt,
    grade: scanResult.grade,
    qualityScore: scanResult.qualityScore,
  });

  // Fire and forget: kegagalan blockchain tidak boleh memblok penerimaan batch
  void recordBatchReceived({
    batchId: batch.id,
    tenantId,
    commodity: batch.commodity,
    quantityKg: batch.quantityKg,
    grade: scanResult.grade,
    qualityScore: scanResult.qualityScore,
    receivedAt: batch.receivedAt,
    operatorId: data.operatorId,
    farmerId: data.farmerId,
  })
    .then((tx) => updateStockBatch(tenantId, batch.id, { blockchainTx: tx.txId }))
    .catch((error) => {
      console.error('[stock/batch] Gagal mencatat penerimaan ke blockchain:', error);
    });

  return batch;
}

export async function checkAndUpdateExpiredBatches(tenantId: string): Promise<number> {
  const batches = await getStockBatches(tenantId);
  const cutoff = Date.now() - EXPIRY_DAYS * MS_PER_DAY;

  const expired = batches.filter(
    (batch) =>
      batch.status !== 'expired' && new Date(batch.receivedAt).getTime() < cutoff,
  );

  for (const batch of expired) {
    const updates: Partial<StockBatch> = { status: 'expired' };
    if (batch.grade && batch.grade !== 'F') {
      updates.grade = 'D';
    }
    await updateStockBatch(tenantId, batch.id, updates);
  }

  return expired.length;
}

export function calculateStorageRecommendation(grade: QualityGrade): StorageType {
  return grade === 'A' || grade === 'B' ? 'cold' : 'ambient';
}
