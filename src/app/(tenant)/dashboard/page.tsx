import type { Metadata } from 'next';
import type React from 'react';

import {
  ActionHero,
  ActivityFeed,
  ExpiryList,
  GradeDistribution,
  Panel,
  StatCard,
  type Activity,
  type ExpiryItem,
} from '@/components/dashboard/widgets';
import { getDashboardIdentity } from '@/lib/auth/identity';

export const metadata: Metadata = {
  title: 'Ringkasan · Arta',
};

// Ikon stat (di-inline agar tetap konsisten 24x24)
const ICON_STOCK = (
  <path d="M3 7l9-4 9 4-9 4-9-4Zm0 5l9 4 9-4M3 17l9 4 9-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
);
const ICON_BATCH = (
  <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
);
const ICON_QUALITY = (
  <path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5L12 21l-5-2.9 1-5.5-4-3.9L9.5 8 12 3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
);
const ICON_LOAN = (
  <path d="M3 7h18v10H3V7Zm0 4h18M7 15h2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
);

// ── Data placeholder (akan diganti query nyata saat auth aktif) ──
const GRADE_DATA = [
  { grade: 'A', count: 142 },
  { grade: 'B', count: 98 },
  { grade: 'C', count: 54 },
  { grade: 'D', count: 21 },
  { grade: 'F', count: 8 },
];

const ACTIVITIES: Activity[] = [
  { actor: 'Siti Aminah', action: 'memindai 40 kg cabai merah', time: '5 menit lalu', grade: 'A' },
  { actor: 'Budi Santoso', action: 'menerima batch tomat 120 kg', time: '32 menit lalu', grade: 'B' },
  { actor: 'Rina Wijaya', action: 'mengajukan pinjaman Rp 5.000.000', time: '1 jam lalu' },
  { actor: 'Agus Pranoto', action: 'memindai 25 kg wortel', time: '2 jam lalu', grade: 'A' },
  { actor: 'Dewi Lestari', action: 'menandai batch kubis kedaluwarsa', time: '3 jam lalu', grade: 'D' },
];

const EXPIRING: ExpiryItem[] = [
  { commodity: 'Selada keriting', quantityKg: 35, daysLeft: 0 },
  { commodity: 'Bayam hijau', quantityKg: 22, daysLeft: 1 },
  { commodity: 'Tomat merah', quantityKg: 80, daysLeft: 2 },
  { commodity: 'Cabai rawit', quantityKg: 18, daysLeft: 3 },
];

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <header className="animate-arta-rise">
        <h1 className="font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
          Halo, {identity.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          Berikut ringkasan operasional {identity.tenantName} hari ini.
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          <StatCard
            key="s1"
            label="Total stok tersedia"
            value={12450}
            unit="kg"
            delta="8,2%"
            icon={ICON_STOCK}
            trend={[8, 9, 7, 10, 11, 10, 12, 12.4]}
          />,
          <StatCard key="s2" label="Batch aktif" value={64} delta="3 baru" icon={ICON_BATCH} />,
          <StatCard
            key="s3"
            label="Skor kualitas rata-rata"
            value={87.4}
            unit="/100"
            delta="1,5%"
            decimals={1}
            icon={ICON_QUALITY}
          />,
          <StatCard
            key="s4"
            label="Pengajuan pinjaman"
            value={5}
            unit="menunggu"
            delta="2 baru"
            deltaUp={false}
            icon={ICON_LOAN}
          />,
        ].map((card, i) => (
          <div key={i} className="animate-arta-rise" style={{ animationDelay: `${i * 70}ms` }}>
            {card}
          </div>
        ))}
      </div>

      {/* Baris konten */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="animate-arta-rise lg:col-span-7" style={{ animationDelay: '300ms' }}>
          <Panel
            title="Distribusi kualitas batch"
            action={<span className="text-xs text-[var(--color-text-muted)]">323 batch dipindai</span>}
          >
            <GradeDistribution data={GRADE_DATA} />
          </Panel>
        </div>

        <div className="animate-arta-rise lg:col-span-5" style={{ animationDelay: '370ms' }}>
          <Panel
            title="Mendekati kedaluwarsa"
            action={
              <span className="rounded-full bg-[var(--color-amber-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-amber-400)]">
                {EXPIRING.length} batch
              </span>
            }
          >
            <ExpiryList items={EXPIRING} />
          </Panel>
        </div>

        <div className="animate-arta-rise lg:col-span-7" style={{ animationDelay: '440ms' }}>
          <Panel title="Aktivitas terbaru">
            <ActivityFeed items={ACTIVITIES} />
          </Panel>
        </div>

        <div className="animate-arta-rise lg:col-span-5" style={{ animationDelay: '510ms' }}>
          <ActionHero
            href="/scan"
            title="Pindai kualitas sayuran"
            subtitle="Analisis grade dengan AI Vision dalam hitungan detik hasil langsung tercatat ke stok."
            cta="Mulai scan"
          />
        </div>
      </div>
    </div>
  );
}
