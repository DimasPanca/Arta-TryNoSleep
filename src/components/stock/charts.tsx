'use client';

import { useEffect, useState, type ReactNode } from 'react';

const GRADE_COLOR: Record<string, string> = {
  A: 'var(--color-grade-a)',
  B: 'var(--color-grade-b)',
  C: 'var(--color-grade-c)',
  D: 'var(--color-grade-d)',
  F: 'var(--color-grade-f)',
};
const GRADE_ORDER = ['A', 'B', 'C', 'D', 'F'] as const;

function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}

/* ── Komposisi komoditas (berat, tersusun per grade) ────────────── */
export interface CommodityDatum {
  commodity: string;
  weightKg: number;
  grades: Record<string, number>;
}

export function CommodityBars({ data }: { data: CommodityDatum[] }): ReactNode {
  const mounted = useMounted();
  if (data.length === 0) return <EmptyHint>Tidak ada data komoditas.</EmptyHint>;
  const max = Math.max(1, ...data.map((d) => d.weightKg));

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.commodity} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
          <span className="truncate text-sm text-[var(--color-text-secondary)]" title={d.commodity}>
            {d.commodity}
          </span>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--color-surface)]">
            <div
              className="flex h-full"
              style={{
                width: mounted ? `${(d.weightKg / max) * 100}%` : '0%',
                transition: `width 0.9s var(--ease-out) ${i * 55}ms`,
              }}
            >
              {GRADE_ORDER.map((g) => {
                const w = d.grades[g] ?? 0;
                if (!w) return null;
                return (
                  <div key={g} style={{ width: `${(w / d.weightKg) * 100}%`, backgroundColor: GRADE_COLOR[g] }} />
                );
              })}
            </div>
          </div>
          <span className="font-[var(--font-mono)] text-xs tabular-nums text-[var(--color-text-secondary)]">
            {d.weightKg.toLocaleString('id-ID')} kg
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Pipeline status batch ──────────────────────────────────────── */
export interface StatusDatum {
  status: string;
  label: string;
  count: number;
  weightKg: number;
  color: string;
}

export function StatusPipeline({ data }: { data: StatusDatum[] }): ReactNode {
  const mounted = useMounted();
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {data.map((d, i) => (
        <div key={d.status} className="rounded-xl border border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-[var(--color-text-muted)]">{d.label}</span>
          </div>
          <p className="mt-1 font-[var(--font-display)] text-2xl leading-none text-[var(--color-text-primary)]">
            {d.count}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{d.weightKg.toLocaleString('id-ID')} kg</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-surface)]">
            <div
              className="h-full rounded-full"
              style={{
                width: mounted ? `${(d.count / total) * 100}%` : '0%',
                backgroundColor: d.color,
                transition: `width 0.8s var(--ease-out) ${i * 55}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Donut penyimpanan ──────────────────────────────────────────── */
export function StorageDonut({ ambientKg, coldKg }: { ambientKg: number; coldKg: number }): ReactNode {
  const mounted = useMounted();
  const total = ambientKg + coldKg || 1;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const coldLen = (coldKg / total) * circ;
  const pct = (n: number): string => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 120 120" className="h-28 w-28 flex-shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="14" stroke="var(--color-amber-400)" />
        <circle
          cx="60" cy="60" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
          stroke="var(--color-brand-600)"
          strokeDasharray={`${mounted ? coldLen : 0} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s var(--ease-out)' }}
        />
      </svg>
      <div className="space-y-3">
        <LegendRow color="var(--color-brand-600)" label="Pendingin (cold)" value={`${coldKg.toLocaleString('id-ID')} kg · ${pct(coldKg)}`} />
        <LegendRow color="var(--color-amber-400)" label="Suhu ruang" value={`${ambientKg.toLocaleString('id-ID')} kg · ${pct(ambientKg)}`} />
      </div>
    </div>
  );
}

/* ── Bucket kedaluwarsa ─────────────────────────────────────────── */
export interface ExpiryBucket {
  label: string;
  count: number;
  color: string;
}

export function ExpiryBuckets({ buckets }: { buckets: ExpiryBucket[] }): ReactNode {
  const mounted = useMounted();
  const total = buckets.reduce((s, b) => s + b.count, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-[var(--color-surface)]">
        {buckets.map((b, i) =>
          b.count ? (
            <div
              key={b.label}
              style={{
                width: mounted ? `${(b.count / total) * 100}%` : '0%',
                backgroundColor: b.color,
                transition: `width 0.8s var(--ease-out) ${i * 55}ms`,
              }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: b.color }} />
            <span className="truncate text-[var(--color-text-secondary)]">{b.label}</span>
            <span className="ml-auto font-[var(--font-mono)] tabular-nums text-[var(--color-text-muted)]">{b.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }): ReactNode {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">{value}</p>
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: ReactNode }): ReactNode {
  return <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">{children}</p>;
}
