import { createServerClient } from '@/lib/supabase/server';
import type { JointProcurement, ProcurementStatus } from '@/types/procurement';

interface JointProcurementRow {
  id: string;
  commodity: string;
  total_quantity: number;
  unit_price: number | null;
  status: ProcurementStatus;
  initiated_by: string;
  created_at: string;
}

export async function createJointOrder(
  data: Omit<JointProcurement, 'id' | 'createdAt' | 'status'>,
): Promise<JointProcurement> {
  const supabase = await createServerClient();

  const { data: inserted, error } = await supabase
    .from('joint_procurements')
    .insert({
      commodity: data.commodity,
      total_quantity: data.totalQuantity,
      unit_price: data.unitPrice ?? null,
      initiated_by: data.initiatedBy,
    })
    .select()
    .single();

  if (error) {
    console.error('[procurement/joint-order] Gagal membuat pengadaan:', error);
    throw new Error('Gagal menyimpan pengadaan bersama');
  }

  return mapRow(inserted as JointProcurementRow);
}

export async function getJointOrders(tenantId: string): Promise<JointProcurement[]> {
  const supabase = await createServerClient();

  const participatingIds = await getParticipatingProcurementIds(tenantId);
  const filter =
    participatingIds.length > 0
      ? `initiated_by.eq.${tenantId},id.in.(${participatingIds.join(',')})`
      : `initiated_by.eq.${tenantId}`;

  const { data, error } = await supabase
    .from('joint_procurements')
    .select('*')
    .or(filter)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[procurement/joint-order] Gagal mengambil daftar pengadaan:', error);
    throw new Error('Gagal mengambil daftar pengadaan');
  }

  return (data as JointProcurementRow[]).map(mapRow);
}

export async function confirmJointOrder(orderId: string): Promise<JointProcurement> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('joint_procurements')
    .update({ status: 'confirmed' })
    .eq('id', orderId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[procurement/joint-order] Gagal mengonfirmasi pengadaan:', error);
    throw new Error('Gagal mengonfirmasi pengadaan');
  }
  if (!data) {
    throw new Error('Pengadaan tidak ditemukan');
  }

  return mapRow(data as JointProcurementRow);
}

async function getParticipatingProcurementIds(tenantId: string): Promise<string[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('procurement_allocations')
    .select('procurement_id')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[procurement/joint-order] Gagal mengambil partisipasi pengadaan:', error);
    return [];
  }

  return (data as { procurement_id: string }[]).map((row) => row.procurement_id);
}

function mapRow(row: JointProcurementRow): JointProcurement {
  return {
    id: row.id,
    commodity: row.commodity,
    totalQuantity: Number(row.total_quantity),
    ...(row.unit_price != null && { unitPrice: Number(row.unit_price) }),
    status: row.status,
    initiatedBy: row.initiated_by,
    createdAt: row.created_at,
  };
}
