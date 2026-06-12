export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type StorageType = 'ambient' | 'cold';
export type BatchStatus = 'available' | 'reserved' | 'dispatched' | 'expired';

export interface StockBatch {
  id: string;
  tenantId: string;
  commodity: string;
  quantityKg: number;
  grade?: QualityGrade;
  qualityScore?: number;
  storageType: StorageType;
  status: BatchStatus;
  receivedAt: string;
  expiresAt?: string;
  blockchainTx?: string;
}
