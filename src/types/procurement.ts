export type ProcurementStatus =
  | 'planning'
  | 'open'
  | 'confirmed'
  | 'purchasing'
  | 'delivered'
  | 'closed';
export type PaymentStatus = 'pending' | 'paid';
/** internal = koperasi punya akun di sistem; external = konfirmasi/bayar manual. */
export type ParticipantType = 'internal' | 'external';

export interface JointProcurement {
  id: string;
  commodity: string;
  totalQuantity: number;
  unit?: string;
  unitPrice?: number;
  supplierName?: string;
  status: ProcurementStatus;
  initiatedBy: string;
  targetDate?: string;
  blockchainTx?: string;
  createdAt: string;
}

export interface ProcurementAllocation {
  id: string;
  procurementId: string;
  tenantId: string;
  quantityKg: number;
  requestedKg?: number;
  participantType?: ParticipantType;
  paymentStatus: PaymentStatus;
  confirmedAt?: string;
}
