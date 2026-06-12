export type ApplicationStatus =
  | 'pending'
  | 'pending_pengurus'
  | 'pending_dinas'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'active'
  | 'settled';

export type FinancingType = 'asset' | 'cash';
export type InstallmentStatus = 'scheduled' | 'paid' | 'overdue';
export type InternalValidator = 'bendahara' | 'ketua' | 'wakil_ketua';
export type Verdict = 'approved' | 'rejected';

export interface CreditHistoryEntry {
  tenantId: string;
  tenantName: string;
  totalLoans: number;
  settledLoans: number;
  activeArrears: number;
  lastUpdated: string;
}

export interface LoanApplication {
  id: string;
  applicantId: string;
  applicantName?: string;
  targetTenantId: string;
  amount: number;
  purpose?: string;
  status: ApplicationStatus;
  creditScore?: number;
  crossTenantData?: CreditHistoryEntry[];
  createdAt: string;

  // Pembiayaan berbasis aset
  financingType: FinancingType;
  assetName?: string;
  assetCategory?: string;
  assetPrice?: number;
  vendorName?: string;
  downPayment: number;
  tenorMonths: number;
  marginPct: number;
  disbursedAt?: string;
  settledAt?: string;
  assetTransferredAt?: string;
}

export interface LoanInstallment {
  id: string;
  applicationId: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
  paidAt?: string;
}

export interface ValidatorDecisionView {
  id: string;
  validatorType: string;
  verdict: Verdict;
  reason?: string;
  decidedAt: string;
}
