import { NextResponse, type NextRequest } from 'next/server';

import { hasPermission } from '@/constants/roles';
import { recordRepayment } from '@/lib/finance/lifecycle';
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
    return NextResponse.json({ ok: false, error: 'Peran Anda tidak boleh mencatat pembayaran.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body tidak valid.' }, { status: 400 });
  }
  const installmentId = (body as { installmentId?: unknown })?.installmentId;
  if (typeof installmentId !== 'string' || !installmentId) {
    return NextResponse.json({ ok: false, error: 'installmentId wajib diisi.' }, { status: 400 });
  }

  try {
    const result = await recordRepayment(installmentId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Gagal mencatat pembayaran.' },
      { status: 400 },
    );
  }
}
