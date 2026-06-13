import type { Metadata } from 'next';
import type React from 'react';

import {
  ActionHero,
  ActivityFeed,
  ExpiryList,
  GradeDistribution,
  Panel,
  ShelfLifeBanner,
  StatCard,
  type Activity,
  type ExpiryItem,
  type ShelfLifeAttentionItem,
} from '@/components/dashboard/widgets';
import { getDashboardIdentity } from '@/lib/auth/identity';
import {
  needsAttention,
  predictShelfLife,
  URGENCY_META,
  URGENCY_SEVERITY,
  type ColorRipeness,
  type SurfaceCondition,
} from '@/lib/stock/shelf-life';
import { createServerClient } from '@/lib/supabase/server';
import type { QualityGrade, StorageType } from '@/types/stock';

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
type ActiveBatchRow = {
  id: string;
  commodity: string;
  quantity_kg: number;
  grade: string;
  quality_score: number;
  storage_type: string | null;
  received_at: string;
  expires_at: string | null;
};

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
  let attention: ShelfLifeAttentionItem[] = [];
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

      // Batch aktif untuk prediksi masa simpan (storage, kematangan, dll)
      supabase
        .from('stock_batches')
        .select('id, commodity, quantity_kg, grade, quality_score, storage_type, received_at, expires_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'available')
        .limit(200),

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

    // Prediksi masa simpan dari data nyata tiap batch aktif
    if (expiryRes.data && expiryRes.data.length > 0) {
      const batches = expiryRes.data as ActiveBatchRow[];
      const batchIds = batches.map((b) => b.id);

      // Kondisi scan terbaru per batch (kematangan & permukaan)
      const scanByBatch = new Map<string, { color_ripeness: string; surface_condition: string }>();
      const { data: scans } = await supabase
        .from('scan_records')
        .select('batch_id, color_ripeness, surface_condition, scanned_at')
        .in('batch_id', batchIds)
        .order('scanned_at', { ascending: false });
      for (const s of (scans ?? []) as Array<{ batch_id: string | null; color_ripeness: string; surface_condition: string }>) {
        if (s.batch_id && !scanByBatch.has(s.batch_id)) {
          scanByBatch.set(s.batch_id, { color_ripeness: s.color_ripeness, surface_condition: s.surface_condition });
        }
      }

      const now = Date.now();
      const computed = batches.map((b) => {
        const scan = scanByBatch.get(b.id);
        const shelf = predictShelfLife({
          commodity: b.commodity,
          grade: b.grade as QualityGrade,
          qualityScore: Number(b.quality_score),
          storageType: (b.storage_type === 'cold' ? 'cold' : 'ambient') as StorageType,
          receivedAt: b.received_at,
          colorRipeness: (scan?.color_ripeness as ColorRipeness | undefined) ?? null,
          surfaceCondition: (scan?.surface_condition as SurfaceCondition | undefined) ?? null,
          storedExpiresAt: b.expires_at ?? null,
          now,
        });
        return { commodity: b.commodity, quantityKg: Number(b.quantity_kg), shelf };
      });

      // Urutkan paling mendesak dulu
      computed.sort((a, b) => {
        const bySeverity = URGENCY_SEVERITY[b.shelf.urgency] - URGENCY_SEVERITY[a.shelf.urgency];
        if (bySeverity !== 0) return bySeverity;
        return a.shelf.daysRemaining - b.shelf.daysRemaining;
      });

      expiring = computed
        .filter((c) => c.shelf.daysRemaining <= 4)
        .slice(0, 10)
        .map((c) => ({
          commodity: c.commodity,
          quantityKg: c.quantityKg,
          daysLeft: Math.max(0, c.shelf.daysRemaining),
        }));

      attention = computed
        .filter((c) => needsAttention(c.shelf.urgency))
        .map((c) => ({
          commodity: c.commodity,
          quantityKg: c.quantityKg,
          daysLeft: c.shelf.daysRemaining,
          urgencyLabel: URGENCY_META[c.shelf.urgency].label,
          color: URGENCY_META[c.shelf.urgency].color,
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

      {attention.length > 0 && (
        <div className="animate-arta-rise">
          <ShelfLifeBanner items={attention} />
        </div>
      )}

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
