import { getBatchesByTenant } from '@/lib/blockchain/query';
import type { StockBatch } from '@/types/stock';

const DEMO_TENANT = '11111111-1111-1111-1111-111111111111';

export interface OnChainEvent {
  batchId: string;
  txId: string;
  action: string;
  timestamp: string;
  commodity?: string;
  grade?: string;
  quantityKg?: number;
}

export interface FabricStatus {
  online: boolean;
  onChainBatchIds: string[];
  recentEvents: OnChainEvent[];
  error?: string;
}

/**
 * Status & jejak on-chain dari Hyperledger Fabric untuk satu koperasi.
 * Dibungkus try/catch agar halaman tetap berfungsi bila node tidak terjangkau
 * (mis. saat di-deploy ke cloud sementara Fabric masih lokal).
 */
export async function getFabricStatus(tenantId: string): Promise<FabricStatus> {
  try {
    const traces = await getBatchesByTenant(tenantId);
    const onChainBatchIds = traces.map((t) => t.batchId);
    const recentEvents: OnChainEvent[] = traces
      .flatMap((t) =>
        t.entries.map((e) => {
          const ev: OnChainEvent = {
            batchId: t.batchId,
            txId: e.txId,
            action: e.action,
            timestamp: e.timestamp,
          };
          if (e.data?.commodity) ev.commodity = e.data.commodity;
          if (e.data?.grade) ev.grade = e.data.grade;
          if (e.data?.quantityKg != null) ev.quantityKg = e.data.quantityKg;
          return ev;
        }),
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12);

    return { online: true, onChainBatchIds, recentEvents };
  } catch (error) {
    return {
      online: false,
      onChainBatchIds: [],
      recentEvents: [],
      error: error instanceof Error ? error.message : 'Fabric tidak terjangkau',
    };
  }
}

/* ── Fixtures untuk mode pratinjau (sebelum login) ──────────────── */
export const SAMPLE_BATCHES: StockBatch[] = [
  { id: 'demo-tomat-01', tenantId: DEMO_TENANT, commodity: 'Tomat merah', quantityKg: 320, grade: 'A', qualityScore: 91, storageType: 'cold', status: 'available', receivedAt: '2026-06-12T01:00:00Z', expiresAt: '2026-06-18T01:00:00Z', blockchainTx: '57520299ef6bb1c1a7977e9735a4c99b70dd94b2' },
  { id: 'demo-cabai-01', tenantId: DEMO_TENANT, commodity: 'Cabai merah', quantityKg: 145, grade: 'A', qualityScore: 88, storageType: 'cold', status: 'available', receivedAt: '2026-06-11T03:00:00Z', expiresAt: '2026-06-15T03:00:00Z', blockchainTx: 'a52f6bd5c5839c6670898f27b6b8732853b42c61' },
  { id: 'demo-bayam-01', tenantId: DEMO_TENANT, commodity: 'Bayam hijau', quantityKg: 60, grade: 'B', qualityScore: 76, storageType: 'ambient', status: 'available', receivedAt: '2026-06-12T06:00:00Z', expiresAt: '2026-06-14T06:00:00Z' },
  { id: 'demo-kangkung-01', tenantId: DEMO_TENANT, commodity: 'Kangkung', quantityKg: 48, grade: 'B', qualityScore: 79, storageType: 'ambient', status: 'reserved', receivedAt: '2026-06-10T02:00:00Z', expiresAt: '2026-06-13T02:00:00Z' },
  { id: 'demo-wortel-01', tenantId: DEMO_TENANT, commodity: 'Wortel', quantityKg: 210, grade: 'A', qualityScore: 90, storageType: 'cold', status: 'available', receivedAt: '2026-06-09T05:00:00Z', expiresAt: '2026-06-23T05:00:00Z' },
  { id: 'demo-kubis-01', tenantId: DEMO_TENANT, commodity: 'Kubis', quantityKg: 175, grade: 'C', qualityScore: 64, storageType: 'ambient', status: 'available', receivedAt: '2026-06-08T04:00:00Z', expiresAt: '2026-06-12T04:00:00Z' },
  { id: 'demo-selada-01', tenantId: DEMO_TENANT, commodity: 'Selada keriting', quantityKg: 35, grade: 'D', qualityScore: 48, storageType: 'cold', status: 'expired', receivedAt: '2026-06-05T07:00:00Z', expiresAt: '2026-06-10T07:00:00Z' },
  { id: 'demo-terong-01', tenantId: DEMO_TENANT, commodity: 'Terong ungu', quantityKg: 92, grade: 'B', qualityScore: 81, storageType: 'ambient', status: 'dispatched', receivedAt: '2026-06-04T03:00:00Z', blockchainTx: 'b7c19a2e4f0d8c6a3b51e92f7d4a08c1e6b3f259' },
  { id: 'demo-timun-01', tenantId: DEMO_TENANT, commodity: 'Timun', quantityKg: 130, grade: 'A', qualityScore: 86, storageType: 'cold', status: 'available', receivedAt: '2026-06-11T08:00:00Z', expiresAt: '2026-06-19T08:00:00Z' },
  { id: 'demo-cabai-02', tenantId: DEMO_TENANT, commodity: 'Cabai rawit', quantityKg: 58, grade: 'C', qualityScore: 61, storageType: 'ambient', status: 'available', receivedAt: '2026-06-07T01:00:00Z', expiresAt: '2026-06-13T01:00:00Z' },
];

export const SAMPLE_FABRIC: FabricStatus = {
  online: true,
  onChainBatchIds: ['demo-tomat-01', 'demo-cabai-01', 'demo-terong-01'],
  recentEvents: [
    { batchId: 'demo-tomat-01', txId: '57520299ef6bb1c1a7977e9735a4c99b70dd94b2', action: 'batch_received', timestamp: '2026-06-12T01:00:00Z', commodity: 'Tomat merah', grade: 'A', quantityKg: 320 },
    { batchId: 'demo-cabai-01', txId: 'a52f6bd5c5839c6670898f27b6b8732853b42c61', action: 'batch_received', timestamp: '2026-06-11T03:00:00Z', commodity: 'Cabai merah', grade: 'A', quantityKg: 145 },
    { batchId: 'demo-terong-01', txId: 'b7c19a2e4f0d8c6a3b51e92f7d4a08c1e6b3f259', action: 'batch_dispatched', timestamp: '2026-06-09T09:00:00Z', commodity: 'Terong ungu', grade: 'B', quantityKg: 92 },
  ],
};
