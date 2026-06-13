'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import type { AuditModule, FabricChaincode, TrustTone } from '@/lib/audit/audit-overview';

/* ── Formatter ────────────────────────────────────────────────────── */

export function formatRpShort(n: number): string {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n}`;
}

export function formatTs(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';
}

export function shortHash(h: string): string {
  return h.length > 18 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h;
}

export function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  if (m < 1440) return `${Math.floor(m / 60)} jam lalu`;
  return `${Math.floor(m / 1440)} hari lalu`;
}

/* ── Count-up hook (hormati reduced-motion) ───────────────────────── */

export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    const start = performance.now();
    function tick(now: number): void {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

/* ── Trust Gauge (arc semicircle, gradient skor) ──────────────────── */

export function TrustGauge({ score, tone, grade }: { score: number; tone: TrustTone; grade: string }): ReactNode {
  const gid = useId().replace(/:/g, '');
  const animated = useCountUp(score);
  const R = 90;
  const cx = 120;
  const cy = 120;
  const arcLen = Math.PI * R; // setengah lingkaran
  const frac = Math.max(0, Math.min(1, animated / 100));

  // titik ujung arc terisi
  const angle = Math.PI - frac * Math.PI;
  const endX = cx + R * Math.cos(angle);
  const endY = cy - R * Math.sin(angle);

  return (
    <div className="relative" style={{ width: 240, height: 150 }}>
      <svg viewBox="0 0 240 150" className="h-auto w-full" role="img" aria-label={`Skor kepercayaan ${score} dari 100`}>
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="45%" stopColor="#d97706" />
            <stop offset="75%" stopColor="#5a9e5a" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        {/* track */}
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="var(--color-surface)" strokeWidth="16" strokeLinecap="round" />
        {/* fill */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke={`url(#g-${gid})`}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${frac * arcLen} ${arcLen}`}
        />
        {/* penanda ujung */}
        <circle cx={endX} cy={endY} r="9" fill="var(--color-surface-card)" stroke={TONE_HEX[tone]} strokeWidth="3.5" />
        {/* skala */}
        <text x={cx - R} y={cy + 18} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--color-text-muted)' }}>0</text>
        <text x={cx + R} y={cy + 18} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--color-text-muted)' }}>100</text>
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: 48 }}>
        <span className="font-[var(--font-display)] text-[3rem] leading-none text-[var(--color-text-primary)]">{Math.round(animated)}</span>
        <span
          className="mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: TONE_HEX[tone] }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}

const TONE_HEX: Record<TrustTone, string> = {
  excellent: '#16a34a',
  good: '#3a7a3a',
  fair: '#d97706',
  weak: '#dc2626',
};

/* ── Sparkline (area) ─────────────────────────────────────────────── */

export function Sparkline({
  points,
  color = 'var(--color-brand-600)',
  width = 88,
  height = 30,
}: {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
}): ReactNode {
  const gid = useId().replace(/:/g, '');
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - 3 - ((p - min) / range) * (height - 6);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const last = coords[coords.length - 1]!;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={color} />
    </svg>
  );
}

/* ── Pillar bar ───────────────────────────────────────────────────── */

export function PillarBar({ score, color }: { score: number; color: string }): ReactNode {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface)]">
      <div
        className="h-full rounded-full transition-all duration-[900ms] ease-[cubic-bezier(0,0,0.2,1)]"
        style={{ width: `${Math.round(score * 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ── Verified seal ────────────────────────────────────────────────── */

export function VerifiedSeal({ label = 'Terverifikasi Fabric', compact = false }: { label?: string; compact?: boolean }): ReactNode {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-50)] font-semibold text-[var(--color-brand-700)] ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}
    >
      <ShieldCheckIcon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {label}
    </span>
  );
}

/* ── Modul & chaincode visual ─────────────────────────────────────── */

export interface Visual {
  color: string;
  label: string;
  Icon: (props: { className?: string }) => ReactNode;
}

export function moduleVisual(mod: AuditModule | 'system'): Visual {
  switch (mod) {
    case 'finance': return { color: '#2563eb', label: 'Pembiayaan', Icon: FinanceIcon };
    case 'stock': return { color: '#16a34a', label: 'Stok', Icon: StockIcon };
    case 'members': return { color: '#7c3aed', label: 'Anggota', Icon: MembersIcon };
    case 'procurement': return { color: '#0e7490', label: 'Pengadaan', Icon: ProcurementIcon };
    case 'blockchain': return { color: '#3a7a3a', label: 'Blockchain', Icon: ChainIcon };
    default: return { color: 'var(--color-text-muted)', label: 'Sistem', Icon: SystemIcon };
  }
}

export function chaincodeVisual(cc: FabricChaincode): Visual {
  switch (cc) {
    case 'stock-trace': return { color: '#16a34a', label: 'stock-trace', Icon: StockIcon };
    case 'credit-history': return { color: '#2563eb', label: 'credit-history', Icon: FinanceIcon };
    case 'procurement': return { color: '#0e7490', label: 'procurement', Icon: ProcurementIcon };
  }
}

/* ── Ikon (SVG, bukan emoji) ──────────────────────────────────────── */

export function ShieldCheckIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FinanceIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 9.5v5M18 9.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ProcurementIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M3 5h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L20 8H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="20" r="1.2" fill="currentColor" />
      <circle cx="17" cy="20" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function StockIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M21 8l-9-5-9 5m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MembersIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a2.5 2.5 0 1 0 0-5M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5m2 0c0-2-1-3.6-2.5-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChainIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M9 15l6-6M10.5 6.5l1-1a4 4 0 0 1 6 6l-1 1m-9 3-1 1a4 4 0 0 1-6-6l1-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CubeIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 2.5l8 4.5v9l-8 4.5-8-4.5v-9l8-4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 7l8 4.5L20 7M12 11.5V21" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function SystemIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AlertIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 3.5 2 20h20L12 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 9.5v4.5M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function InfoIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function XIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowUpIcon({ className = 'h-3 w-3' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 19V5m0 0-6 6m6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowDownIcon({ className = 'h-3 w-3' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 5v14m0 0 6-6m-6 6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PrinterIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="6" y="14" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function CopyIcon({ className = 'h-3.5 w-3.5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ShareIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="18" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.1 10.9 7.8-3.8M8.1 13.1l7.8 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ActivityIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M3 12h4l2.5-7 5 16 2.5-9H21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DocumentIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v4h4M8 12h8M8 15.5h8M8 19h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
