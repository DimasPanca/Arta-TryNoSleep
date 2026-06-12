import { NextResponse, type NextRequest } from 'next/server';

import { createAdminClient, getInviteByToken } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

interface AcceptInviteBody {
  token: string;
  fullName: string;
}

function isValidBody(body: unknown): body is AcceptInviteBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.token === 'string' &&
    b.token.length > 0 &&
    typeof b.fullName === 'string' &&
    b.fullName.trim().length > 0
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Sesi tidak valid. Verifikasi nomor dahulu.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid' }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: 'Field token dan fullName wajib diisi' }, { status: 400 });
  }

  const invite = await getInviteByToken(body.token);
  if (!invite) {
    return NextResponse.json({ error: 'Undangan tidak ditemukan.' }, { status: 404 });
  }
  if (invite.used) {
    return NextResponse.json({ error: 'Undangan ini sudah pernah digunakan.' }, { status: 409 });
  }
  if (invite.expired) {
    return NextResponse.json({ error: 'Undangan sudah kedaluwarsa.' }, { status: 410 });
  }

  const admin = createAdminClient();

  // Cegah duplikasi keanggotaan di koperasi yang sama
  const { data: existing } = await admin
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', invite.tenantId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Anda sudah terdaftar di koperasi ini.' },
      { status: 409 },
    );
  }

  const { error: insertError } = await admin.from('members').insert({
    user_id: user.id,
    tenant_id: invite.tenantId,
    role: invite.role,
    status: 'active',
    full_name: body.fullName.trim(),
    phone: user.phone ?? null,
  });

  if (insertError) {
    console.error('[api/auth/accept-invite] Gagal membuat member:', insertError);
    return NextResponse.json({ error: 'Gagal menyelesaikan pendaftaran.' }, { status: 500 });
  }

  // Tandai undangan terpakai (single-use)
  await admin
    .from('member_invites')
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq('token', invite.token);

  return NextResponse.json({ data: { role: invite.role, tenantId: invite.tenantId } }, { status: 201 });
}
