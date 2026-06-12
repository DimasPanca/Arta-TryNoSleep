import { NextResponse, type NextRequest } from 'next/server';

import { hasPermission } from '@/constants/roles';
import { recordBatchReceived } from '@/lib/blockchain/record';
import { createServerClient } from '@/lib/supabase/server';
import type { QualityGrade } from '@/types/stock';
import type { TenantRole } from '@/types/tenant';

export const runtime = 'nodejs';

/**
 * POST /api/stock/anchor  { batchId }
 * Catat batch yang belum ter-anchor ke Hyperledger Fabric, lalu simpan txId
 * ke kolom blockchain_tx. Membutuhkan izin stock:write.
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
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const m = member as { role: TenantRole; tenant_id: string } | null;
  if (!m) {
    return NextResponse.json({ ok: false, error: 'Akun belum tergabung di koperasi.' }, { status: 403 });
  }
  if (!hasPermission(m.role, 'stock:write')) {
    return NextResponse.json({ ok: false, error: 'Peran Anda tidak boleh menulis stok.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body tidak valid.' }, { status: 400 });
  }
  const batchId = (body as { batchId?: unknown })?.batchId;
  if (typeof batchId !== 'string' || batchId.length === 0) {
    return NextResponse.json({ ok: false, error: 'batchId wajib diisi.' }, { status: 400 });
  }

  const { data: batch } = await supabase
    .from('stock_batches')
    .select('id, tenant_id, commodity, quantity_kg, grade, quality_score, received_at, farmer_id, blockchain_tx')
    .eq('id', batchId)
    .eq('tenant_id', m.tenant_id)
    .maybeSingle();

  const b = batch as
    | {
        id: string;
        tenant_id: string;
        commodity: string;
        quantity_kg: number;
        grade: QualityGrade | null;
        quality_score: number | null;
        received_at: string;
        farmer_id: string | null;
        blockchain_tx: string | null;
      }
    | null;

  if (!b) {
    return NextResponse.json({ ok: false, error: 'Batch tidak ditemukan.' }, { status: 404 });
  }
  if (b.blockchain_tx) {
    return NextResponse.json({ ok: true, txId: b.blockchain_tx, alreadyAnchored: true });
  }
  if (!b.grade || b.quality_score == null) {
    return NextResponse.json(
      { ok: false, error: 'Batch belum memiliki hasil mutu (grade/skor) untuk di-anchor.' },
      { status: 400 },
    );
  }

  try {
    const tx = await recordBatchReceived({
      batchId: b.id,
      tenantId: b.tenant_id,
      commodity: b.commodity,
      quantityKg: Number(b.quantity_kg),
      grade: b.grade,
      qualityScore: Number(b.quality_score),
      receivedAt: b.received_at,
      operatorId: user.id,
      ...(b.farmer_id ? { farmerId: b.farmer_id } : {}),
    });

    await supabase.from('stock_batches').update({ blockchain_tx: tx.txId }).eq('id', b.id);

    return NextResponse.json({ ok: true, txId: tx.txId, status: tx.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Gagal mencatat ke Fabric.',
      },
      { status: 502 },
    );
  }
}
