'use client';

import { useMemo, useState, type ReactNode } from 'react';

import type { StockLedgerEvent, StockLedgerRow } from '@/lib/stock/ledger';
import {
  needsAttention,
  predictShelfLife,
  URGENCY_META,
  URGENCY_SEVERITY,
  type ShelfLifeResult,
  type ShelfLifeUrgency,
} from '@/lib/stock/shelf-life';
import type { BlockchainAction } from '@/types/blockchain';
import type { QualityGrade } from '@/types/stock';

interface ShelfLifeRow {
  row: StockLedgerRow;
  shelf: ShelfLifeResult;
}

type GradeFilter = 'all' | QualityGrade;
type ActionFilter = 'all' | BlockchainAction;
type SortKey = 'latestAt' | 'quantityKg' | 'qualityScore' | 'commodity' | 'eventCount';
type SortDirection = 'asc' | 'desc';

interface StockLedgerDashboardProps {
  rows: StockLedgerRow[];
  tenantId: string;
  tenantName: string;
  tenantSourceLabel: string;
  configuredUrl: string;
  generatedAt: string;
  error: string | null;
  preview: boolean;
}

interface DecoratedEvent extends StockLedgerEvent {
  batchId: string;
  commodity: string;
  active: boolean;
}

interface Summary {
  totalBatches: number;
  activeBatches: number;
  totalWeightKg: number;
  activeWeightKg: number;
  averageScore: number;
  eventCount: number;
  latestAt: string | null;
}

interface GradeBucket {
  grade: QualityGrade;
  count: number;
  weightKg: number;
}

interface CommodityBucket {
  commodity: string;
  count: number;
  weightKg: number;
  averageScore: number;
  grades: Record<QualityGrade, number>;
}

interface TimelineBucket {
  dateKey: string;
  label: string;
  events: number;
  weightKg: number;
}

const GRADE_ORDER: QualityGrade[] = ['A', 'B', 'C', 'D', 'F'];
const ACTION_ORDER: BlockchainAction[] = [
  'batch_received',
  'quality_updated',
  'batch_dispatched',
  'batch_expired',
];

const ACTION_LABELS: Record<BlockchainAction, string> = {
  batch_received: 'Batch masuk',
  quality_updated: 'Mutu diperbarui',
  batch_dispatched: 'Terkirim',
  batch_expired: 'Kedaluwarsa',
};

const GRADE_COLORS: Record<QualityGrade, string> = {
  A: 'var(--color-grade-a)',
  B: 'var(--color-grade-b)',
  C: 'var(--color-grade-c)',
  D: 'var(--color-grade-d)',
  F: 'var(--color-grade-f)',
};

const ACTION_COLORS: Record<BlockchainAction, string> = {
  batch_received: 'var(--color-brand-600)',
  quality_updated: 'var(--color-grade-b)',
  batch_dispatched: 'var(--color-amber-400)',
  batch_expired: 'var(--color-danger-400)',
};

const integerFormat = new Intl.NumberFormat('id-ID');
const weightFormat = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
});
const scoreFormat = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
});
const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
});

