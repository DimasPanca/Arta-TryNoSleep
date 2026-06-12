export type ProcurementStatus = 'planning' | 'confirmed' | 'delivered' | 'closed';
export type PaymentStatus = 'pending' | 'paid';

export interface JointProcurement {
  id: string;
  commodity: string;
  totalQuantity: number;
  unitPrice?: number;
  status: ProcurementStatus;
  initiatedBy: string;
  createdAt: string;
}

export interface ProcurementAllocation {
  id: string;
  procurementId: string;
  tenantId: string;
  quantityKg: number;
  paymentStatus: PaymentStatus;
  confirmedAt?: string;
}
