import { createAuditLog } from '@/lib/audit/queries';
import type { AnomalyPattern } from '@/types/audit';

export async function notifyPengurus(
  tenantId: string,
  anomaly: AnomalyPattern,
): Promise<void> {
  await createAuditLog({
    tenantId,
    actorId: anomaly.actorId,
    action: 'adjustment',
    entityType: 'anomaly_notification',
    metadata: {
      notification: true,
      patternType: anomaly.patternType,
      riskLevel: anomaly.riskLevel,
      count: anomaly.count,
      firstSeen: anomaly.firstSeen,
      lastSeen: anomaly.lastSeen,
    },
  });
}