export function StockLedgerDashboard({
  rows,
  tenantId,
  tenantName,
  tenantSourceLabel,
  configuredUrl,
  generatedAt,
  error,
  preview,
}: StockLedgerDashboardProps): ReactNode {
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState<GradeFilter>('all');
  const [action, setAction] = useState<ActionFilter>('all');
  const [activeOnly, setActiveOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('latestAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredRows = useMemo(
    () =>
      filterAndSortRows(rows, {
        query,
        grade,
        action,
        activeOnly,
        minScore,
        sortKey,
        sortDirection,
      }),
    [rows, query, grade, action, activeOnly, minScore, sortKey, sortDirection],
  );

  const nowMs = useMemo(() => {
    const t = new Date(generatedAt).getTime();
    return Number.isFinite(t) ? t : Date.now();
  }, [generatedAt]);

  // Prediksi masa simpan untuk batch yang masih aktif (berdasarkan data scan nyata).
  const shelfLifeRows = useMemo(
    () => buildShelfLifeRows(filteredRows, nowMs),
    [filteredRows, nowMs],
  );
  const attentionRows = useMemo(
    () => shelfLifeRows.filter((s) => needsAttention(s.shelf.urgency)),
    [shelfLifeRows],
  );

  const events = useMemo(() => buildDecoratedEvents(filteredRows), [filteredRows]);
  const summary = useMemo(() => summarizeRows(filteredRows), [filteredRows]);
  const gradeBuckets = useMemo(() => summarizeGrades(filteredRows), [filteredRows]);
  const commodities = useMemo(() => summarizeCommodities(filteredRows), [filteredRows]);
  const timeline = useMemo(() => summarizeTimeline(events), [events]);
  const actionBuckets = useMemo(() => summarizeActions(filteredRows), [filteredRows]);

  function exportCsv(): void {
    const csv = buildCsv(filteredRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arta-stok-ledger-${tenantId.slice(0, 8)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="animate-arta-rise">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-brand-700)]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-50)] px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-600)]" />
                Hyperledger Fabric
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-card)] px-2.5 py-1 text-[var(--color-text-secondary)]">
                {tenantSourceLabel}
              </span>
              {preview && (
                <span className="rounded-full bg-[var(--color-amber-100)] px-2.5 py-1 text-[var(--color-amber-400)]">
                  Pratinjau lokal
                </span>
              )}
            </div>
            <h1 className="mt-2 font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
              Stok berbasis ledger
            </h1>
            <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
              {tenantName}: batch, mutu, berat, event, dan txId ditarik dari chaincode stock-trace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <DownloadIcon />
              Ekspor CSV
            </button>
          </div>
        </div>
      </header>

      <SourceStrip
        tenantId={tenantId}
        configuredUrl={configuredUrl}
        generatedAt={generatedAt}
        latestAt={summary.latestAt}
      />

      {error && <ErrorBanner message={error} />}

      {attentionRows.length > 0 && <ShelfLifeAlert items={attentionRows} />}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Batch tertelusur"
          value={integerFormat.format(summary.totalBatches)}
          helper={`${integerFormat.format(summary.activeBatches)} aktif`}
          icon={<LayersIcon />}
        />
        <MetricCard
          label="Berat aktif"
          value={formatKg(summary.activeWeightKg)}
          helper={`${formatKg(summary.totalWeightKg)} tercatat`}
          icon={<ScaleIcon />}
        />
        <MetricCard
          label="Skor rata-rata"
          value={summary.totalBatches > 0 ? scoreFormat.format(summary.averageScore) : '0'}
          helper="berdasarkan batch terfilter"
          icon={<QualityIcon />}
        />
        <MetricCard
          label="Event ledger"
          value={integerFormat.format(summary.eventCount)}
          helper={summary.latestAt ? `Terakhir ${formatDateTime(summary.latestAt)}` : 'Belum ada event'}
          icon={<TraceIcon />}
        />
      </section>

      <FilterPanel
        query={query}
        grade={grade}
        action={action}
        activeOnly={activeOnly}
        minScore={minScore}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onQueryChange={setQuery}
        onGradeChange={setGrade}
        onActionChange={setAction}
        onActiveOnlyChange={setActiveOnly}
        onMinScoreChange={setMinScore}
        onSortKeyChange={setSortKey}
        onSortDirectionChange={setSortDirection}
        resultCount={filteredRows.length}
      />

      {rows.length === 0 && !error ? (
        <EmptyLedgerState tenantId={tenantId} />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Panel title="Prioritas penjualan & masa simpan" className="xl:col-span-7">
              <SellPriorityList items={shelfLifeRows} />
            </Panel>
            <Panel title="Sebaran masa simpan" className="xl:col-span-5">
              <ShelfLifeBreakdown items={shelfLifeRows} />
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Panel title="Distribusi grade" className="xl:col-span-4">
              <GradeLedgerChart buckets={gradeBuckets} />
            </Panel>
            <Panel title="Komposisi komoditas" className="xl:col-span-5">
              <CommodityTreemap data={commodities} />
            </Panel>
            <Panel title="Status event terakhir" className="xl:col-span-3">
              <ActionStatusGrid data={actionBuckets} />
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Panel title="Timeline ledger" className="xl:col-span-7">
              <TimelineChart data={timeline} />
            </Panel>
            <Panel title="Event terbaru" className="xl:col-span-5">
              <RecentEventList events={events.slice(0, 8)} />
            </Panel>
          </section>

          <LedgerTable rows={filteredRows} nowMs={nowMs} />
        </>
      )}
    </div>
  );
}

