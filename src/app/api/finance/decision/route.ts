import { NextResponse, type NextRequest } from 'next/server';

import { hasPermission } from '@/constants/roles';
import { recordValidatorDecision } from '@/lib/blockchain/record';
import { getLoanApplicationById } from '@/lib/finance/applications';
import { submitDecision } from '@/lib/finance/lifecycle';
import { createServerClient } from '@/lib/supabase/server';
import type { InternalValidator, Verdict } from '@/types/finance';
import type { TenantRole } from '@/types/tenant';

export const runtime = 'nodejs';

const INTERNAL: InternalValidator[] = ['bendahara', 'ketua', 'wakil_ketua'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Anda harus masuk.' }, { status: 401 });

  const { data: member } = await supabase
    .from('members')
    .select('role, tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const m = member as { role: TenantRole; tenant_id: string } | null;
  if (!m || !hasPermission(m.role, 'finance:approve') || !INTERNAL.includes(m.role as InternalValidator)) {
    return NextResponse.json({ ok: false, error: 'Peran Anda tidak boleh memutuskan pengajuan.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body tidak valid.' }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const applicationId = typeof b.applicationId === 'string' ? b.applicationId : '';
  const verdict = b.verdict === 'approved' || b.verdict === 'rejected' ? (b.verdict as Verdict) : null;
  const reason = typeof b.reason === 'string' ? b.reason : undefined;

  if (!applicationId || !verdict) {
    return NextResponse.json({ ok: false, error: 'applicationId & verdict wajib diisi.' }, { status: 400 });
  }

  const app = await getLoanApplicationById(applicationId);
  if (!app) return NextResponse.json({ ok: false, error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  if (app.targetTenantId !== m.tenant_id) {
    return NextResponse.json({ ok: false, error: 'Pengajuan bukan milik koperasi Anda.' }, { status: 403 });
  }

  try {
    await submitDecision({
      applicationId,
      validatorId: user.id,
      validatorType: m.role as InternalValidator,
      tenantId: m.tenant_id,
      verdict,
      ...(reason !== undefined && { reason }),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Gagal menyimpan keputusan.' },
      { status: 400 },
    );
  }

  // Jejak immutable ke Hyperledger Fabric (best-effort)
  // Map internal roles (bendahara/ketua/wakil_ketua) ke chaincode type 'pengurus'
  const chaincodeValidatorType: 'pengurus' | 'dinas' = m.role === 'dinas' ? 'dinas' : 'pengurus';
  void recordValidatorDecision(applicationId, {
    validatorId: user.id,
    validatorType: chaincodeValidatorType,
    verdict,
    reason: reason ?? '',
  }).catch((err) => console.error('[api/finance/decision] Fabric gagal:', err));

  const updated = await getLoanApplicationById(applicationId);
  return NextResponse.json({ ok: true, application: updated });
}
