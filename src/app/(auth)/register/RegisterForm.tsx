'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';

import {
  FormAlert,
  PasswordField,
  PhoneField,
  SubmitButton,
  TextField,
} from '@/components/auth/fields';
import { createClient } from '@/lib/supabase/client';
import { isValidLocalPhone, phoneToAuthEmail, toE164 } from '@/lib/utils/phone';
import { roleLabel } from '@/lib/utils/roles';

export interface InviteContext {
  token: string;
  role: string;
  tenantName: string;
}

export interface TenantOption {
  id: string;
  name: string;
}

interface RegisterFormProps {
  invite?: InviteContext;
  inviteError?: string;
  tenants?: TenantOption[];
}

type Step = 'form' | 'done';

export function RegisterForm({ invite, inviteError, tenants = [] }: RegisterFormProps): ReactNode {
  const router = useRouter();
  const supabase = createClient();
  const isInvite = Boolean(invite);

  const [step, setStep] = useState<Step>('form');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Masukkan nama lengkap Anda.');
      return;
    }
    if (!isValidLocalPhone(phone)) {
      setError('Nomor HP tidak valid. Masukkan 9–13 digit.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (!isInvite && !tenantId) {
      setError('Pilih koperasi yang ingin Anda ikuti.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          fullName: fullName.trim(),
          password,
          tenantId: isInvite ? undefined : tenantId,
          inviteToken: isInvite ? invite?.token : undefined,
        }),
      });

      const payload = (await res.json().catch(() => null)) as { ok?: boolean; redirect?: string | null; error?: string } | null;

      if (!res.ok) {
        throw new Error(payload?.error ?? 'Terjadi kesalahan. Coba lagi.');
      }

      // Langsung masuk setelah akun dibuat
      const email = phoneToAuthEmail(toE164(phone));
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      if (payload?.redirect) {
        router.replace(payload.redirect);
        router.refresh();
      } else {
        setStep('done');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Tautan undangan tidak valid ──────────────────────────── */
  if (inviteError) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-danger-100)]">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--color-danger-400)]" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0V7Zm1 9a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
          </svg>
        </div>
        <h1 className="font-[var(--font-display)] text-[1.75rem] tracking-tight text-[var(--color-text-primary)]">
          Undangan tidak berlaku
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-[15px] text-[var(--color-text-secondary)]">
          {inviteError}
        </p>
        <Link
          href="/register"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
        >
          Daftar sebagai anggota
        </Link>
      </div>
    );
  }

  /* ── Sukses: menunggu persetujuan ─────────────────────────── */
  if (step === 'done') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[#dcfce7]">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--color-grade-a)]" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 7.7-5.5 5.5a1 1 0 0 1-1.4 0l-2.5-2.5a1 1 0 1 1 1.4-1.4l1.8 1.8 4.8-4.8a1 1 0 1 1 1.4 1.4Z" />
          </svg>
        </div>
        <h1 className="font-[var(--font-display)] text-[1.75rem] tracking-tight text-[var(--color-text-primary)]">
          Pendaftaran terkirim
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-[15px] text-[var(--color-text-secondary)]">
          Akun Anda menunggu persetujuan pengurus koperasi. Anda akan dapat masuk setelah disetujui.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-[var(--color-border-strong)] px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-brand-50)] cursor-pointer"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  /* ── Form pendaftaran ─────────────────────────────────────── */
  return (
    <div>
      {isInvite && invite && <InviteBadge role={invite.role} tenantName={invite.tenantName} />}
      <header className="mb-7">
        <h1 className="font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
          {isInvite ? 'Aktifkan akun Anda' : 'Buat akun anggota'}
        </h1>
        <p className="mt-1.5 text-[15px] text-[var(--color-text-secondary)]">
          {isInvite
            ? 'Lengkapi data berikut untuk mengaktifkan undangan.'
            : 'Isi data di bawah untuk mendaftar sebagai anggota koperasi.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <FormAlert tone="error">{error}</FormAlert>}

        <TextField
          id="fullName"
          label="Nama lengkap"
          value={fullName}
          onChange={setFullName}
          placeholder="cth. Budi Santoso"
          autoComplete="name"
          disabled={loading}
          autoFocus
        />

        <PhoneField value={phone} onChange={setPhone} disabled={loading} />

        <PasswordField
          label="Buat kata sandi"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="Minimal 6 karakter"
          disabled={loading}
        />

        {!isInvite && (
          <div>
            <label
              htmlFor="koperasi"
              className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
            >
              Pilih koperasi
            </label>
            <div className="relative">
              <select
                id="koperasi"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                disabled={loading}
                className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] px-4 py-3 pr-10 text-[15px] text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-brand-400)] focus:ring-4 focus:ring-[var(--color-brand-100)] disabled:opacity-60 cursor-pointer"
              >
                <option value="" disabled>
                  Pilih koperasi…
                </option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 20 20"
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
                fill="currentColor"
                aria-hidden
              >
                <path d="M5.2 7.5 10 12l4.8-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
              Keanggotaan akan aktif setelah disetujui pengurus koperasi.
            </p>
          </div>
        )}

        <div className="pt-1">
          <SubmitButton loading={loading}>
            {isInvite ? 'Aktifkan & Masuk' : 'Kirim Pendaftaran'}
          </SubmitButton>
        </div>
      </form>

      {!isInvite && (
        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="font-semibold text-[var(--color-brand-700)] underline-offset-4 transition-colors hover:text-[var(--color-brand-800)] hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      )}
    </div>
  );
}

/* ── Badge konteks undangan ─────────────────────────────────── */
function InviteBadge({ role, tenantName }: { role: string; tenantName: string }): ReactNode {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-4 py-3">
      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-brand-600)] text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M16 11a4 4 0 1 0-8 0M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--color-text-secondary)]">Undangan sebagai</p>
        <p className="truncate text-sm font-semibold text-[var(--color-brand-800)]">
          {roleLabel(role)} · {tenantName}
        </p>
      </div>
    </div>
  );
}
