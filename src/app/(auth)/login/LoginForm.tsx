'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';

import {
  FormAlert,
  PasswordField,
  SubmitButton,
  TextField,
} from '@/components/auth/fields';
import { createClient } from '@/lib/supabase/client';
import { phoneToAuthEmail, toE164 } from '@/lib/utils/phone';

export function LoginForm(): ReactNode {
  const router = useRouter();
  const supabase = createClient();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Lengkapi email/nomor WhatsApp dan kata sandi.');
      return;
    }

    setLoading(true);
    try {
      // Phone login uses a deterministic derived email (no Supabase phone auth required)
      const credentials = identifier.includes('@')
        ? { email: identifier.trim(), password }
        : { email: phoneToAuthEmail(toE164(identifier)), password };

      const { error: signInError } = await supabase.auth.signInWithPassword(credentials);
      if (signInError) throw signInError;

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Email/nomor WhatsApp atau kata sandi salah. Coba lagi.');
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="mb-7">
        <h1 className="font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
          Selamat datang kembali
        </h1>
        <p className="mt-1.5 text-[15px] text-[var(--color-text-secondary)]">
          Masuk dengan akun koperasi Anda untuk melanjutkan.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <FormAlert tone="error">{error}</FormAlert>}

        <TextField
          id="identifier"
          label="Email atau nomor WhatsApp"
          value={identifier}
          onChange={setIdentifier}
          placeholder="nama@email.com atau 0812…"
          autoComplete="username"
          disabled={loading}
          autoFocus
        />

        <PasswordField
          value={password}
          onChange={setPassword}
          disabled={loading}
          autoComplete="current-password"
        />

        <div className="pt-1">
          <SubmitButton loading={loading}>Masuk</SubmitButton>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
        Belum punya akun?{' '}
        <Link
          href="/register"
          className="font-semibold text-[var(--color-brand-700)] underline-offset-4 transition-colors hover:text-[var(--color-brand-800)] hover:underline"
        >
          Daftar sebagai anggota
        </Link>
      </p>
    </div>
  );
}
