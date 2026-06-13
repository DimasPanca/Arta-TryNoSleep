'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { hasPermission, type Permission } from '@/constants/roles';
import { createClient } from '@/lib/supabase/client';
import { roleLabel } from '@/lib/utils/roles';
import type { TenantRole } from '@/types/tenant';

interface NavItem {
  href: string;
  label: string;
  perm?: Permission;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Ringkasan',
    icon: <path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z" />,
  },
  {
    href: '/stock',
    label: 'Stok',
    perm: 'stock:read',
    icon: (
      <path d="M3 7l9-4 9 4-9 4-9-4Zm0 5l9 4 9-4M3 17l9 4 9-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    ),
  },
  {
    href: '/scan',
    label: 'Scan',
    perm: 'scan:execute',
    icon: (
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: '/finance',
    label: 'Keuangan',
    perm: 'finance:read',
    icon: (
      <path d="M3 7h18v10H3V7Zm0 4h18M7 15h2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    ),
  },
  {
    href: '/procurement',
    label: 'Pengadaan',
    perm: 'procurement:read',
    icon: (
      <path d="M4 5h2l2 11h9l2-7H7M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    ),
  },
  {
    href: '/members',
    label: 'Anggota',
    perm: 'members:manage',
    icon: (
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a2.5 2.5 0 1 0 0-5M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5m2 0c0-2-1-3.6-2.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: '/audit',
    label: 'Audit',
    perm: 'audit:read',
    icon: (
      <path d="M12 3l8 3v5c0 4.5-3 8.5-8 10-5-1.5-8-5.5-8-10V6l8-3Zm-1 9 1.5 1.5L15 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    ),
  },
];

interface CommandBarProps {
  role: TenantRole;
  name: string;
  tenantName: string;
  preview: boolean;
}

export function CommandBar({ role, name, tenantName, preview }: CommandBarProps): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const items = NAV_ITEMS.filter((item) => !item.perm || hasPermission(role, item.perm));

  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const [menuOpen, setMenuOpen] = useState(false);

  const activeHref =
    items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.href ??
    items[0]?.href ??
    '/dashboard';

  const measure = useCallback(() => {
    const el = itemRefs.current[activeHref];
    const nav = navRef.current;
    if (!el || !nav) return;
    const r = el.getBoundingClientRect();
    const nr = nav.getBoundingClientRect();
    setIndicator({ left: r.left - nr.left, width: r.width, ready: true });
  }, [activeHref]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  async function handleSignOut(): Promise<void> {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[rgba(250,250,248,0.82)] backdrop-blur-md">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Baris atas: brand + avatar */}
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/Arta-Logo.png"
                alt="Arta"
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-contain"
                priority
              />
            </Link>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">{tenantName}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{roleLabel(role)}</div>
            </div>
          </div>

          {/* Nav segmented — absolut center pada md+ */}
          <nav
            className="absolute left-1/2 top-0 z-0 hidden h-16 -translate-x-1/2 items-center lg:flex"
            aria-label="Navigasi utama"
          >
            <div
              ref={navRef}
              className="relative flex items-center gap-1 rounded-full bg-[var(--color-surface-card)] p-1 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.12)] ring-1 ring-[var(--color-border)]"
            >
              <Indicator indicator={indicator} />
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={item.href === activeHref}
                  registerRef={(el) => {
                    itemRefs.current[item.href] = el;
                  }}
                />
              ))}
            </div>
          </nav>

          {/* Kanan */}
          <div className="flex items-center gap-2.5">
            {preview && (
              <span className="hidden items-center gap-1.5 rounded-full bg-[var(--color-amber-100)] px-2.5 py-1 text-xs font-semibold text-[var(--color-amber-400)] sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-amber-400)]" />
                Pratinjau
              </span>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-[var(--color-brand-50)] cursor-pointer"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-brand-100)] text-sm font-semibold text-[var(--color-brand-800)]">
                  {initials || 'A'}
                </span>
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-[var(--color-text-muted)]" fill="none" aria-hidden>
                  <path d="M5.5 8 10 12l4.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                  <div
                    role="menu"
                    className="absolute right-0 top-12 z-20 w-52 origin-top-right animate-arta-rise rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-1.5 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.25)]"
                  >
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{name}</p>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">{roleLabel(role)}</p>
                    </div>
                    <div className="my-1 h-px bg-[var(--color-border)]" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-danger-400)] transition-colors hover:bg-[var(--color-danger-100)] cursor-pointer"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                        <path d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nav mobile — baris bawah, scroll horizontal */}
        <nav
          className="-mx-4 flex items-center gap-1 overflow-x-auto border-t border-[var(--color-border)] px-4 py-2 lg:hidden"
          aria-label="Navigasi utama (mobile)"
        >
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={item.href === activeHref} mobile />
          ))}
        </nav>
      </div>
    </header>
  );
}

/* ── Indikator meluncur ─────────────────────────────────────── */
function Indicator({
  indicator,
}: {
  indicator: { left: number; width: number; ready: boolean };
}): ReactNode {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-1 top-1 rounded-full bg-[var(--color-brand-600)] transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.5,1)]"
      style={{ left: indicator.left, width: indicator.width, opacity: indicator.ready ? 1 : 0 }}
    />
  );
}

/* ── Item navigasi ──────────────────────────────────────────── */
function NavLink({
  item,
  active,
  mobile: _mobile = false,
  registerRef,
}: {
  item: NavItem;
  active: boolean;
  mobile?: boolean;
  registerRef?: (el: HTMLAnchorElement | null) => void;
}): ReactNode {
  const base =
    'relative z-10 flex flex-shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200';
  const activeTone = active ? 'bg-[var(--color-brand-600)] text-white' : '';
  const tone = active
    ? 'text-white'
    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]';

  return (
    <Link
      href={item.href}
      ref={registerRef}
      aria-current={active ? 'page' : undefined}
      className={`${base} ${activeTone} ${tone}`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
        {item.icon}
      </svg>
      {item.label}
    </Link>
  );
}
