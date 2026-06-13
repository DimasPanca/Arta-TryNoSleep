import type { Metadata } from 'next';
import type React from 'react';

import { getInviteByToken } from '@/lib/supabase/admin';

import { RegisterForm, type InviteContext } from './RegisterForm';

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

  const props: { invite?: InviteContext; inviteError?: string } = {};
  if (invite) props.invite = invite;
  if (inviteError) props.inviteError = inviteError;

  return <RegisterForm {...props} />;
}
