'use client';

import { useEffect, useState, type ReactNode } from 'react';

import type { CreditHistoryEntry } from '@/types/finance';

type Reco = 'approve' | 'review' | 'reject';

const RECO_META: Record<Reco, { label: string; color: string; bg: string; note: string }> = {
  approve: { label: 'Disarankan: Setujui', color: 'var(--color-grade-a)', bg: '#dcfce7', note: 'Riwayat kredit baik, tanpa tunggakan aktif.' },
  review: { label: 'Disarankan: Tinjau', color: 'var(--color-amber-400)', bg: 'var(--color-amber-100)', note: 'Perlu tinjauan manual sebelum disetujui.' },
  reject: { label: 'Disarankan: Tolak', color: 'var(--color-danger-400)', bg: 'var(--color-danger-100)', note: 'Skor rendah atau ada tunggakan aktif.' },
};

export function recommend(score: number, history: CreditHistoryEntry[]): Reco {
  const hasArrears = history.some((h) => h.activeArrears > 0);
  if (score < 50 || hasArrears) return 'reject';
  if (score < 80) return 'review';
  return 'approve';
}

interface Props {
  score: number;
  history: CreditHistoryEntry[];
  applicantName?: string;
  onVerify?: () => void;
  verifying?: boolean;
  verifiedLive?: boolean;
}

export function CreditHistoryPanel({
  score,
  history,
  applicantName,
  onVerify,
  verifying,
  verifiedLive,
}: Props): ReactNode {
  const reco = recommend(score, history);
  const meta = RECO_META[reco];
  const totals = history.reduce(
    (a, h) => ({
      loans: a.loans + h.totalLoans,
      settled: a.settled + h.settledLoans,
      arrears: a.arrears + h.activeArrears,
    }),
    { loans: 0, settled: 0, arrears: 0 },
  );

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-[var(--color-brand-700)]" fill="none" aria-hidden>
            <path d="M12 3l8 3v5c0 4.5-3 8.5-8 10-5-1.5-8-5.5-8-10V6l8-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Riwayat kredit lintas koperasi</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand-700)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-600)]" />
          {verifiedLive ? 'Terverifikasi on-chain' : 'Dari ledger'}
        </span>
      </div>

      {applicantName && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Standing pembiayaan <span className="font-medium text-[var(--color-text-secondary)]">{applicantName}</span> di koperasi lain.
        </p>
      )}

      {/* Skor + rekomendasi */}
      <div className="mt-4 flex items-center gap-4">
        <ScoreGauge score={score} color={meta.color} />
        <div className="min-w-0">
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            {meta.label}
          </span>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">{meta.note}</p>
        </div>
      </div>

      {/* Ringkasan agregat */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Total pinjaman" value={totals.loans} />
        <MiniStat label="Lunas" value={totals.settled} tone="good" />
        <MiniStat label="Tunggakan aktif" value={totals.arrears} tone={totals.arrears > 0 ? 'bad' : 'muted'} />
      </div>

      {/* Per koperasi */}
      <div className="mt-4 space-y-2">
        {history.length === 0 ? (
          <p className="rounded-xl bg-[var(--color-surface)] p-3 text-center text-xs text-[var(--color-text-muted)]">
            Belum ada riwayat di koperasi lain — pemohon baru.
          </p>
        ) : (
          history.map((h) => <TenantRow key={h.tenantId} entry={h} />)
        )}
      </div>

      {onVerify && (
        <button
          type="button"
          onClick={onVerify}
          disabled={verifying}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-brand-50)] disabled:opacity-60 cursor-pointer"
        >
          {verifying ? (
            <span className="h-4 w-4 animate-arta-spin rounded-full border-2 border-[var(--color-brand-400)] border-t-transparent" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 0 0-14-3M4 15a8 8 0 0 0 14 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          Periksa ulang ke blockchain
        </button>
      )}
    </div>
  );
}

function TenantRow({ entry }: { entry: CreditHistoryEntry }): ReactNode {
  const ratio = entry.totalLoans > 0 ? entry.settledLoans / entry.totalLoans : 0;
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">{entry.tenantName}</span>
        {entry.activeArrears > 0 ? (
          <span className="flex-shrink-0 rounded-full bg-[var(--color-danger-100)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-danger-400)]">
            {entry.activeArrears} tunggakan
          </span>
        ) : (
          <span className="flex-shrink-0 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-grade-a)]">
            Lancar
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface)]">
          <div className="h-full rounded-full bg-[var(--color-grade-a)]" style={{ width: `${ratio * 100}%` }} />
        </div>
        <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
          {entry.settledLoans}/{entry.totalLoans} lunas
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)]">
        Diperbarui {new Date(entry.lastUpdated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

function ScoreGauge({ score, color }: { score: number; color: string }): ReactNode {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score]);
  const offset = circ - (Math.min(100, Math.max(0, shown)) / 100) * circ;
  return (
    <svg viewBox="0 0 88 88" className="h-20 w-20 flex-shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-surface)" strokeWidth="8" />
      <circle
        cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 0.9s var(--ease-out)' }}
      />
      <text x="44" y="42" textAnchor="middle" style={{ fontSize: '22px', fontFamily: 'var(--font-display)', fill: 'var(--color-text-primary)' }}>
        {Math.round(shown)}
      </text>
      <text x="44" y="58" textAnchor="middle" style={{ fontSize: '9px', fill: 'var(--color-text-muted)' }}>
        skor
      </text>
    </svg>
  );
}

function MiniStat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'good' | 'bad' | 'muted' }): ReactNode {
  const color =
    tone === 'good' ? 'var(--color-grade-a)' : tone === 'bad' ? 'var(--color-danger-400)' : 'var(--color-text-primary)';
  return (
    <div className="rounded-xl bg-[var(--color-surface)] p-2.5 text-center">
      <p className="font-[var(--font-display)] text-xl leading-none" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
