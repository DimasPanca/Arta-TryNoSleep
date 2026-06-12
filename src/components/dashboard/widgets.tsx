'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

/* ── Hook: animasi angka count-up ───────────────────────────── */
function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/* ── Hook: trigger animasi saat mount ───────────────────────── */
function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}

/* ── Sparkline ──────────────────────────────────────────────── */
function Sparkline({ points, color }: { points: number[]; color: string }): ReactNode {
  const mounted = useMounted();
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const w = 100;
  const h = 32;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / span) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        style={{
          strokeDasharray: 100,
          strokeDashoffset: mounted ? 0 : 100,
          transition: 'stroke-dashoffset 1.2s var(--ease-out)',
        }}
      />
    </svg>
  );
}

/* ── StatCard ───────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number;
  unit?: string;
  delta?: string;
  deltaUp?: boolean;
  icon: ReactNode;
  trend?: number[];
  decimals?: number;
}

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaUp = true,
  icon,
  trend,
  decimals = 0,
}: StatCardProps): ReactNode {
  const animated = useCountUp(value);
  const display =
    decimals > 0
      ? animated.toLocaleString('id-ID', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.round(animated).toLocaleString('id-ID');

  return (
    <div className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_-12px_rgba(0,0,0,0.18)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)] transition-colors group-hover:bg-[var(--color-brand-100)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            {icon}
          </svg>
        </span>
        {delta && (
          <span
            className={`flex items-center gap-1 text-xs font-semibold ${
              deltaUp ? 'text-[var(--color-grade-a)]' : 'text-[var(--color-danger-400)]'
            }`}
          >
            <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${deltaUp ? '' : 'rotate-180'}`} fill="currentColor" aria-hidden>
              <path d="M8 3l5 6H3l5-6Z" />
            </svg>
            {delta}
          </span>
        )}
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-[var(--font-display)] text-[2rem] leading-none tracking-tight text-[var(--color-text-primary)]">
          {display}
        </span>
        {unit && <span className="text-sm text-[var(--color-text-muted)]">{unit}</span>}
      </div>
      {trend && trend.length > 1 && (
        <div className="mt-3">
          <Sparkline points={trend} color="var(--color-brand-400)" />
        </div>
      )}
    </div>
  );
}

/* ── GradeDistribution ──────────────────────────────────────── */
const GRADE_COLOR: Record<string, string> = {
  A: 'var(--color-grade-a)',
  B: 'var(--color-grade-b)',
  C: 'var(--color-grade-c)',
  D: 'var(--color-grade-d)',
  F: 'var(--color-grade-f)',
};

export function GradeDistribution({
  data,
}: {
  data: { grade: string; count: number }[];
}): ReactNode {
  const mounted = useMounted();
  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = (d.count / total) * 100;
        return (
          <div key={d.grade} className="flex items-center gap-3">
            <span
              className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: GRADE_COLOR[d.grade] ?? 'var(--color-text-muted)' }}
            >
              {d.grade}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${pct}%` : '0%',
                  backgroundColor: GRADE_COLOR[d.grade] ?? 'var(--color-text-muted)',
                  transition: `width 0.9s var(--ease-out) ${i * 90}ms`,
                }}
              />
            </div>
            <span className="w-14 flex-shrink-0 text-right text-sm font-medium text-[var(--color-text-secondary)]">
              {d.count.toLocaleString('id-ID')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── ActivityFeed ───────────────────────────────────────────── */
export interface Activity {
  actor: string;
  action: string;
  time: string;
  grade?: string;
}

export function ActivityFeed({ items }: { items: Activity[] }): ReactNode {
  return (
    <ul className="space-y-1">
      {items.map((a, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[var(--color-surface)]"
        >
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[var(--color-brand-50)] text-xs font-semibold text-[var(--color-brand-800)]">
            {a.actor.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-[var(--color-text-primary)]">
              <span className="font-semibold">{a.actor}</span> {a.action}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{a.time}</p>
          </div>
          {a.grade && (
            <span
              className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md text-xs font-bold text-white"
              style={{ backgroundColor: GRADE_COLOR[a.grade] ?? 'var(--color-text-muted)' }}
            >
              {a.grade}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── ExpiryList ─────────────────────────────────────────────── */
export interface ExpiryItem {
  commodity: string;
  quantityKg: number;
  daysLeft: number;
}

export function ExpiryList({ items }: { items: ExpiryItem[] }): ReactNode {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => {
        const urgent = it.daysLeft <= 1;
        return (
          <li key={i} className="flex items-center gap-3">
            <span
              className={`h-2 w-2 flex-shrink-0 rounded-full ${
                urgent ? 'bg-[var(--color-danger-400)]' : 'bg-[var(--color-amber-400)]'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                {it.commodity}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {it.quantityKg.toLocaleString('id-ID')} kg
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                urgent
                  ? 'bg-[var(--color-danger-100)] text-[var(--color-danger-400)]'
                  : 'bg-[var(--color-amber-100)] text-[var(--color-amber-400)]'
              }`}
            >
              {it.daysLeft <= 0
                ? 'Hari ini'
                : `${it.daysLeft} hari`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── ActionHero ─────────────────────────────────────────────── */
export function ActionHero({
  href,
  title,
  subtitle,
  cta,
}: {
  href: string;
  title: string;
  subtitle: string;
  cta: string;
}): ReactNode {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-[var(--color-brand-800)] p-6 text-white">
      {/* dekorasi */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(90,158,90,0.4), transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(168,208,168,0.18), transparent 70%)' }}
      />
      <div className="relative">
        <h3 className="font-[var(--font-display)] text-2xl leading-tight tracking-tight">{title}</h3>
        <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-white/75">{subtitle}</p>
        <Link
          href={href}
          className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-brand-800)] transition-all duration-200 hover:gap-3 hover:bg-[var(--color-brand-50)] cursor-pointer"
        >
          {cta}
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
            <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ── Card shell + entrance ──────────────────────────────────── */
export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <section
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5 ${className}`}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
