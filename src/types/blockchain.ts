import type { QualityGrade } from '@/types/stock';

export type BlockchainAction =
  | 'batch_received'
  | 'batch_dispatched'
  | 'quality_updated'
  | 'batch_expired';

export type ValidatorType = 'pengurus' | 'dinas';
export type ValidatorVerdict = 'approved' | 'rejected';
export type AutoVerdict = 'rejected' | 'pending_pengurus';

// --- Stock Trace ---

export interface BlockchainStockRecord {
  batchId: string;
  tenantId: string;
  commodity: string;
  quantityKg: number;
  grade: QualityGrade;
  qualityScore: number;
  receivedAt: string;
  operatorId: string;
  farmerId?: string;
}

export interface BlockchainSubmitResponse {
  txId: string;
  status: 'committed' | 'pending';
  timestamp: string;
}

export interface TraceHistoryEntry {
  txId: string;
  timestamp: string;
  tenantId: string;
  action: BlockchainAction;
  data: BlockchainStockRecord;
}

export interface TraceHistoryResponse {
  batchId: string;
  entries: TraceHistoryEntry[];
}

// --- Credit History ---

export interface LoanApplicationRecord {
  applicationId: string;
  applicantId: string;
  targetTenantId: string;
  amount: number;
  purpose: string;
  submittedAt: string;
}

export interface ValidatorDecisionRecord {
  validatorId: string;
  validatorType: ValidatorType;
  verdict: ValidatorVerdict;
  reason: string;
}

export interface CreditHistoryEntry {
  tenantId: string;
  tenantName: string;
  totalLoans: number;
  settledLoans: number;
  activeArrears: number;
  lastUpdated: string;
}

export interface CreditHistoryResponse {
  applicantId: string;
  entries: CreditHistoryEntry[];
}

export interface AutoEvaluateResult {
  applicationId: string;
  verdict: AutoVerdict;
  reason: string;
  evaluatedAt: string;
}

// --- Portfolio ---

export interface StockSummary {
  totalBatchesReceived: number;
  totalWeightKg: number;
  gradeDistribution: Record<QualityGrade, number>;
  commodities: string[];
}

export interface LoanSummary {
  totalApplications: number;
  approved: number;
  rejected: number;
  defaultRate: number;
}

export interface PortfolioData {
  tenantId: string;
  tenantName: string;
  period: { start: string; end: string };
  stockSummary: StockSummary;
  loanSummary: LoanSummary;
  signature: string;
  signedAt: string;
  blockHeight: number;
}
