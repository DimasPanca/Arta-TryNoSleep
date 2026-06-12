'use client';

import type { ReactNode } from 'react';

import type { ApplicationStatus, LoanApplication, LoanInstallment } from '@/types/finance';

export function formatRp(n: number): string {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface StatusMeta {
  label: string;
  color: string;
  bg: string;
}

export const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  pending: { label: 'Menunggu keputusan', color: 'var(--color-amber-400)', bg: 'var(--color-amber-100)' },
  pending_pengurus: { label: 'Menunggu pengurus', color: 'var(--color-amber-400)', bg: 'var(--color-amber-100)' },
  pending_dinas: { label: 'Menunggu dinas', color: 'var(--color-amber-400)', bg: 'var(--color-amber-100)' },
  approved: { label: 'Disetujui', color: 'var(--color-grade-b)', bg: '#dbeafe' },
  rejected: { label: 'Ditolak', color: 'var(--color-danger-400)', bg: 'var(--color-danger-100)' },
  disbursed: { label: 'Dicairkan', color: 'var(--color-brand-700)', bg: 'var(--color-brand-50)' },
  active: { label: 'Cicilan berjalan', color: 'var(--color-brand-700)', bg: 'var(--color-brand-50)' },
  settled: { label: 'Lunas · aset diserahkan', color: 'var(--color-grade-a)', bg: '#dcfce7' },
};

export function StatusPill({ status }: { status: ApplicationStatus }): ReactNode {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: m.bg, color: m.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}

/** Kartu aset + rincian pembiayaan + penjelasan mekanisme. */
export function AssetCard({ app }: { app: LoanApplication }): ReactNode {
  const totalRepayable = Math.round(app.amount * (1 + app.marginPct / 100));
  const monthly = Math.round(totalRepayable / Math.max(1, app.tenorMonths));

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path d="M3 9h13l3 4v4h-2M3 9v8h2m0 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m8 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0M3 9V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[var(--color-text-primary)]">{app.assetName ?? 'Pembiayaan tunai'}</h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            {app.assetCategory ?? 'Pinjaman'}
            {app.vendorName ? ` · ${app.vendorName}` : ''}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {app.assetPrice != null && <Row label="Harga aset" value={formatRp(app.assetPrice)} />}
        {app.downPayment > 0 && <Row label="Uang muka" value={formatRp(app.downPayment)} />}
        <Row label="Dibiayai koperasi" value={formatRp(app.amount)} strong />
        <Row label="Tenor" value={`${app.tenorMonths} bulan`} />
        {app.marginPct > 0 && <Row label="Margin" value={`${app.marginPct}%`} />}
        <Row label="Estimasi cicilan/bln" value={formatRp(monthly)} strong />
      </dl>

      {app.purpose && (
        <p className="mt-3 rounded-xl bg-[var(--color-surface)] p-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          “{app.purpose}”
        </p>
      )}

      {app.financingType === 'asset' && (
        <div className="mt-3 flex gap-2 rounded-xl border border-dashed border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 text-[var(--color-brand-700)]" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 8v.01M11 12h1v4h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[11px] leading-relaxed text-[var(--color-brand-800)]">
            Aset dibeli & atas nama koperasi selama masa cicilan. Setelah lunas, kepemilikan resmi diserahkan ke anggota
            {app.assetTransferredAt ? ` (diserahkan ${formatDate(app.assetTransferredAt)}).` : '.'}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }): ReactNode {
  return (
    <div>
      <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
      <dd className={`mt-0.5 ${strong ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
        {value}
      </dd>
    </div>
  );
}

/** Jadwal cicilan + progres pelunasan. */
export function InstallmentSchedule({
  installments,
  canPay,
  onPay,
  payingId,
}: {
  installments: LoanInstallment[];
  canPay?: boolean;
  onPay?: (id: string) => void;
  payingId?: string | null;
}): ReactNode {
  if (installments.length === 0) {
    return (
      <p className="rounded-xl bg-[var(--color-surface)] p-3 text-center text-xs text-[var(--color-text-muted)]">
        Belum ada jadwal cicilan.
      </p>
    );
  }

  const total = installments.reduce((s, i) => s + i.amount, 0);
  const paid = installments.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const paidCount = installments.filter((i) => i.status === 'paid').length;
  const pct = total > 0 ? (paid / total) * 100 : 0;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-1 flex items-end justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">
          {paidCount}/{installments.length} cicilan lunas
        </span>
        <span className="font-[var(--font-mono)] text-xs text-[var(--color-text-secondary)]">
          {formatRp(paid)} / {formatRp(total)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface)]">
        <div className="h-full rounded-full bg-[var(--color-brand-600)] transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-3 space-y-1.5">
        {installments.map((it) => {
          const overdue = it.status !== 'paid' && it.dueDate < today;
          return (
            <li key={it.id} className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2">
              <span
                className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-xs font-bold ${
                  it.status === 'paid'
                    ? 'bg-[#dcfce7] text-[var(--color-grade-a)]'
                    : overdue
                      ? 'bg-[var(--color-danger-100)] text-[var(--color-danger-400)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                }`}
              >
                {it.status === 'paid' ? '✓' : it.installmentNo}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{formatRp(it.amount)}</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Jatuh tempo {formatDate(it.dueDate)}
                  {overdue ? ' · terlambat' : ''}
                </p>
              </div>
              {it.status === 'paid' ? (
                <span className="text-[11px] font-semibold text-[var(--color-grade-a)]">Lunas</span>
              ) : canPay && onPay ? (
                <button
                  type="button"
                  onClick={() => onPay(it.id)}
                  disabled={payingId === it.id}
                  className="flex-shrink-0 rounded-lg bg-[var(--color-brand-600)] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60 cursor-pointer"
                >
                  {payingId === it.id ? '…' : 'Catat bayar'}
                </button>
              ) : (
                <span className="text-[11px] text-[var(--color-text-muted)]">{overdue ? 'Terlambat' : 'Terjadwal'}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
