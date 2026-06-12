import { NextResponse, type NextRequest } from 'next/server';

import { hasPermission } from '@/constants/roles';
import { recordProcurementEvent } from '@/lib/blockchain/record';
import { getCooperative } from '@/lib/procurement/cooperatives';
import { computeMetrics } from '@/lib/procurement/overview';
import { SAMPLE_PROCUREMENTS } from '@/lib/procurement/samples';
import { createServerClient } from '@/lib/supabase/server';
import type { TenantRole } from '@/types/tenant';

export const runtime = 'nodejs';

/**
 * POST /api/procurement/anchor  { procurementId }
 * Catat pengadaan bersama ke Hyperledger Fabric (channel stock-trace) agar
 * alokasi & harga immutable. Membutuhkan izin procurement:write.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Anda harus masuk.' }, { status: 401 });
  }

  const { data: member } = await supabase
    .from('members')
    .select('role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const role = (member as { role: TenantRole } | null)?.role;
  if (!role) {
    return NextResponse.json({ ok: false, error: 'Akun belum tergabung di koperasi.' }, { status: 403 });
  }
  if (!hasPermission(role, 'procurement:write')) {
    return NextResponse.json({ ok: false, error: 'Peran Anda tidak boleh menulis pengadaan.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body tidak valid.' }, { status: 400 });
  }
  const procurementId = (body as { procurementId?: unknown })?.procurementId;
  if (typeof procurementId !== 'string' || procurementId.length === 0) {
    return NextResponse.json({ ok: false, error: 'procurementId wajib diisi.' }, { status: 400 });
  }

  const order = SAMPLE_PROCUREMENTS.find((o) => o.id === procurementId);
  if (!order) {
    return NextResponse.json(
      { ok: false, error: 'Pengadaan tidak ditemukan untuk dicatat (jalur DB belum aktif).' },
      { status: 404 },
    );
  }
  if (order.txId) {
    return NextResponse.json({ ok: true, txId: order.txId, alreadyAnchored: true });
  }

  const metrics = computeMetrics(order);
  try {
    const tx = await recordProcurementEvent({
      procurementId: order.id,
      commodity: order.commodity,
      unit: order.unit,
      initiatorMspId: getCooperative(order.initiatorId)?.mspId ?? order.initiatorId,
      supplierName: order.supplierName,
      unitPrice: metrics.jointUnitPrice,
      totalQuantity: metrics.totalAllocated,
      participants: order.participants.map((p) => ({ mspId: p.mspId, allocatedQty: p.allocatedQty })),
      recordedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, txId: tx.txId, status: tx.status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Gagal mencatat ke Fabric.' },
      { status: 502 },
    );
  }
}
