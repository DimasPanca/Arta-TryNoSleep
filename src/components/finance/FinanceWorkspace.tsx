'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { CreditHistoryPanel } from '@/components/finance/CreditHistoryPanel';
import { AssetCard, formatRp, InstallmentSchedule, StatusPill, STATUS_META } from '@/components/finance/shared';
import type { ApplicationStatus, CreditHistoryEntry, LoanApplication, LoanInstallment } from '@/types/finance';

interface Props {
  applications: LoanApplication[];
  tenantName: string;
  canDecide: boolean;
  canVerify: boolean;
  preview: boolean;
}

const PENDING: ApplicationStatus[] = ['pending', 'pending_pengurus', 'pending_dinas'];

export function FinanceWorkspace({ applications, tenantName, canDecide, canVerify, preview }: Props): ReactNode {
  const [apps, setApps] = useState<LoanApplication[]>(applications);
  const [selectedId, setSelectedId] = useState<string | null>(applications[0]?.id ?? null);

  const selected = apps.find((a) => a.id === selectedId) ?? null;

  const patch = useCallback((id: string, next: Partial<LoanApplication>) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...next } : a)));
  }, []);

  const total = apps.length;
  const pending = apps.filter((a) => PENDING.includes(a.status)).length;
  const active = apps.filter((a) => a.status === 'active').length;
  const disbursed = apps
    .filter((a) => a.status === 'active' || a.status === 'settled')
    .reduce((s, a) => s + a.amount, 0);

  return (
    <div className="space-y-6">
      <header className="animate-arta-rise">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-brand-700)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-600)]" />
          Pembiayaan aset · {tenantName}
        </div>
        <h1 className="mt-1 font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
          Pusat Keputusan Pembiayaan
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          Tinjau pengajuan dengan riwayat kredit lintas koperasi, lalu setujui, cairkan, dan pantau cicilan.
        </p>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total pengajuan" value={String(total)} />
        <Kpi label="Menunggu keputusan" value={String(pending)} accent="amber" />
        <Kpi label="Sedang dicicil" value={String(active)} accent="brand" />
        <Kpi label="Total tersalurkan" value={formatRp(disbursed)} accent="brand" />
      </div>

      <StatusBar apps={apps} />

      {preview && (
        <p className="rounded-xl bg-[var(--color-amber-100)] px-3 py-2 text-xs font-medium text-[var(--color-amber-400)]">
          Mode pratinjau — data contoh. Masuk sebagai pengurus untuk mengambil keputusan nyata.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Daftar pengajuan */}
        <div className="space-y-2 lg:col-span-5">
          {apps.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-card)] p-6 text-center text-sm text-[var(--color-text-muted)]">
              Belum ada pengajuan masuk.
            </p>
          ) : (
            apps.map((a) => (
              <ApplicationRow key={a.id} app={a} selected={a.id === selectedId} onSelect={() => setSelectedId(a.id)} />
            ))
          )}
        </div>

        {/* Detail terpilih */}
        <div className="lg:col-span-7">
          {selected ? (
            <DetailPanel
              key={selected.id}
              app={selected}
              canDecide={canDecide}
              canVerify={canVerify}
              onPatch={(next) => patch(selected.id, next)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-card)] p-10 text-center text-sm text-[var(--color-text-muted)]">
              Pilih pengajuan untuk melihat detail & riwayat kredit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Baris pengajuan ────────────────────────────────────────── */
function ApplicationRow({ app, selected, onSelect }: { app: LoanApplication; selected: boolean; onSelect: () => void }): ReactNode {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
        selected
          ? 'border-[var(--color-brand-400)] bg-[var(--color-brand-50)] shadow-[0_2px_12px_-6px_rgba(0,0,0,0.15)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-card)] hover:border-[var(--color-border-strong)]'
      }`}
    >
      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-sm font-semibold text-[var(--color-brand-800)]">
        {(app.applicantName ?? 'A').charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
          {app.applicantName ?? 'Anggota'}
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          {app.assetName ?? 'Pembiayaan'} · {formatRp(app.amount)}
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <StatusPill status={app.status} />
        {app.creditScore != null && (
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">skor {app.creditScore}</span>
        )}
      </div>
    </button>
  );
}

/* ── Panel detail + aksi ────────────────────────────────────── */
function DetailPanel({
  app,
  canDecide,
  canVerify,
  onPatch,
}: {
  app: LoanApplication;
  canDecide: boolean;
  canVerify: boolean;
  onPatch: (next: Partial<LoanApplication>) => void;
}): ReactNode {
  const [installments, setInstallments] = useState<LoanInstallment[] | null>(null);
  const [busy, setBusy] = useState<'' | 'approve' | 'reject' | 'disburse' | 'verify'>('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [credit, setCredit] = useState<{ score: number; history: CreditHistoryEntry[]; live: boolean }>({
    score: app.creditScore ?? 70,
    history: app.crossTenantData ?? [],
    live: false,
  });

  // Muat cicilan untuk pengajuan yang sudah berjalan
  useEffect(() => {
    if (app.status !== 'active' && app.status !== 'settled') {
      setInstallments(null);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(`/api/finance/installments?applicationId=${encodeURIComponent(app.id)}`);
        const json = await res.json();
        if (alive) setInstallments(json.ok ? (json.installments as LoanInstallment[]) : []);
      } catch {
        if (alive) setInstallments([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [app.id, app.status]);

  async function decide(verdict: 'approved' | 'rejected'): Promise<void> {
    setBusy(verdict === 'approved' ? 'approve' : 'reject');
    setError('');
    try {
      const res = await fetch('/api/finance/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, verdict, reason: verdict === 'rejected' ? reason : undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Gagal menyimpan keputusan.');
      const updated = json.application as LoanApplication | null;
      onPatch({ status: updated?.status ?? (verdict === 'approved' ? 'approved' : 'rejected') });
      setShowReject(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal.');
    } finally {
      setBusy('');
    }
  }

  async function disburse(): Promise<void> {
    setBusy('disburse');
    setError('');
    try {
      const res = await fetch('/api/finance/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Gagal mencairkan.');
      setInstallments(json.installments as LoanInstallment[]);
      onPatch({ status: 'active', disbursedAt: new Date().toISOString() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal.');
    } finally {
      setBusy('');
    }
  }

  async function pay(installmentId: string): Promise<void> {
    setPayingId(installmentId);
    setError('');
    try {
      const res = await fetch('/api/finance/repay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Gagal mencatat pembayaran.');
      const updatedInst = json.installment as LoanInstallment;
      setInstallments((prev) => (prev ? prev.map((i) => (i.id === updatedInst.id ? updatedInst : i)) : prev));
      if (json.settled) onPatch({ status: 'settled', assetTransferredAt: new Date().toISOString() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal.');
    } finally {
      setPayingId(null);
    }
  }

  async function verify(): Promise<void> {
    setBusy('verify');
    try {
      const res = await fetch('/api/finance/credit-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId: app.applicantId, requestingTenantId: app.targetTenantId }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setCredit({ score: json.data.score, history: json.data.history, live: true });
      }
    } catch {
      /* abaikan; tetap pakai data tersimpan */
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="animate-arta-rise space-y-4">
      <AssetCard app={app} />

      <CreditHistoryPanel
        score={credit.score}
        history={credit.history}
        {...(app.applicantName !== undefined && { applicantName: app.applicantName })}
        verifiedLive={credit.live}
        {...(canVerify && { onVerify: verify })}
        verifying={busy === 'verify'}
      />

      {error && (
        <p className="rounded-lg bg-[var(--color-danger-100)] px-3 py-2 text-xs font-medium text-[var(--color-danger-400)]">{error}</p>
      )}

      {/* Aksi sesuai status */}
      {canDecide && PENDING.includes(app.status) && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Keputusan</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Pertimbangkan skor & tunggakan di atas sebelum memutuskan.
          </p>
          {showReject && (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Alasan penolakan (opsional)"
              className="mt-3 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-400)]"
            />
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => decide('approved')}
              disabled={busy !== ''}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-50 cursor-pointer"
            >
              {busy === 'approve' ? 'Memproses…' : 'Setujui'}
            </button>
            <button
              type="button"
              onClick={() => (showReject ? decide('rejected') : setShowReject(true))}
              disabled={busy !== ''}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-danger-400)] px-4 py-2.5 text-sm font-semibold text-[var(--color-danger-400)] transition-colors hover:bg-[var(--color-danger-100)] disabled:opacity-50 cursor-pointer"
            >
              {busy === 'reject' ? 'Memproses…' : showReject ? 'Konfirmasi tolak' : 'Tolak'}
            </button>
          </div>
        </div>
      )}

      {canDecide && app.status === 'approved' && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Pencairan</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Koperasi membeli aset & membuat jadwal cicilan {app.tenorMonths} bulan.
          </p>
          <button
            type="button"
            onClick={disburse}
            disabled={busy !== ''}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-50 cursor-pointer"
          >
            {busy === 'disburse' ? 'Mencairkan…' : 'Cairkan & buat jadwal cicilan'}
          </button>
        </div>
      )}

      {(app.status === 'active' || app.status === 'settled') && installments && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Jadwal cicilan</p>
            {app.status === 'settled' && (
              <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-grade-a)]">
                Aset diserahkan
              </span>
            )}
          </div>
          <InstallmentSchedule
            installments={installments}
            canPay={canDecide && app.status === 'active'}
            onPay={pay}
            payingId={payingId}
          />
        </div>
      )}
    </div>
  );
}

/* ── Bar distribusi status ──────────────────────────────────── */
function StatusBar({ apps }: { apps: LoanApplication[] }): ReactNode {
  const order: ApplicationStatus[] = ['pending', 'approved', 'active', 'settled', 'rejected'];
  const counts = order
    .map((s) => ({ status: s, count: apps.filter((a) => a.status === s).length }))
    .filter((x) => x.count > 0);
  const total = counts.reduce((s, c) => s + c.count, 0) || 1;
  if (counts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
        {counts.map((c) => (
          <div key={c.status} style={{ width: `${(c.count / total) * 100}%`, backgroundColor: STATUS_META[c.status].color }} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {counts.map((c) => (
          <span key={c.status} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: STATUS_META[c.status].color }} />
            <span className="text-[var(--color-text-secondary)]">{STATUS_META[c.status].label}</span>
            <span className="font-[var(--font-mono)] text-[var(--color-text-muted)]">{c.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: 'amber' | 'brand' }): ReactNode {
  const color =
    accent === 'amber' ? 'var(--color-amber-400)' : accent === 'brand' ? 'var(--color-brand-700)' : 'var(--color-text-primary)';
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-1 font-[var(--font-display)] text-2xl leading-tight tracking-tight" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
