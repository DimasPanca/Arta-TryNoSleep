import { createServerClient } from '@/lib/supabase/server';
import type { AuditAction, AuditLog } from '@/types/audit';

interface AuditLogRow {
  id: string;
  tenant_id: string;
  actor_id: string;
  action: AuditAction;
  entity_type: string | null;
  entity_id: string | null;
  amount: number | null;
  metadata: Record<string, unknown> | null;
  is_anomalous: boolean;
  created_at: string;
}

export async function getAuditLogs(
  tenantId: string,
  filters?: { actorId?: string; startDate?: string; endDate?: string },
): Promise<AuditLog[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (filters?.actorId) {
    query = query.eq('actor_id', filters.actorId);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[audit/queries] Gagal mengambil log audit:', error);
    throw new Error('Gagal mengambil log audit');
  }

  return (data as AuditLogRow[]).map(mapRow);
}

export async function createAuditLog(
  data: Omit<AuditLog, 'id' | 'createdAt' | 'isAnomalous'>,
): Promise<AuditLog> {
  const supabase = await createServerClient();

  const { data: inserted, error } = await supabase
    .from('audit_logs')
    .insert({
      tenant_id: data.tenantId,
      actor_id: data.actorId,
      action: data.action,
      entity_type: data.entityType ?? null,
      entity_id: data.entityId ?? null,
      amount: data.amount ?? null,
      metadata: data.metadata ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[audit/queries] Gagal membuat log audit:', error);
    throw new Error('Gagal menyimpan log audit');
  }

  return mapRow(inserted as AuditLogRow);
}

export async function markAsAnomalous(logId: string): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('audit_logs')
    .update({ is_anomalous: true })
    .eq('id', logId);

  if (error) {
    console.error('[audit/queries] Gagal menandai log sebagai anomali:', error);
    throw new Error('Gagal menandai log sebagai anomali');
  }
}

function mapRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    actorId: row.actor_id,
    action: row.action,
    ...(row.entity_type != null && { entityType: row.entity_type }),
    ...(row.entity_id != null && { entityId: row.entity_id }),
    ...(row.amount != null && { amount: row.amount }),
    ...(row.metadata != null && { metadata: row.metadata }),
    isAnomalous: row.is_anomalous,
    createdAt: row.created_at,
  };
}
