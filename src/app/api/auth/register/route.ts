import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { createAdminClient, getInviteByToken } from '@/lib/supabase/admin';
import { isValidLocalPhone, phoneToAuthEmail, toE164 } from '@/lib/utils/phone';

interface RegisterBody {
  phone: string;
  fullName: string;
  password: string;
  tenantId?: string;
  inviteToken?: string;
}

function isValidBody(body: unknown): body is RegisterBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.phone === 'string' &&
    typeof b.fullName === 'string' &&
    typeof b.password === 'string'
  );
}

// Klien anon untuk memanggil SECURITY DEFINER functions — tidak butuh service role
function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid.' }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: 'Field wajib tidak lengkap.' }, { status: 400 });
  }

  const { phone, fullName, password, tenantId, inviteToken } = body;

  if (!isValidLocalPhone(phone)) {
    return NextResponse.json({ error: 'Nomor HP tidak valid.' }, { status: 400 });
  }
  if (fullName.trim().length < 2) {
    return NextResponse.json({ error: 'Nama lengkap terlalu pendek.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
  }
  if (!tenantId && !inviteToken) {
    return NextResponse.json({ error: 'Pilih koperasi yang ingin Anda ikuti.' }, { status: 400 });
  }

  const phoneE164 = toE164(phone);
  const email = phoneToAuthEmail(phoneE164);

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Konfigurasi server tidak lengkap.' }, { status: 500 });
  }

  // Buat akun Supabase auth — admin diperlukan untuk createUser tanpa konfirmasi email
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName.trim() },
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return NextResponse.json(
        { error: 'Nomor HP ini sudah terdaftar. Silakan masuk dengan nomor tersebut.' },
        { status: 409 },
      );
    }
    console.error('[api/auth/register] createUser error:', createError.message);
    return NextResponse.json({ error: 'Gagal membuat akun. Coba lagi.' }, { status: 500 });
  }

  const userId = userData.user.id;
  const anon = createAnonClient();

  if (inviteToken) {
    // Alur undangan
    const invite = await getInviteByToken(inviteToken);
    if (!invite) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Undangan tidak ditemukan.' }, { status: 404 });
    }
    if (invite.used) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Undangan ini sudah pernah digunakan.' }, { status: 409 });
    }
    if (invite.expired) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Undangan sudah kedaluwarsa.' }, { status: 410 });
    }

    // SECURITY DEFINER fn — bypass RLS + GRANT
    const { error: rpcErr } = await anon.rpc('activate_invited_member', {
      p_user_id: userId,
      p_tenant_id: invite.tenantId,
      p_role: invite.role,
      p_full_name: fullName.trim(),
      p_phone: phoneE164,
      p_invite_token: inviteToken,
    });

    if (rpcErr) {
      await admin.auth.admin.deleteUser(userId);
      console.error('[api/auth/register] activate_invited_member error:', rpcErr.message);
      return NextResponse.json({ error: 'Gagal menyelesaikan pendaftaran.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, redirect: '/dashboard' }, { status: 201 });
  }

  // Alur self-register — SECURITY DEFINER fn, status pending
  const { error: rpcErr } = await anon.rpc('register_pending_member', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_full_name: fullName.trim(),
    p_phone: phoneE164,
  });

  if (rpcErr) {
    await admin.auth.admin.deleteUser(userId);
    console.error('[api/auth/register] register_pending_member error:', rpcErr.message);
    return NextResponse.json({ error: `Gagal menyimpan data anggota: ${rpcErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, redirect: null }, { status: 201 });
}
