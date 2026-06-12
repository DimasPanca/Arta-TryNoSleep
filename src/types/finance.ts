export type ApplicationStatus =
  | 'pending'
  | 'pending_pengurus'
  | 'pending_dinas'
  | 'approved'
  | 'rejected'
  | 'disbursed';

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
  targetTenantId: string;
  amount: number;
  purpose?: string;
  status: ApplicationStatus;
  creditScore?: number;
  crossTenantData?: CreditHistoryEntry[];
  createdAt: string;
}
