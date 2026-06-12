import type { BlockchainAction, TraceHistoryEntry, TraceHistoryResponse } from '@/types/blockchain';
import type { QualityGrade } from '@/types/stock';

export interface StockLedgerEvent {
  txId: string;
  timestamp: string;
  action: BlockchainAction;
  actionLabel: string;
  quantityKg: number;
  grade: QualityGrade;
  qualityScore: number;
}

export interface StockLedgerRow {
  batchId: string;
  tenantId: string;
  commodity: string;
  quantityKg: number;
  grade: QualityGrade;
  qualityScore: number;
  latestAction: BlockchainAction;
  latestActionLabel: string;
  latestAt: string;
  latestTxId: string;
  firstSeenAt: string;
  firstTxId: string;
  operatorId: string;
  farmerId: string | null;
  eventCount: number;
  active: boolean;
  events: StockLedgerEvent[];
}

export const STOCK_LEDGER_ACTION_LABELS: Record<BlockchainAction, string> = {
  batch_received: 'Batch masuk',
  batch_dispatched: 'Terkirim',
  quality_updated: 'Mutu diperbarui',
  batch_expired: 'Kedaluwarsa',
};

export function buildStockLedgerRows(histories: TraceHistoryResponse[]): StockLedgerRow[] {
  const rows: StockLedgerRow[] = [];

  for (const history of histories) {
    const entries = [...history.entries].sort(compareEntries);
    const first = entries[0];
    const latest = entries[entries.length - 1];
    if (!first || !latest) continue;

    const latestData = latest.data;
    const events = entries.map((entry) => ({
      txId: entry.txId,
      timestamp: entry.timestamp,
      action: entry.action,
      actionLabel: STOCK_LEDGER_ACTION_LABELS[entry.action],
      quantityKg: Number(entry.data.quantityKg),
      grade: entry.data.grade,
      qualityScore: Number(entry.data.qualityScore),
    }));

    rows.push({
      batchId: latestData.batchId || history.batchId,
      tenantId: latestData.tenantId,
      commodity: latestData.commodity,
      quantityKg: Number(latestData.quantityKg),
      grade: latestData.grade,
      qualityScore: Number(latestData.qualityScore),
      latestAction: latest.action,
      latestActionLabel: STOCK_LEDGER_ACTION_LABELS[latest.action],
      latestAt: latest.timestamp,
      latestTxId: latest.txId,
      firstSeenAt: first.timestamp,
      firstTxId: first.txId,
      operatorId: latestData.operatorId,
      farmerId: latestData.farmerId ?? null,
      eventCount: entries.length,
      active: latest.action !== 'batch_dispatched' && latest.action !== 'batch_expired',
      events,
    });
  }

  return rows.sort((a, b) => toTime(b.latestAt) - toTime(a.latestAt));
}

function compareEntries(a: TraceHistoryEntry, b: TraceHistoryEntry): number {
  const byTime = toTime(a.timestamp) - toTime(b.timestamp);
  if (byTime !== 0) return byTime;
  return a.txId.localeCompare(b.txId);
}

function toTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
