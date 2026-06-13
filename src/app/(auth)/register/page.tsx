import type { Metadata } from 'next';
import type React from 'react';

import { createClient } from '@supabase/supabase-js';

import { getInviteByToken } from '@/lib/supabase/admin';

import { RegisterForm, type InviteContext, type TenantOption } from './RegisterForm';

export const metadata: Metadata = {
  title: 'Daftar · Arta',
  description: 'Buat akun koperasi Anda di Arta.',
};

interface RegisterPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps): Promise<React.JSX.Element> {
  const { token } = await searchParams;

  let invite: InviteContext | undefined;
  let inviteError: string | undefined;

  if (token) {
    const details = await getInviteByToken(token);
    if (!details) {
      inviteError = 'Tautan undangan tidak valid atau tidak ditemukan.';
    } else if (details.used) {
      inviteError = 'Undangan ini sudah pernah digunakan.';
    } else if (details.expired) {
      inviteError = 'Undangan sudah kedaluwarsa. Minta tautan baru dari pengurus.';
    } else {
      invite = {
        token: details.token,
        role: details.role,
        tenantName: details.tenantName,
      };
    }
  }

  // Ambil daftar koperasi via anon client (policy "tenants_select_anon" memberi akses publik)
  let tenants: TenantOption[] = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (error) console.error('[register/page] tenants fetch error:', error.message);
    tenants = (data ?? []) as TenantOption[];
  } catch (e) {
    console.error('[register/page] tenants fetch threw:', e);
  }

  return (
    <RegisterForm
      {...(invite !== undefined ? { invite } : {})}
      {...(inviteError !== undefined ? { inviteError } : {})}
      tenants={tenants}
    />
  );
}
