export type AuditAction = 'sale' | 'cancel' | 'void' | 'refund' | 'adjustment';

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  isAnomalous: boolean;
  createdAt: string;
}

export interface AnomalyPattern {
  actorId: string;
  patternType: 'after_hours_cancel' | 'high_cancel_rate' | 'unusual_void_sequence';
  count: number;
  firstSeen: string;
  lastSeen: string;
  riskLevel: 'low' | 'medium' | 'high';
}
