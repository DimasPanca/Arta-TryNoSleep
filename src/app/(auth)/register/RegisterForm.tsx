'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

import {
  FormAlert,
  OtpInput,
  PasswordField,
  PhoneField,
  SubmitButton,
  TextField,
} from '@/components/auth/fields';
import { createClient } from '@/lib/supabase/client';
import { formatPhoneDisplay, isValidLocalPhone, toE164 } from '@/lib/utils/phone';
import { roleLabel } from '@/lib/utils/roles';

export interface InviteContext {
  token: string;
  role: string;
  tenantName: string;
}

interface RegisterFormProps {
  invite?: InviteContext;
  inviteError?: string;
}

interface TenantOption {
  id: string;
  name: string;
}

type Step = 'phone' | 'otp' | 'details' | 'done';
const RESEND_SECONDS = 60;

export function RegisterForm({ invite, inviteError }: RegisterFormProps): ReactNode {
  const router = useRouter();
  const supabase = createClient();
  const isInvite = Boolean(invite);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Muat daftar koperasi untuk self-register saat masuk tahap detail
  useEffect(() => {
    if (step !== 'details' || isInvite) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (active && data) setTenants(data as TenantOption[]);
    })();
    return () => {
      active = false;
    };
  }, [step, isInvite, supabase]);

  async function sendOtp(): Promise<void> {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: toE164(phone),
      options: { channel: 'whatsapp' },
    });
    if (otpError) throw otpError;
  }

  async function handleSendCode(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!isValidLocalPhone(phone)) {
      setError('Nomor WhatsApp tidak valid. Masukkan 9–13 digit.');
      return;
    }
    setLoading(true);
    try {
      await sendOtp();
      setStep('otp');
      setCooldown(RESEND_SECONDS);
    } catch {
      setError('Gagal mengirim kode. Periksa nomor Anda dan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError('Masukkan 6 digit kode verifikasi.');
      return;
    }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: toE164(phone),
        token: otp,
        type: 'sms',
      });
      if (verifyError) throw verifyError;
      setStep('details');
    } catch {
      setError('Kode salah atau kedaluwarsa. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) {
      setError('Masukkan nama lengkap Anda.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      // Set kata sandi agar bisa login dengan password nantinya
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;

      if (isInvite && invite) {
        const res = await fetch('/api/auth/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: invite.token, fullName: fullName.trim() }),
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? 'Gagal menyelesaikan pendaftaran.');
        }
        router.replace('/dashboard');
        router.refresh();
        return;
      }

      // Self-register anggota → status pending
      if (!tenantId) {
        setError('Pilih koperasi yang ingin Anda ikuti.');
        setLoading(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi tidak valid. Verifikasi ulang nomor Anda.');

      const { error: insertError } = await supabase.from('members').insert({
        user_id: user.id,
        tenant_id: tenantId,
        role: 'anggota',
        status: 'pending',
        full_name: fullName.trim(),
        phone: user.phone ?? toE164(phone),
      });
      if (insertError) throw insertError;

      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(): Promise<void> {
    if (cooldown > 0) return;
    setError(null);
    try {
      await sendOtp();
      setCooldown(RESEND_SECONDS);
    } catch {
      setError('Gagal mengirim ulang kode.');
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

  /* ── Sukses (self-register pending) ───────────────────────── */
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
          Akun Anda menunggu persetujuan pengurus koperasi. Anda akan dapat masuk
          setelah disetujui.
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

  /* ── Tahap: nomor HP ──────────────────────────────────────── */
  if (step === 'phone') {
    return (
      <div>
        {isInvite && invite && <InviteBadge role={invite.role} tenantName={invite.tenantName} />}
        <header className="mb-7">
          <h1 className="font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
            {isInvite ? 'Aktifkan akun Anda' : 'Buat akun anggota'}
          </h1>
          <p className="mt-1.5 text-[15px] text-[var(--color-text-secondary)]">
            {isInvite
              ? 'Verifikasi nomor WhatsApp untuk mengaktifkan undangan.'
              : 'Daftar dengan nomor WhatsApp untuk bergabung dengan koperasi.'}
          </p>
        </header>

        <form onSubmit={handleSendCode} className="space-y-4" noValidate>
          {error && <FormAlert tone="error">{error}</FormAlert>}
          <PhoneField value={phone} onChange={setPhone} disabled={loading} />
          <SubmitButton loading={loading}>Kirim Kode Verifikasi</SubmitButton>
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

  /* ── Tahap: OTP ───────────────────────────────────────────── */
  if (step === 'otp') {
    return (
      <div>
        <header className="mb-7">
          <h1 className="font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
            Masukkan kode
          </h1>
          <p className="mt-1.5 text-[15px] text-[var(--color-text-secondary)]">
            Kami mengirim 6 digit kode ke{' '}
            <span className="font-semibold text-[var(--color-text-primary)]">
              {formatPhoneDisplay(phone)}
            </span>
            .
          </p>
        </header>

        <form onSubmit={handleVerify} className="space-y-5" noValidate>
          {error && <FormAlert tone="error">{error}</FormAlert>}
          <OtpInput value={otp} onChange={setOtp} disabled={loading} autoFocus />
          <SubmitButton loading={loading} disabled={otp.length !== 6}>
            Verifikasi
          </SubmitButton>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setOtp('');
              setError(null);
            }}
            className="font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            ← Ganti nomor
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="font-semibold text-[var(--color-brand-700)] transition-colors hover:text-[var(--color-brand-800)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed cursor-pointer"
          >
            {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : 'Kirim ulang kode'}
          </button>
        </div>
      </div>
    );
  }

  /* ── Tahap: detail akun ───────────────────────────────────── */
  return (
    <div>
      {isInvite && invite && <InviteBadge role={invite.role} tenantName={invite.tenantName} />}
      <header className="mb-7">
        <h1 className="font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
          Lengkapi data Anda
        </h1>
        <p className="mt-1.5 text-[15px] text-[var(--color-text-secondary)]">
          Hampir selesai. Lengkapi data berikut untuk menyelesaikan pendaftaran.
        </p>
      </header>

      <form onSubmit={handleComplete} className="space-y-4" noValidate>
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
                  {tenants.length === 0 ? 'Memuat daftar koperasi…' : 'Pilih koperasi…'}
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

        <SubmitButton loading={loading}>
          {isInvite ? 'Selesaikan & Masuk' : 'Kirim Pendaftaran'}
        </SubmitButton>
      </form>
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
