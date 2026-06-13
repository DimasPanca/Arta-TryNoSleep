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
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Ringkasan · Arta',
};

export const dynamic = 'force-dynamic';

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

type GradeRow = { grade: string; count: number };
type ExpiryRow = { commodity: string; quantity_kg: number; expires_at: string };

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();
  const tenantId = identity.tenantId;

  let totalKg = 0;
  let batchCount = 0;
  let avgQuality = 0;
  let pendingLoans = 0;
  let gradeData: GradeRow[] = [];
  let activities: Activity[] = [];
  let expiring: ExpiryItem[] = [];
  let totalScanned = 0;

  if (tenantId) {
    const supabase = await createServerClient();

    const [
      stockRes,
      gradeRes,
      expiryRes,
      activityRes,
      loanRes,
    ] = await Promise.all([
      // Stat cards: total stok, batch aktif, rata-rata kualitas
      supabase
        .from('stock_batches')
        .select('quantity_kg, quality_score')
        .eq('tenant_id', tenantId)
        .eq('status', 'available'),

      // Distribusi grade dari scan_records
      supabase
        .from('scan_records')
        .select('grade')
        .eq('tenant_id', tenantId),

      // Batch mendekati kedaluwarsa (3 hari ke depan)
      supabase
        .from('stock_batches')
        .select('commodity, quantity_kg, expires_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'available')
        .not('expires_at', 'is', null)
        .lte('expires_at', new Date(Date.now() + 3 * 86_400_000).toISOString())
        .order('expires_at', { ascending: true })
        .limit(10),

      // Aktivitas terbaru dari scan_records (join ke stock_batches untuk nama komoditas)
      supabase
        .from('scan_records')
        .select('grade, quality_score, scanned_at, stock_batches!scan_records_batch_id_fkey(commodity)')
        .eq('tenant_id', tenantId)
        .order('scanned_at', { ascending: false })
        .limit(5),

      // Pengajuan pinjaman pending
      supabase
        .from('loan_applications')
        .select('id', { count: 'exact', head: true })
        .eq('target_tenant_id', tenantId)
        .eq('status', 'pending'),
    ]);

    // Hitung stat stok
    if (stockRes.data) {
      batchCount = stockRes.data.length;
      totalKg = stockRes.data.reduce((sum, r) => sum + Number(r.quantity_kg), 0);
      avgQuality = batchCount > 0
        ? stockRes.data.reduce((sum, r) => sum + Number(r.quality_score), 0) / batchCount
        : 0;
    }

    // Distribusi grade
    if (gradeRes.data) {
      totalScanned = gradeRes.data.length;
      const counts: Record<string, number> = {};
      for (const r of gradeRes.data) {
        counts[r.grade] = (counts[r.grade] ?? 0) + 1;
      }
      gradeData = Object.entries(counts)
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => a.grade.localeCompare(b.grade));
    }

    // Mendekati kedaluwarsa
    if (expiryRes.data) {
      const now = Date.now();
      expiring = (expiryRes.data as ExpiryRow[]).map((r) => ({
        commodity: r.commodity,
        quantityKg: Number(r.quantity_kg),
        daysLeft: Math.max(0, Math.round((new Date(r.expires_at).getTime() - now) / 86_400_000)),
      }));
    }

    // Aktivitas terbaru
    if (activityRes.data) {
      type RawScan = { grade: string; quality_score: number; scanned_at: string; stock_batches: { commodity: string } | null };
      activities = (activityRes.data as unknown as RawScan[]).map((r) => ({
        actor: 'Sistem scan',
        action: `Scan ${r.stock_batches?.commodity ?? 'Komoditas'} · Grade ${r.grade} · Skor ${Math.round(r.quality_score)}`,
        time: r.scanned_at,
        grade: r.grade,
      }));
    }

    // Pending loans
    pendingLoans = loanRes.count ?? 0;
  }

  return (
    <div className="space-y-6">
      <header className="animate-arta-rise">
        <h1 className="font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
          Halo, {identity.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          Berikut ringkasan operasional {identity.tenantName} hari ini.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          <StatCard key="s1" label="Total stok tersedia" value={totalKg} unit="kg" icon={ICON_STOCK} />,
          <StatCard key="s2" label="Batch aktif" value={batchCount} icon={ICON_BATCH} />,
          <StatCard key="s3" label="Skor kualitas rata-rata" value={avgQuality} unit="/100" decimals={1} icon={ICON_QUALITY} />,
          <StatCard key="s4" label="Pengajuan pinjaman" value={pendingLoans} unit="menunggu" icon={ICON_LOAN} />,
        ].map((card, i) => (
          <div key={i} className="animate-arta-rise" style={{ animationDelay: `${i * 70}ms` }}>
            {card}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="animate-arta-rise lg:col-span-7" style={{ animationDelay: '300ms' }}>
          <Panel
            title="Distribusi kualitas batch"
            action={<span className="text-xs text-[var(--color-text-muted)]">{totalScanned} batch dipindai</span>}
          >
            <GradeDistribution data={gradeData} />
          </Panel>
        </div>

        <div className="animate-arta-rise lg:col-span-5" style={{ animationDelay: '370ms' }}>
          <Panel
            title="Mendekati kedaluwarsa"
            action={
              <span className="rounded-full bg-[var(--color-amber-100)] px-2 py-0.5 text-xs font-semibold text-[var(--color-amber-400)]">
                {expiring.length} batch
              </span>
            }
          >
            <ExpiryList items={expiring} />
          </Panel>
        </div>

        <div className="animate-arta-rise lg:col-span-7" style={{ animationDelay: '440ms' }}>
          <Panel title="Aktivitas terbaru">
            <ActivityFeed items={activities} />
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
