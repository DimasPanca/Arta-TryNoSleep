'use client';

import { useState, type ReactNode } from 'react';

import { AssetCard, formatRp, InstallmentSchedule, StatusPill } from '@/components/finance/shared';
import type { CreditHistoryEntry, LoanApplication, LoanInstallment } from '@/types/finance';

const CATEGORIES = ['Alat olah tanah', 'Pompa air', 'Alat panen', 'Alat pasca-panen', 'Kendaraan angkut', 'Lainnya'];
const TENORS = [6, 12, 18, 24, 36];

interface Props {
  tenantId: string;
  tenantName: string;
  applications: LoanApplication[];
  preview: boolean;
}

export function ApplicantView({ tenantId, tenantName, applications, preview }: Props): ReactNode {
  const [apps, setApps] = useState<LoanApplication[]>(applications);

  return (
    <div className="space-y-6">
      <header className="animate-arta-rise">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-brand-700)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-600)]" />
          Pembiayaan aset pertanian
        </div>
        <h1 className="mt-1 font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
          Ajukan pembiayaan
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          {tenantName} membelikan alat pertanian yang Anda butuhkan; cicil hingga lunas, lalu aset menjadi milik Anda.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ApplyForm
            tenantId={tenantId}
            disabled={preview}
            onCreated={(app) => setApps((prev) => [app, ...prev])}
          />
        </div>
        <div className="space-y-3 lg:col-span-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Pengajuan saya</h2>
          {apps.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-card)] p-6 text-center text-sm text-[var(--color-text-muted)]">
              Belum ada pengajuan. Isi formulir untuk memulai.
            </p>
          ) : (
            apps.map((a) => <MyApplicationCard key={a.id} app={a} />)
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Formulir pengajuan ─────────────────────────────────────── */
function ApplyForm({
  tenantId,
  disabled,
  onCreated,
}: {
  tenantId: string;
  disabled: boolean;
  onCreated: (app: LoanApplication) => void;
}): ReactNode {
  const [assetName, setAssetName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [down, setDown] = useState('');
  const [vendor, setVendor] = useState('');
  const [tenor, setTenor] = useState(24);
  const [purpose, setPurpose] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'rejected' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [rejectHistory, setRejectHistory] = useState<CreditHistoryEntry[]>([]);

  const priceNum = Number(price) || 0;
  const downNum = Number(down) || 0;
  const financed = Math.max(0, priceNum - downNum);
  const monthly = financed > 0 ? Math.round(financed / tenor) : 0;
  const valid = assetName.trim().length > 0 && priceNum > 0 && downNum < priceNum && !disabled;

  async function submit(): Promise<void> {
    setStatus('submitting');
    setMessage('');
    try {
      const res = await fetch('/api/finance/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTenantId: tenantId,
          financingType: 'asset',
          assetName: assetName.trim(),
          assetCategory: category,
          assetPrice: priceNum,
          downPayment: downNum,
          vendorName: vendor.trim() || undefined,
          tenorMonths: tenor,
          purpose: purpose.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.status === 422) {
        setStatus('rejected');
        setMessage(json.error ?? 'Pengajuan ditolak otomatis.');
        setRejectHistory((json.data?.history as CreditHistoryEntry[]) ?? []);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? 'Gagal mengirim pengajuan.');
      setStatus('done');
      setMessage('Pengajuan terkirim & tercatat. Menunggu keputusan pengurus koperasi.');
      if (json.data?.application) onCreated(json.data.application as LoanApplication);
      setAssetName('');
      setPrice('');
      setDown('');
      setVendor('');
      setPurpose('');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Terjadi kesalahan.');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-brand-600)] text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path d="m5 13 4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="mt-3 text-sm font-semibold text-[var(--color-brand-800)]">{message}</p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-3 inline-flex rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
        >
          Ajukan lagi
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
      {disabled && (
        <p className="mb-3 rounded-lg bg-[var(--color-amber-100)] px-3 py-2 text-xs font-medium text-[var(--color-amber-400)]">
          Mode pratinjau — masuk sebagai anggota untuk mengajukan pembiayaan.
        </p>
      )}

      <div className="space-y-3">
        <Field label="Nama aset / alat">
          <input
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="mis. Traktor mini Quick G1000"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Vendor / toko (opsional)">
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="mis. CV Tani Jaya" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Harga aset (Rp)">
            <input type="number" inputMode="numeric" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          <Field label="Uang muka (Rp, opsional)">
            <input type="number" inputMode="numeric" min="0" value={down} onChange={(e) => setDown(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
        </div>

        <Field label="Tenor cicilan">
          <div className="flex flex-wrap gap-2">
            {TENORS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTenor(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  tenor === t
                    ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                }`}
              >
                {t} bln
              </button>
            ))}
          </div>
        </Field>

        <Field label="Tujuan penggunaan (opsional)">
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            placeholder="mis. mengolah lahan 2 ha dan menyewakan ke petani sekitar"
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>

      {/* Ringkasan dibiayai */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[var(--color-surface)] p-3">
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Dibiayai koperasi</p>
          <p className="font-[var(--font-display)] text-xl text-[var(--color-text-primary)]">{formatRp(financed)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Estimasi cicilan/bln</p>
          <p className="font-[var(--font-display)] text-xl text-[var(--color-brand-700)]">{formatRp(monthly)}</p>
        </div>
      </div>

      {(status === 'error' || status === 'rejected') && (
        <div className="mt-3 rounded-lg bg-[var(--color-danger-100)] px-3 py-2 text-xs font-medium text-[var(--color-danger-400)]">
          {message}
          {rejectHistory.length > 0 && (
            <span className="mt-1 block font-normal text-[var(--color-text-secondary)]">
              Tunggakan terdeteksi di: {rejectHistory.filter((h) => h.activeArrears > 0).map((h) => h.tenantName).join(', ')}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!valid || status === 'submitting'}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {status === 'submitting' ? (
          <>
            <span className="h-4 w-4 animate-arta-spin rounded-full border-2 border-white/40 border-t-white" />
            Mengirim…
          </>
        ) : (
          'Ajukan pembiayaan'
        )}
      </button>
    </div>
  );
}

/* ── Kartu pengajuan milik anggota ──────────────────────────── */
function MyApplicationCard({ app }: { app: LoanApplication }): ReactNode {
  const [open, setOpen] = useState(false);
  const [installments, setInstallments] = useState<LoanInstallment[] | null>(null);

  async function toggle(): Promise<void> {
    const next = !open;
    setOpen(next);
    if (next && installments === null && (app.status === 'active' || app.status === 'settled')) {
      try {
        const res = await fetch(`/api/finance/installments?applicationId=${encodeURIComponent(app.id)}`);
        const json = await res.json();
        setInstallments(json.ok ? (json.installments as LoanInstallment[]) : []);
      } catch {
        setInstallments([]);
      }
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
      <button type="button" onClick={toggle} className="flex w-full items-center gap-3 text-left cursor-pointer">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{app.assetName ?? 'Pembiayaan'}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{formatRp(app.amount)} · {app.tenorMonths} bln</p>
        </div>
        <StatusPill status={app.status} />
      </button>
      {open && (
        <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
          <AssetCard app={app} />
          {(app.status === 'active' || app.status === 'settled') && installments && (
            <InstallmentSchedule installments={installments} />
          )}
        </div>
      )}
    </div>
  );
}

/* ── util kecil ─────────────────────────────────────────────── */
const inputCls =
  'mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-400)]';

function Field({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