function SourceStrip({
  tenantId,
  configuredUrl,
  generatedAt,
  latestAt,
}: {
  tenantId: string;
  configuredUrl: string;
  generatedAt: string;
  latestAt: string | null;
}): ReactNode {
  const items = [
    { label: 'Gateway', value: configuredUrl },
    { label: 'Channel', value: 'arta-channel' },
    { label: 'Chaincode', value: 'stock-trace' },
    { label: 'Tenant', value: tenantId },
    { label: 'Dibaca', value: formatDateTime(generatedAt) },
    { label: 'Ledger terakhir', value: latestAt ? formatDateTime(latestAt) : 'Belum ada' },
  ];

  return (
    <section className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-3 md:grid-cols-2 xl:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-md bg-[var(--color-surface)] px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {item.label}
          </p>
          <p className="mt-1 truncate font-[var(--font-mono)] text-xs text-[var(--color-text-primary)]" title={item.value}>
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}

function ErrorBanner({ message }: { message: string }): ReactNode {
  return (
    <section className="rounded-lg border border-[var(--color-danger-100)] bg-[var(--color-danger-100)] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-white text-[var(--color-danger-400)]">
          <WarningIcon />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--color-danger-400)]">Ledger belum bisa dibaca</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{message}</p>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
}): ReactNode {
  return (
    <article className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4 transition-colors duration-200 hover:border-[var(--color-brand-200)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
          <p className="mt-1 truncate font-[var(--font-display)] text-[2rem] leading-none text-[var(--color-text-primary)]">
            {value}
          </p>
        </div>
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">{helper}</p>
    </article>
  );
}

function FilterPanel({
  query,
  grade,
  action,
  activeOnly,
  minScore,
  sortKey,
  sortDirection,
  resultCount,
  onQueryChange,
  onGradeChange,
  onActionChange,
  onActiveOnlyChange,
  onMinScoreChange,
  onSortKeyChange,
  onSortDirectionChange,
}: {
  query: string;
  grade: GradeFilter;
  action: ActionFilter;
  activeOnly: boolean;
  minScore: number;
  sortKey: SortKey;
  sortDirection: SortDirection;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onGradeChange: (value: GradeFilter) => void;
  onActionChange: (value: ActionFilter) => void;
  onActiveOnlyChange: (value: boolean) => void;
  onMinScoreChange: (value: number) => void;
  onSortKeyChange: (value: SortKey) => void;
  onSortDirectionChange: (value: SortDirection) => void;
}): ReactNode {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_0.7fr_0.8fr_0.9fr_auto]">
        <label className="block min-w-0">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Cari batch, komoditas, txId</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 focus-within:border-[var(--color-brand-400)]">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="contoh: cabai, Grade A, 28a6..."
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Event terakhir</span>
          <select
            value={action}
            onChange={(event) => onActionChange(event.target.value as ActionFilter)}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-400)]"
          >
            <option value="all">Semua event</option>
            {ACTION_ORDER.map((item) => (
              <option key={item} value={item}>
                {ACTION_LABELS[item]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Urutkan</span>
          <select
            value={sortKey}
            onChange={(event) => onSortKeyChange(event.target.value as SortKey)}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-400)]"
          >
            <option value="latestAt">Waktu terbaru</option>
            <option value="quantityKg">Berat</option>
            <option value="qualityScore">Skor mutu</option>
            <option value="commodity">Komoditas</option>
            <option value="eventCount">Jumlah event</option>
          </select>
        </label>

        <label className="block">
          <span className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
            <span>Skor minimal</span>
            <span className="font-[var(--font-mono)]">{minScore}</span>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minScore}
            onChange={(event) => onMinScoreChange(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--color-brand-600)]"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] cursor-pointer"
            aria-label="Balik urutan tabel"
          >
            <SortIcon direction={sortDirection} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <GradeButton active={grade === 'all'} onClick={() => onGradeChange('all')}>
            Semua grade
          </GradeButton>
          {GRADE_ORDER.map((item) => (
            <GradeButton key={item} active={grade === item} grade={item} onClick={() => onGradeChange(item)}>
              Grade {item}
            </GradeButton>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => onActiveOnlyChange(event.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand-600)]"
            />
            Hanya stok aktif
          </label>
          <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">
            {integerFormat.format(resultCount)} baris
          </span>
        </div>
      </div>
    </section>
  );
}

function GradeButton({
  children,
  active,
  grade,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  grade?: QualityGrade;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
        active
          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
      }`}
    >
      {grade && (
        <span
          className="h-2 w-2 rounded-sm"
          style={{ backgroundColor: active ? 'white' : GRADE_COLORS[grade] }}
        />
      )}
      {children}
    </button>
  );
}

function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4 ${className ?? ''}`}>
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function GradeLedgerChart({ buckets }: { buckets: GradeBucket[] }): ReactNode {
  const totalWeight = buckets.reduce((sum, bucket) => sum + bucket.weightKg, 0);
  const totalCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  if (totalCount === 0) return <EmptyChart label="Tidak ada grade dalam filter ini." />;

  return (
    <div className="space-y-4">
      <div className="flex h-4 overflow-hidden rounded-md bg-[var(--color-surface)]">
        {buckets.map((bucket) =>
          bucket.weightKg > 0 ? (
            <div
              key={bucket.grade}
              title={`Grade ${bucket.grade}: ${formatKg(bucket.weightKg)}`}
              style={{
                width: `${(bucket.weightKg / totalWeight) * 100}%`,
                backgroundColor: GRADE_COLORS[bucket.grade],
              }}
            />
          ) : null,
        )}
      </div>
      <div className="space-y-2">
        {buckets.map((bucket) => {
          const pct = totalWeight > 0 ? (bucket.weightKg / totalWeight) * 100 : 0;
          return (
            <div key={bucket.grade} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <span
                className="grid h-7 w-7 place-items-center rounded-md text-xs font-bold text-white"
                style={{ backgroundColor: GRADE_COLORS[bucket.grade] }}
              >
                {bucket.grade}
              </span>
              <div className="min-w-0">
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: GRADE_COLORS[bucket.grade] }}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {integerFormat.format(bucket.count)} batch
                </p>
              </div>
              <span className="font-[var(--font-mono)] text-xs text-[var(--color-text-primary)]">
                {formatKg(bucket.weightKg)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommodityTreemap({ data }: { data: CommodityBucket[] }): ReactNode {
  if (data.length === 0) return <EmptyChart label="Tidak ada komoditas dalam filter ini." />;
  const maxWeight = Math.max(...data.map((item) => item.weightKg), 1);

  return (
    <div className="flex flex-wrap gap-2">
      {data.slice(0, 10).map((item) => {
        const strength = Math.max(0.16, item.weightKg / maxWeight);
        const topGrade = getTopGrade(item.grades);
        return (
          <article
            key={item.commodity}
            className="min-w-[9rem] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            style={{ flexGrow: Math.max(1, item.weightKg / 50) }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 truncate text-sm font-semibold text-[var(--color-text-primary)]" title={item.commodity}>
                {item.commodity}
              </h3>
              <span
                className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md text-xs font-bold text-white"
                style={{ backgroundColor: GRADE_COLORS[topGrade] }}
              >
                {topGrade}
              </span>
            </div>
            <p className="mt-2 font-[var(--font-display)] text-2xl leading-none text-[var(--color-text-primary)]">
              {formatKg(item.weightKg)}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {integerFormat.format(item.count)} batch, skor {scoreFormat.format(item.averageScore)}
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--color-border)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${strength * 100}%`,
                  backgroundColor: GRADE_COLORS[topGrade],
                }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ActionStatusGrid({ data }: { data: Array<{ action: BlockchainAction; count: number; weightKg: number }> }): ReactNode {
  const total = data.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.action} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: ACTION_COLORS[item.action] }} />
              {ACTION_LABELS[item.action]}
            </span>
            <span className="font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">
              {integerFormat.format(item.count)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.count / total) * 100}%`,
                backgroundColor: ACTION_COLORS[item.action],
              }}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{formatKg(item.weightKg)}</p>
        </div>
      ))}
    </div>
  );
}

function TimelineChart({ data }: { data: TimelineBucket[] }): ReactNode {
  if (data.length === 0) return <EmptyChart label="Belum ada event ledger." />;
  const width = 640;
  const height = 220;
  const maxEvents = Math.max(...data.map((item) => item.events), 1);
  const maxWeight = Math.max(...data.map((item) => item.weightKg), 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const line = data
    .map((item, index) => {
      const x = data.length > 1 ? index * step : width / 2;
      const y = height - 34 - (item.weightKg / maxWeight) * 138;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div>
      <div className="overflow-hidden rounded-lg bg-[var(--color-surface)] p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Timeline berat dan jumlah event ledger">
          <line x1="0" y1={height - 32} x2={width} y2={height - 32} stroke="var(--color-border-strong)" />
          {data.map((item, index) => {
            const x = data.length > 1 ? index * step : width / 2;
            const barHeight = (item.events / maxEvents) * 112;
            return (
              <g key={item.dateKey}>
                <rect
                  x={x - 10}
                  y={height - 32 - barHeight}
                  width="20"
                  height={barHeight}
                  rx="4"
                  fill="var(--color-brand-200)"
                />
                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  style={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
          <path d={line} fill="none" stroke="var(--color-brand-700)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((item, index) => {
            const x = data.length > 1 ? index * step : width / 2;
            const y = height - 34 - (item.weightKg / maxWeight) * 138;
            return (
              <circle key={`${item.dateKey}-point`} cx={x} cy={y} r="4.5" fill="var(--color-brand-700)">
                <title>{`${item.label}: ${formatKg(item.weightKg)}, ${item.events} event`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <Legend color="var(--color-brand-700)" label="Berat tercatat" />
        <Legend color="var(--color-brand-200)" label="Jumlah event" />
      </div>
    </div>
  );
}

function RecentEventList({ events }: { events: DecoratedEvent[] }): ReactNode {
  if (events.length === 0) return <EmptyChart label="Tidak ada event terbaru." />;

  return (
    <ol className="space-y-2">
      {events.map((event) => (
        <li key={`${event.txId}-${event.batchId}`} className="grid grid-cols-[auto_1fr] gap-3">
          <span className="mt-1 h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ACTION_COLORS[event.action] }} />
          <div className="min-w-0 border-b border-[var(--color-border)] pb-2 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{event.commodity}</p>
              <span className="font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">
                {formatKg(event.quantityKg)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              {ACTION_LABELS[event.action]} pada {formatDateTime(event.timestamp)}
            </p>
            <p className="mt-1 truncate font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
              {shortId(event.txId)} | Batch {shortId(event.batchId)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function LedgerTable({ rows, nowMs }: { rows: StockLedgerRow[]; nowMs: number }): ReactNode {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)]">
      <div className="flex flex-col gap-1 border-b border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Tabel batch ledger</h2>
        <p className="text-xs text-[var(--color-text-muted)]">
          {integerFormat.format(rows.length)} batch sesuai filter
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse text-left">
          <thead className="sticky top-0 bg-[var(--color-surface)]">
            <tr className="text-xs font-semibold text-[var(--color-text-muted)]">
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Komoditas</th>
              <th className="px-4 py-3 text-right">Berat</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3 text-right">Skor</th>
              <th className="px-4 py-3">Masa simpan</th>
              <th className="px-4 py-3">Event terakhir</th>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">TxId</th>
              <th className="px-4 py-3 text-right">Event</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
                  Tidak ada batch yang sesuai filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const shelf = row.active
                  ? predictShelfLife({
                      commodity: row.commodity,
                      grade: row.grade,
                      qualityScore: row.qualityScore,
                      storageType: row.storageType,
                      receivedAt: row.firstSeenAt,
                      colorRipeness: row.colorRipeness,
                      surfaceCondition: row.surfaceCondition,
                      storedExpiresAt: row.expiresAt,
                      now: nowMs,
                    })
                  : null;
                return (
                <tr key={row.batchId} className="border-t border-[var(--color-border)] text-sm transition-colors hover:bg-[var(--color-surface)]">
                  <td className="px-4 py-3">
                    <span className="font-[var(--font-mono)] text-xs text-[var(--color-text-primary)]">
                      {shortId(row.batchId)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--color-text-primary)]">{row.commodity}</p>
                      <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
                        Operator {shortId(row.operatorId)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-[var(--font-mono)] text-xs text-[var(--color-text-primary)]">
                    {formatKg(row.quantityKg)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex min-w-16 items-center justify-center rounded-md px-2 py-1 text-xs font-bold text-white"
                      style={{ backgroundColor: GRADE_COLORS[row.grade] }}
                    >
                      Grade {row.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-[var(--font-mono)] text-xs text-[var(--color-text-primary)]">
                    {integerFormat.format(row.qualityScore)}
                  </td>
                  <td className="px-4 py-3">
                    {shelf ? (
                      <div className="flex flex-col gap-1">
                        <UrgencyBadge urgency={shelf.urgency} />
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          {shelf.daysRemaining <= 0 ? 'lewat masa' : `${shelf.daysRemaining} hari · ${shelf.storage.temp}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)]"
                    >
                      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: ACTION_COLORS[row.latestAction] }} />
                      {row.latestActionLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {formatDateTime(row.latestAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">
                      {shortId(row.latestTxId)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-[var(--font-mono)] text-xs text-[var(--color-text-primary)]">
                    {row.eventCount}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShelfLifeAlert({ items }: { items: ShelfLifeRow[] }): ReactNode {
  const expired = items.filter((s) => s.shelf.urgency === 'expired').length;
  const critical = items.filter((s) => s.shelf.urgency === 'critical').length;
  const urgent = items.filter((s) => s.shelf.urgency === 'urgent').length;
  const top = items.slice(0, 4);

  return (
    <section className="rounded-lg border border-[var(--color-amber-400)]/50 bg-[var(--color-amber-100)] p-4 animate-arta-rise">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-amber-400)] text-white">
          <BellIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {items.length} batch perlu segera dijual
            </p>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {expired > 0 && `${expired} lewat masa · `}
              {critical > 0 && `${critical} kritis · `}
              {urgent > 0 && `${urgent} segera`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            Prioritaskan penjualan/olah batch berikut agar tidak busuk di gudang. Operator & ketua sebaiknya menindaklanjuti hari ini.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {top.map((s) => {
              const meta = URGENCY_META[s.shelf.urgency];
              return (
                <span
                  key={s.row.batchId}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={{ borderColor: meta.color, color: meta.color, backgroundColor: 'var(--color-surface-card)' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  {s.row.commodity} · {formatKg(s.row.quantityKg)} ·{' '}
                  {s.shelf.daysRemaining <= 0 ? 'lewat' : `${s.shelf.daysRemaining} hari`}
                </span>
              );
            })}
            {items.length > top.length && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-surface-card)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
                +{items.length - top.length} lainnya
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SellPriorityList({ items }: { items: ShelfLifeRow[] }): ReactNode {
  if (items.length === 0) return <EmptyChart label="Tidak ada stok aktif untuk diprioritaskan." />;
  const shown = items.slice(0, 8);

  return (
    <div className="space-y-2">
      {shown.map((s, index) => {
        const meta = URGENCY_META[s.shelf.urgency];
        return (
          <article
            key={s.row.batchId}
            className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <span
              className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md font-[var(--font-mono)] text-xs font-bold text-white"
              style={{ backgroundColor: meta.color }}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{s.row.commodity}</p>
                <UrgencyBadge urgency={s.shelf.urgency} />
                {s.shelf.recommendColdStorage && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-brand-700)]">
                    <SnowIcon /> Pindahkan ke pendingin
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                {formatKg(s.row.quantityKg)} · Grade {s.row.grade} · {s.shelf.storage.temp}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.shelf.freshnessPct}%`, backgroundColor: meta.color }}
                />
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="font-[var(--font-display)] text-lg leading-none" style={{ color: meta.color }}>
                {s.shelf.daysRemaining <= 0 ? '0' : s.shelf.daysRemaining}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">hari tersisa</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ShelfLifeBreakdown({ items }: { items: ShelfLifeRow[] }): ReactNode {
  if (items.length === 0) return <EmptyChart label="Belum ada stok aktif untuk dianalisis." />;
  const order: ShelfLifeUrgency[] = ['fresh', 'monitor', 'urgent', 'critical', 'expired'];
  const counts = order.map((urgency) => ({
    urgency,
    count: items.filter((s) => s.shelf.urgency === urgency).length,
    weightKg: items.filter((s) => s.shelf.urgency === urgency).reduce((sum, s) => sum + s.row.quantityKg, 0),
  }));
  const total = items.length;

  return (
    <div className="space-y-2.5">
      {counts.map((c) => {
        const meta = URGENCY_META[c.urgency];
        const pct = total > 0 ? (c.count / total) * 100 : 0;
        return (
          <div key={c.urgency}>
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </span>
              <span className="font-[var(--font-mono)] text-[var(--color-text-secondary)]">
                {c.count} · {formatKg(c.weightKg)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">
        Prediksi dari komoditas, grade, kematangan, kondisi permukaan, dan jenis penyimpanan tiap batch.
      </p>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: ShelfLifeUrgency }): ReactNode {
  const meta = URGENCY_META[urgency];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

function EmptyLedgerState({ tenantId }: { tenantId: string }): ReactNode {
  return (
    <section className="rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
        <TraceIcon />
      </span>
      <h2 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">
        Belum ada batch di ledger tenant ini
      </h2>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Tenant {shortId(tenantId)} sudah bisa dihubungi, tetapi chaincode stock-trace belum mengembalikan entry untuk GetBatchesByTenant.
      </p>
    </section>
  );
}

function EmptyChart({ label }: { label: string }): ReactNode {
  return (
    <div className="grid min-h-36 place-items-center rounded-lg bg-[var(--color-surface)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
      {label}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }): ReactNode {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function filterAndSortRows(
  rows: StockLedgerRow[],
  filters: {
    query: string;
    grade: GradeFilter;
    action: ActionFilter;
    activeOnly: boolean;
    minScore: number;
    sortKey: SortKey;
    sortDirection: SortDirection;
  },
): StockLedgerRow[] {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (filters.grade !== 'all' && row.grade !== filters.grade) return false;
    if (filters.action !== 'all' && row.latestAction !== filters.action) return false;
    if (filters.activeOnly && !row.active) return false;
    if (row.qualityScore < filters.minScore) return false;
    if (!normalizedQuery) return true;

    const haystack = [
      row.batchId,
      row.commodity,
      row.grade,
      row.latestActionLabel,
      row.latestTxId,
      row.operatorId,
      row.farmerId ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return [...filtered].sort((a, b) => compareRows(a, b, filters.sortKey, filters.sortDirection));
}

function compareRows(
  a: StockLedgerRow,
  b: StockLedgerRow,
  sortKey: SortKey,
  direction: SortDirection,
): number {
  const sign = direction === 'asc' ? 1 : -1;
  if (sortKey === 'commodity') return a.commodity.localeCompare(b.commodity) * sign;
  if (sortKey === 'latestAt') return (toTime(a.latestAt) - toTime(b.latestAt)) * sign;
  return (a[sortKey] - b[sortKey]) * sign;
}

function buildDecoratedEvents(rows: StockLedgerRow[]): DecoratedEvent[] {
  return rows
    .flatMap((row) =>
      row.events.map((event) => ({
        ...event,
        batchId: row.batchId,
        commodity: row.commodity,
        active: row.active,
      })),
    )
    .sort((a, b) => toTime(b.timestamp) - toTime(a.timestamp));
}

function buildShelfLifeRows(rows: StockLedgerRow[], nowMs: number): ShelfLifeRow[] {
  return rows
    .filter((row) => row.active)
    .map((row) => ({
      row,
      shelf: predictShelfLife({
        commodity: row.commodity,
        grade: row.grade,
        qualityScore: row.qualityScore,
        storageType: row.storageType,
        receivedAt: row.firstSeenAt,
        colorRipeness: row.colorRipeness,
        surfaceCondition: row.surfaceCondition,
        storedExpiresAt: row.expiresAt,
        now: nowMs,
      }),
    }))
    .sort((a, b) => {
      const bySeverity = URGENCY_SEVERITY[b.shelf.urgency] - URGENCY_SEVERITY[a.shelf.urgency];
      if (bySeverity !== 0) return bySeverity;
      return a.shelf.daysRemaining - b.shelf.daysRemaining;
    });
}

function summarizeRows(rows: StockLedgerRow[]): Summary {
  const totalWeightKg = rows.reduce((sum, row) => sum + row.quantityKg, 0);
  const activeWeightKg = rows.reduce((sum, row) => sum + (row.active ? row.quantityKg : 0), 0);
  const scoreSum = rows.reduce((sum, row) => sum + row.qualityScore, 0);
  const latest = rows.reduce<string | null>((current, row) => {
    if (!current) return row.latestAt;
    return toTime(row.latestAt) > toTime(current) ? row.latestAt : current;
  }, null);

  return {
    totalBatches: rows.length,
    activeBatches: rows.filter((row) => row.active).length,
    totalWeightKg,
    activeWeightKg,
    averageScore: rows.length > 0 ? scoreSum / rows.length : 0,
    eventCount: rows.reduce((sum, row) => sum + row.eventCount, 0),
    latestAt: latest,
  };
}

function summarizeGrades(rows: StockLedgerRow[]): GradeBucket[] {
  return GRADE_ORDER.map((grade) => {
    const byGrade = rows.filter((row) => row.grade === grade);
    return {
      grade,
      count: byGrade.length,
      weightKg: byGrade.reduce((sum, row) => sum + row.quantityKg, 0),
    };
  });
}

function summarizeCommodities(rows: StockLedgerRow[]): CommodityBucket[] {
  const map = new Map<string, { count: number; weightKg: number; scoreSum: number; grades: Record<QualityGrade, number> }>();

  for (const row of rows) {
    const current =
      map.get(row.commodity) ??
      {
        count: 0,
        weightKg: 0,
        scoreSum: 0,
        grades: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      };
    current.count += 1;
    current.weightKg += row.quantityKg;
    current.scoreSum += row.qualityScore;
    current.grades[row.grade] += row.quantityKg;
    map.set(row.commodity, current);
  }

  return Array.from(map.entries())
    .map(([commodity, value]) => ({
      commodity,
      count: value.count,
      weightKg: value.weightKg,
      averageScore: value.count > 0 ? value.scoreSum / value.count : 0,
      grades: value.grades,
    }))
    .sort((a, b) => b.weightKg - a.weightKg);
}

function summarizeTimeline(events: DecoratedEvent[]): TimelineBucket[] {
  const map = new Map<string, { events: number; weightKg: number; timestamp: string }>();

  for (const event of events) {
    const date = new Date(event.timestamp);
    const dateKey = Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : 'unknown';
    const current = map.get(dateKey) ?? { events: 0, weightKg: 0, timestamp: event.timestamp };
    current.events += 1;
    current.weightKg += event.quantityKg;
    map.set(dateKey, current);
  }

  return Array.from(map.entries())
    .map(([dateKey, value]) => ({
      dateKey,
      label: dateKey === 'unknown' ? 'N/A' : dateFormat.format(new Date(value.timestamp)),
      events: value.events,
      weightKg: value.weightKg,
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-12);
}

function summarizeActions(rows: StockLedgerRow[]): Array<{ action: BlockchainAction; count: number; weightKg: number }> {
  return ACTION_ORDER.map((action) => {
    const filtered = rows.filter((row) => row.latestAction === action);
    return {
      action,
      count: filtered.length,
      weightKg: filtered.reduce((sum, row) => sum + row.quantityKg, 0),
    };
  });
}

function getTopGrade(grades: Record<QualityGrade, number>): QualityGrade {
  return GRADE_ORDER.reduce((best, grade) => (grades[grade] > grades[best] ? grade : best), 'A');
}

function buildCsv(rows: StockLedgerRow[]): string {
  const header = [
    'batch_id',
    'tenant_id',
    'commodity',
    'quantity_kg',
    'grade',
    'quality_score',
    'active',
    'latest_action',
    'latest_at',
    'latest_tx_id',
    'first_seen_at',
    'first_tx_id',
    'event_count',
    'operator_id',
    'farmer_id',
  ];
  const lines = rows.map((row) =>
    [
      row.batchId,
      row.tenantId,
      row.commodity,
      row.quantityKg,
      row.grade,
      row.qualityScore,
      row.active ? 'true' : 'false',
      row.latestAction,
      row.latestAt,
      row.latestTxId,
      row.firstSeenAt,
      row.firstTxId,
      row.eventCount,
      row.operatorId,
      row.farmerId ?? '',
    ]
      .map(toCsvCell)
      .join(','),
  );

  return [header.join(','), ...lines].join('\r\n');
}

function toCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatKg(value: number): string {
  return `${weightFormat.format(value)} kg`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'N/A';
  return dateTimeFormat.format(date);
}

function shortId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function toTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function LayersIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M3 7l9-4 9 4-9 4-9-4Zm0 5l9 4 9-4M3 17l9 4 9-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScaleIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M6 20h12M12 4v16M5 8h14M7 8l-3 6h6L7 8Zm10 0-3 6h6l-3-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QualityIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5L12 21l-5-2.8 1-5.5-4-3.9L9.5 8 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function TraceIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M5 7h7a4 4 0 0 1 0 8H8m11 2h-7a4 4 0 0 1 0-8h4M7 12h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4 11a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SnowIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" aria-hidden>
      <path d="M12 3v18M5 7l14 10M19 7 5 17M3 12h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)]" fill="none" aria-hidden>
      <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortIcon({ direction }: { direction: SortDirection }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      {direction === 'asc' ? (
        <path d="M8 6v12m0-12-3 3m3-3 3 3m8 9h-6m6-5h-8m8-5h-10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8 18V6m0 12-3-3m3 3 3-3m8-9h-6m6 5h-8m8 5h-10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
