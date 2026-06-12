import { NextResponse, type NextRequest } from 'next/server';

import { hasPermission } from '@/constants/roles';
import { getLoanApplicationById } from '@/lib/finance/applications';
import { disburseApplication } from '@/lib/finance/lifecycle';
import { createServerClient } from '@/lib/supabase/server';
import type { TenantRole } from '@/types/tenant';

export const runtime = 'nodejs';

const INTERNAL: TenantRole[] = ['bendahara', 'ketua', 'wakil_ketua'];

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
  if (!m || !INTERNAL.includes(m.role) || !hasPermission(m.role, 'finance:approve')) {
    return NextResponse.json({ ok: false, error: 'Peran Anda tidak boleh mencairkan.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body tidak valid.' }, { status: 400 });
  }
  const applicationId = (body as { applicationId?: unknown })?.applicationId;
  if (typeof applicationId !== 'string' || !applicationId) {
    return NextResponse.json({ ok: false, error: 'applicationId wajib diisi.' }, { status: 400 });
  }

  const app = await getLoanApplicationById(applicationId);
  if (!app) return NextResponse.json({ ok: false, error: 'Pengajuan tidak ditemukan.' }, { status: 404 });
  if (app.targetTenantId !== m.tenant_id) {
    return NextResponse.json({ ok: false, error: 'Pengajuan bukan milik koperasi Anda.' }, { status: 403 });
  }

  try {
    const installments = await disburseApplication(applicationId, user.id);
    return NextResponse.json({ ok: true, installments });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Gagal mencairkan.' },
      { status: 400 },
    );
  }
}
