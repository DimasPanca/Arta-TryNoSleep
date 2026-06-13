'use client';

import type { ReactNode } from 'react';

import { ROLE_META, TIER_META, TIER_ORDER, type RoleTier } from '@/lib/members/roles-meta';
import type { TenantRole } from '@/types/tenant';

/* ── Formatter ────────────────────────────────────────────────────── */

export function initials(name: string): string {
  return name
    .replace(/^(Koperasi|BPR|Dinas|CV|PT)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "3 hari lalu", "hari ini", "2 minggu lalu". */
export function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const days = Math.floor((Date.now() - then) / 864e5);
  if (days <= 0) return 'hari ini';
  if (days === 1) return 'kemarin';
  if (days < 7) return `${days} hari lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

/* ── Avatar ───────────────────────────────────────────────────────── */

export function MemberAvatar({
  name,
  role,
  size = 'md',
  ring = false,
}: {
  name: string;
  role: TenantRole;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
}): ReactNode {
  const accent = ROLE_META[role].accent;
  const dims =
    size === 'xl'
      ? 'h-16 w-16 text-lg'
      : size === 'lg'
        ? 'h-12 w-12 text-sm'
        : size === 'sm'
          ? 'h-8 w-8 text-[10px]'
          : 'h-10 w-10 text-xs';
  return (
    <span
      className={`grid flex-shrink-0 place-items-center rounded-full font-bold text-white ${dims} ${ring ? 'ring-2 ring-[var(--color-surface-card)]' : ''}`}
      style={{ backgroundColor: accent }}
      title={name}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ── Badge peran ──────────────────────────────────────────────────── */

export function RoleBadge({ role, size = 'md' }: { role: TenantRole; size?: 'sm' | 'md' }): ReactNode {
  const meta = ROLE_META[role];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full font-semibold ${pad}`}
      style={{ backgroundColor: `${meta.accent}1a`, color: meta.accent }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: meta.accent }} />
      {meta.label}
    </span>
  );
}

export function StatusDot({ status }: { status: 'active' | 'pending' | 'inactive' }): ReactNode {
  const map = {
    active: { color: 'var(--color-grade-a)', label: 'Aktif' },
    pending: { color: 'var(--color-amber-400)', label: 'Menunggu' },
    inactive: { color: 'var(--color-text-muted)', label: 'Nonaktif' },
  } as const;
  const m = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}

/* ── Donut komposisi peran (per tier) ─────────────────────────────── */

export function OrgDonut({ tierCounts, total }: { tierCounts: Record<RoleTier, number>; total: number }): ReactNode {
  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = TIER_ORDER.filter((t) => tierCounts[t] > 0).map((tier) => {
    const value = tierCounts[tier];
    const fraction = total > 0 ? value / total : 0;
    const seg = {
      tier,
      dash: fraction * circumference,
      gap: circumference - fraction * circumference,
      offset,
      accent: TIER_META[tier].accent,
    };
    offset += fraction * circumference;
    return seg;
  });

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Komposisi peran anggota">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-surface)" strokeWidth={stroke} />
        {segments.map((s, i) => (
          <circle
            key={s.tier}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.accent}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              transition: 'stroke-dasharray 0.7s cubic-bezier(0,0,0.2,1)',
              animation: `arta-rise var(--duration-slow) var(--ease-out) ${i * 80}ms both`,
            }}
          />
        ))}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-[var(--font-display)] text-3xl leading-none text-[var(--color-text-primary)]">{total}</span>
        <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">anggota</span>
      </div>
    </div>
  );
}

/* ── Ikon ─────────────────────────────────────────────────────────── */

export function UsersIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a2.5 2.5 0 1 0 0-5M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5m2 0c0-2-1-3.6-2.5-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 12l1.8 1.8L15 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SendIcon({ className = 'h-5 w-5' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4L21 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PhoneIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V18a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

export function SwapIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 7h13l-3-3m6 13H7l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M4 7h16M9 7V4.5h6V7m-7 0 .7 12a1.5 1.5 0 0 0 1.5 1.4h3.6a1.5 1.5 0 0 0 1.5-1.4L16 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

export function PlusIcon({ className = 'h-[18px] w-[18px]' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function LinkIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="M9 15l6-6M10.5 6.5l1-1a4 4 0 0 1 6 6l-1 1m-9 3-1 1a4 4 0 0 1-6-6l1-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ className = 'h-4 w-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
