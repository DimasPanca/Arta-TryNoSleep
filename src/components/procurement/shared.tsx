'use client';

import type { ReactNode } from 'react';

import { COOPERATIVES, getCooperative, OUR_COOP } from '@/lib/procurement/cooperatives';
import type { JointStatus } from '@/lib/procurement/overview';

export function formatRp(n: number): string {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

export function formatRpShort(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return `Rp ${Math.round(n)}`;
}

export function formatQty(n: number, unit: string): string {
  return `${n.toLocaleString('id-ID')} ${unit}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shortHash(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

export function initials(name: string): string {
  return name
    .replace(/^Koperasi\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

interface StatusMeta {
  label: string;
  color: string;
  bg: string;
}

export const STATUS_META: Record<JointStatus, StatusMeta> = {
  planning: { label: 'Perencanaan', color: 'var(--color-text-secondary)', bg: 'var(--color-surface)' },
  open: { label: 'Mengumpulkan kebutuhan', color: 'var(--color-grade-b)', bg: '#dbeafe' },
  confirmed: { label: 'Alokasi disepakati', color: 'var(--color-brand-700)', bg: 'var(--color-brand-50)' },
  purchasing: { label: 'Sedang dibeli', color: 'var(--color-amber-400)', bg: 'var(--color-amber-100)' },
  delivered: { label: 'Terkirim ke gudang', color: 'var(--color-grade-a)', bg: '#dcfce7' },
  closed: { label: 'Selesai', color: 'var(--color-text-muted)', bg: 'var(--color-surface)' },
};

export const STATUS_FLOW: JointStatus[] = ['planning', 'open', 'confirmed', 'purchasing', 'delivered'];

export function StatusPill({ status }: { status: JointStatus }): ReactNode {
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

/** Avatar bulat berisi inisial koperasi dengan warna aksennya. */
export function CoopAvatar({
  coopId,
  name,
  size = 'md',
  ring = false,
}: {
  coopId: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
}): ReactNode {
  const coop = getCooperative(coopId);
  const accent = coop?.accent ?? 'var(--color-brand-600)';
  const label = name ?? coop?.name ?? coopId;
  const dims = size === 'lg' ? 'h-11 w-11 text-sm' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  return (
    <span
      className={`grid flex-shrink-0 place-items-center rounded-full font-bold text-white ${dims} ${ring ? 'ring-2 ring-white' : ''}`}
      style={{ backgroundColor: accent }}
      title={label}
      aria-label={label}
    >
      {initials(label)}
    </span>
  );
}

/**
 * Diagram jejaring 5 koperasi — Melati Jaya (kita) di pusat, mitra mengelilingi.
 * Garis penghubung beranimasi (dash bergerak) untuk koperasi yang sedang
 * terlibat pengadaan. Hormati prefers-reduced-motion via util animate-arta-*.
 */
export function CooperativeNetwork({
  activeCoopIds,
}: {
  activeCoopIds: string[];
}): ReactNode {
  const partners = COOPERATIVES.filter((c) => !c.isUs);
  const cx = 180;
  const cy = 130;
  const radius = 96;
  const active = new Set(activeCoopIds);

  const nodes = partners.map((coop, i) => {
    const angle = (Math.PI * 2 * i) / partners.length - Math.PI / 2;
    return {
      coop,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      isActive: active.has(coop.id),
    };
  });

  return (
    <div className="overflow-hidden rounded-xl bg-[var(--color-surface)] p-2">
      <svg viewBox="0 0 360 260" className="h-auto w-full" role="img" aria-label="Jejaring koperasi Arta">
        {/* garis penghubung */}
        {nodes.map((n) => (
          <line
            key={`edge-${n.coop.id}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            stroke={n.isActive ? n.coop.accent : 'var(--color-border-strong)'}
            strokeWidth={n.isActive ? 2 : 1.25}
            strokeDasharray={n.isActive ? '4 4' : undefined}
            opacity={n.isActive ? 0.9 : 0.45}
          >
            {n.isActive && (
              <animate attributeName="stroke-dashoffset" from="16" to="0" dur="1s" repeatCount="indefinite" />
            )}
          </line>
        ))}

        {/* node mitra */}
        {nodes.map((n) => (
          <g key={`node-${n.coop.id}`}>
            {n.isActive && (
              <circle cx={n.x} cy={n.y} r="20" fill={n.coop.accent} opacity="0.16">
                <animate attributeName="r" values="18;24;18" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.18;0.04;0.18" dur="2.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={n.x} cy={n.y} r="16" fill={n.coop.accent} />
            <text x={n.x} y={n.y + 3.5} textAnchor="middle" className="fill-white" style={{ fontSize: 9, fontWeight: 700 }}>
              {initials(n.coop.name)}
            </text>
            <text
              x={n.x}
              y={n.y + (n.y > cy ? 32 : -24)}
              textAnchor="middle"
              style={{ fontSize: 8.5, fill: 'var(--color-text-muted)' }}
            >
              {n.coop.name.replace('Koperasi ', '')}
            </text>
          </g>
        ))}

        {/* pusat: Melati Jaya */}
        <circle cx={cx} cy={cy} r="30" fill="var(--color-brand-600)" />
        <circle cx={cx} cy={cy} r="30" fill="none" stroke="var(--color-brand-200)" strokeWidth="2" opacity="0.6">
          <animate attributeName="r" values="30;36;30" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x={cx} y={cy - 1} textAnchor="middle" className="fill-white" style={{ fontSize: 11, fontWeight: 700 }}>
          {initials(OUR_COOP.name)}
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" className="fill-white" style={{ fontSize: 7, opacity: 0.85 }}>
          KITA
        </text>
      </svg>
    </div>
  );
}

/* ── Ikon ─────────────────────────────────────────────────────────── */

export function PlusIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChainIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M9 15l6-6M10.5 6.5l1-1a4 4 0 0 1 6 6l-1 1m-9 3-1 1a4 4 0 0 1-6-6l1-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TruckIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M3 9h13v8H3V9Zm13 2h3l2 3v3h-5m-8 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m8 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0M3 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SavingsIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 4.9L12 18.8l-4.4 2.3.9-4.9L4.9 8.2l5-.7L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a2.5 2.5 0 1 0 0-5M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5m2 0c0-2-1-3.6-2.5-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BoxIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M21 8l-9-5-9 5m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ className = 'h-3.5 w-3.5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
