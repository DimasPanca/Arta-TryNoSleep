import crypto from 'crypto';

import { createServerClient } from '@/lib/supabase/server';
import type { ProcurementAllocation } from '@/types/procurement';

interface Participant {
  tenantId: string;
  requestedKg: number;
}

export async function calculateAllocation(
  orderId: string,
  participants: Array<{ tenantId: string; requestedKg: number }>,
): Promise<ProcurementAllocation[]> {
  const totalOrder = await getOrderQuantity(orderId);
  const totalRequested = participants.reduce((sum, p) => sum + p.requestedKg, 0);

  const isOversubscribed = totalRequested > totalOrder;
  const ratio = isOversubscribed ? totalOrder / totalRequested : 1;

  return participants.map((participant) =>
    buildAllocation(orderId, participant, participant.requestedKg * ratio),
  );
}

export async function createAllocations(allocations: ProcurementAllocation[]): Promise<void> {
  if (allocations.length === 0) {
    return;
  }

  const supabase = await createServerClient();

  const rows = allocations.map((allocation) => ({
    id: allocation.id,
    procurement_id: allocation.procurementId,
    tenant_id: allocation.tenantId,
    quantity_kg: allocation.quantityKg,
    payment_status: allocation.paymentStatus,
    confirmed_at: allocation.confirmedAt ?? null,
  }));

  const { error } = await supabase.from('procurement_allocations').insert(rows);

  if (error) {
    console.error('[procurement/allocation] Gagal menyimpan alokasi:', error);
    throw new Error('Gagal menyimpan alokasi pengadaan');
  }
}

async function getOrderQuantity(orderId: string): Promise<number> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('joint_procurements')
    .select('total_quantity')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) {
    console.error('[procurement/allocation] Gagal mengambil kuantitas pengadaan:', error);
    throw new Error('Pengadaan tidak ditemukan');
  }

  return Number((data as { total_quantity: number }).total_quantity);
}

function buildAllocation(
  orderId: string,
  participant: Participant,
  quantityKg: number,
): ProcurementAllocation {
  return {
    id: crypto.randomUUID(),
    procurementId: orderId,
    tenantId: participant.tenantId,
    quantityKg: Math.round(quantityKg * 100) / 100,
    paymentStatus: 'pending',
  };
}
