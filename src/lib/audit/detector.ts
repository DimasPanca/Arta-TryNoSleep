import { getAuditLogs } from '@/lib/audit/queries';
import type { AnomalyPattern, AuditLog } from '@/types/audit';

const DEFAULT_LOOKBACK_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const VOID_SEQUENCE_WINDOW_MS = 60 * 60 * 1000;

const AFTER_HOURS_START = 22;
const AFTER_HOURS_END = 6;

const CANCEL_ACTIONS: ReadonlySet<string> = new Set(['cancel', 'void']);

export async function detectAnomalies(
  tenantId: string,
  actorId: string,
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
): Promise<AnomalyPattern[]> {
  const startDate = new Date(Date.now() - lookbackDays * MS_PER_DAY).toISOString();
  const logs = await getAuditLogs(tenantId, { actorId, startDate });

  if (logs.length === 0) {
    return [];
  }

  const patterns: AnomalyPattern[] = [];

  const afterHours = detectAfterHoursCancel(actorId, logs);
  if (afterHours) patterns.push(afterHours);

  const highCancel = detectHighCancelRate(actorId, logs);
  if (highCancel) patterns.push(highCancel);

  const voidSequence = detectUnusualVoidSequence(actorId, logs);
  if (voidSequence) patterns.push(voidSequence);

  return patterns;
}

function detectAfterHoursCancel(actorId: string, logs: AuditLog[]): AnomalyPattern | null {
  const offending = logs.filter(
    (log) => CANCEL_ACTIONS.has(log.action) && isAfterHours(log.createdAt),
  );

  if (offending.length <= 2) {
    return null;
  }

  const riskLevel = offending.length > 5 ? 'high' : 'medium';
  return buildPattern(actorId, 'after_hours_cancel', offending, riskLevel);
}

function detectHighCancelRate(actorId: string, logs: AuditLog[]): AnomalyPattern | null {
  const cancels = logs.filter((log) => CANCEL_ACTIONS.has(log.action));
  const rate = cancels.length / logs.length;

  if (rate <= 0.2) {
    return null;
  }

  const riskLevel = rate > 0.4 ? 'high' : 'medium';
  return buildPattern(actorId, 'high_cancel_rate', cancels, riskLevel);
}

function detectUnusualVoidSequence(actorId: string, logs: AuditLog[]): AnomalyPattern | null {
  const voids = logs
    .filter((log) => log.action === 'void')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (voids.length < 3) {
    return null;
  }

  for (let i = 0; i + 2 < voids.length; i += 1) {
    const windowStart = new Date(voids[i].createdAt).getTime();
    const windowEnd = new Date(voids[i + 2].createdAt).getTime();
    if (windowEnd - windowStart <= VOID_SEQUENCE_WINDOW_MS) {
      return buildPattern(actorId, 'unusual_void_sequence', voids, 'medium');
    }
  }

  return null;
}

function buildPattern(
  actorId: string,
  patternType: AnomalyPattern['patternType'],
  logs: AuditLog[],
  riskLevel: AnomalyPattern['riskLevel'],
): AnomalyPattern {
  const timestamps = logs.map((log) => new Date(log.createdAt).getTime());
  return {
    actorId,
    patternType,
    count: logs.length,
    firstSeen: new Date(Math.min(...timestamps)).toISOString(),
    lastSeen: new Date(Math.max(...timestamps)).toISOString(),
    riskLevel,
  };
}

function isAfterHours(timestamp: string): boolean {
  const hour = new Date(timestamp).getHours();
  return hour >= AFTER_HOURS_START || hour < AFTER_HOURS_END;
}
