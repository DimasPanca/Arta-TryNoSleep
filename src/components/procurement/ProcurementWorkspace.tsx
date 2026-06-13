'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { COOPERATIVES, OUR_COOP } from '@/lib/procurement/cooperatives';
import {
  computeMetrics,
  soloUnitPrice,
  statusIndex,
  summarizeOrders,
  unitPriceForVolume,
  type JointProcurementView,
  type JointStatus,
  type ParticipantAllocation,
  type PricingTier,
  type ProcurementFabricStatus,
} from '@/lib/procurement/overview';

import {
  BoxIcon,
  ChainIcon,
  CheckIcon,
  CoopAvatar,
  CooperativeNetwork,
  DownloadIcon,
  formatDate,
  formatQty,
  formatRp,
  formatRpShort,
  PlusIcon,
  SavingsIcon,
  shortHash,
  STATUS_FLOW,
  StatusPill,
  TruckIcon,
  UsersIcon,
} from './shared';

interface ProcurementWorkspaceProps {
  orders: JointProcurementView[];
  tenantName: string;
  fabric: ProcurementFabricStatus;
  canCreate: boolean;
  preview: boolean;
}

const integerFormat = new Intl.NumberFormat('id-ID');

export function ProcurementWorkspace({
  orders: initialOrders,
  tenantName,
  fabric,
  canCreate,
  preview,
}: ProcurementWorkspaceProps): ReactNode {
  const [orders, setOrders] = useState<JointProcurementView[]>(initialOrders);
  const [selectedId, setSelectedId] = useState<string | null>(initialOrders[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [anchoringId, setAnchoringId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const summary = useMemo(() => summarizeOrders(orders), [orders]);
  const selected = orders.find((o) => o.id === selectedId) ?? orders[0] ?? null;
  const activeCoopIds = useMemo(
    () => (selected ? selected.participants.map((p) => p.coopId) : []),
    [selected],
  );

  function patchOrder(id: string, patch: Partial<JointProcurementView>): void {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  async function handleAnchor(order: JointProcurementView): Promise<void> {
    setAnchoringId(order.id);
    setNotice(null);
    try {
      if (preview || !fabric.online) {
        await new Promise((r) => setTimeout(r, 850));
        patchOrder(order.id, { txId: randomHash() });
        setNotice('Pengadaan dicatat ke ledger (simulasi pratinjau).');
      } else {
        const res = await fetch('/api/procurement/anchor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ procurementId: order.id }),
        });
        const json = (await res.json()) as { ok?: boolean; txId?: string; error?: string };
        if (json.ok && json.txId) {
          patchOrder(order.id, { txId: json.txId });
          setNotice('Pengadaan berhasil dicatat ke Hyperledger Fabric.');
        } else {
          setNotice(json.error ?? 'Gagal mencatat ke Fabric.');
        }
      }
    } catch {
      setNotice('Gagal menghubungi layanan pencatatan.');
    } finally {
      setAnchoringId(null);
    }
  }

  function handleCreate(order: JointProcurementView): void {
    setOrders((prev) => [order, ...prev]);
    setSelectedId(order.id);
    setCreating(false);
    setNotice('Pengadaan bersama dibuat. Undang koperasi & kunci alokasi, lalu catat ke ledger.');
  }

  function exportCsv(): void {
    const csv = buildCsv(orders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arta-pengadaan-bersama.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Header
        tenantName={tenantName}
        fabric={fabric}
        preview={preview}
        canCreate={canCreate}
        onCreate={() => setCreating(true)}
        onExport={exportCsv}
        hasOrders={orders.length > 0}
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-4 py-3 text-sm text-[var(--color-brand-800)] animate-arta-rise">
          <ChainIcon className="h-4 w-4 flex-shrink-0" />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto text-[var(--color-brand-700)] hover:text-[var(--color-brand-900)] cursor-pointer"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pengadaan bersama"
          value={integerFormat.format(summary.totalOrders)}
          helper={`${integerFormat.format(summary.activeOrders)} sedang berjalan`}
          icon={<BoxIcon />}
        />
        <MetricCard
          label="Koperasi terlibat"
          value={integerFormat.format(summary.participatingCoops)}
          helper={`dari ${COOPERATIVES.length} koperasi jejaring`}
          icon={<UsersIcon />}
        />
        <MetricCard
          label="Total volume diminta"
          value={integerFormat.format(summary.totalVolumeRequested)}
          helper="gabungan seluruh pengadaan"
          icon={<TruckIcon />}
        />
        <MetricCard
          label="Estimasi penghematan"
          value={formatRpShort(summary.totalSavings)}
          helper={`${summary.anchoredCount} tercatat on-chain`}
          icon={<SavingsIcon />}
          highlight
        />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Kolom kiri: jejaring + daftar pengadaan */}
        <div className="space-y-4 xl:col-span-5">
          <Panel title="Jejaring koperasi" subtitle="Melati Jaya sebagai pusat pengadaan">
            <CooperativeNetwork activeCoopIds={activeCoopIds} />
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
              Garis menyala = koperasi yang terlibat pada pengadaan terpilih. Setiap transaksi diverifikasi lintas
              organisasi melalui Hyperledger Fabric.
            </p>
          </Panel>

          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Daftar pengadaan</h2>
              <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 font-[var(--font-mono)] text-xs text-[var(--color-text-muted)]">
                {orders.length}
              </span>
            </div>
            {orders.length === 0 ? (
              <EmptyState canCreate={canCreate} onCreate={() => setCreating(true)} />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    active={order.id === selected?.id}
                    onSelect={() => setSelectedId(order.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Kolom kanan: detail */}
        <div className="xl:col-span-7">
          {selected ? (
            <DetailPanel
              order={selected}
              canCreate={canCreate}
              anchoring={anchoringId === selected.id}
              onAnchor={() => handleAnchor(selected)}
            />
          ) : (
            <div className="grid h-full min-h-64 place-items-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-8 text-center text-sm text-[var(--color-text-muted)]">
              Pilih pengadaan untuk melihat rincian alokasi & penghematan.
            </div>
          )}
        </div>
      </div>

      {creating && (
        <CreateOrderModal preview={preview} onClose={() => setCreating(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}

/* ── Header ───────────────────────────────────────────────────────── */

function Header({
  tenantName,
  fabric,
  preview,
  canCreate,
  hasOrders,
  onCreate,
  onExport,
}: {
  tenantName: string;
  fabric: ProcurementFabricStatus;
  preview: boolean;
  canCreate: boolean;
  hasOrders: boolean;
  onCreate: () => void;
  onExport: () => void;
}): ReactNode {
  return (
    <header className="animate-arta-rise">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={
                fabric.online
                  ? { backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }
                  : { backgroundColor: 'var(--color-amber-100)', color: 'var(--color-amber-400)' }
              }
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: fabric.online ? 'var(--color-brand-600)' : 'var(--color-amber-400)' }}
              />
              Hyperledger Fabric {fabric.online ? 'terhubung' : 'luring'}
            </span>
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-card)] px-2.5 py-1 text-[var(--color-text-secondary)]">
              {tenantName}
            </span>
            {preview && (
              <span className="rounded-full bg-[var(--color-amber-100)] px-2.5 py-1 text-[var(--color-amber-400)]">
                Pratinjau lokal
              </span>
            )}
          </div>
          <h1 className="mt-2 font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
            Pengadaan bersama
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
            Gabungkan kebutuhan lintas koperasi untuk menebus harga volume, alokasikan adil per gudang, dan catat
            setiap kesepakatan ke blockchain agar transparan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={!hasOrders}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <DownloadIcon />
            Ekspor CSV
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
            >
              <PlusIcon />
              Buat pengadaan
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  highlight?: boolean;
}): ReactNode {
  return (
    <article
      className={`rounded-lg border p-4 transition-colors duration-200 ${
        highlight
          ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-50)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-card)] hover:border-[var(--color-brand-200)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
          <p className="mt-1 truncate font-[var(--font-display)] text-[2rem] leading-none text-[var(--color-text-primary)]">
            {value}
          </p>
        </div>
        <span
          className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${
            highlight ? 'bg-[var(--color-brand-600)] text-white' : 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">{helper}</p>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/* ── Baris pengadaan ──────────────────────────────────────────────── */

function OrderRow({
  order,
  active,
  onSelect,
}: {
  order: JointProcurementView;
  active: boolean;
  onSelect: () => void;
}): ReactNode {
  const m = computeMetrics(order);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
          active ? 'bg-[var(--color-brand-50)]' : 'hover:bg-[var(--color-surface)]'
        }`}
      >
        <span
          className="h-9 w-1 flex-shrink-0 rounded-full"
          style={{ backgroundColor: active ? 'var(--color-brand-600)' : 'transparent' }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{order.commodity}</p>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
            Inisiator {order.initiatorName.replace('Koperasi ', '')} · {order.participants.length} koperasi
          </p>
          <div className="mt-2 flex items-center gap-2">
            <AvatarStack participants={order.participants} />
            <StatusPill status={order.status} />
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          {m.savings > 0 ? (
            <>
              <p className="font-[var(--font-mono)] text-sm font-semibold text-[var(--color-brand-700)]">
                −{m.savingsPct.toFixed(0)}%
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">{formatRpShort(m.savings)}</p>
            </>
          ) : (
            <p className="text-[11px] text-[var(--color-text-muted)]">menyusun</p>
          )}
          {order.txId && (
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-50)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-brand-700)]"
              title={order.txId}
            >
              <ChainIcon className="h-3 w-3" />
              on-chain
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

function AvatarStack({ participants }: { participants: ParticipantAllocation[] }): ReactNode {
  const shown = participants.slice(0, 4);
  const rest = participants.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p) => (
        <CoopAvatar key={p.coopId} coopId={p.coopId} name={p.coopName} size="sm" ring />
      ))}
      {rest > 0 && (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-surface)] text-[10px] font-bold text-[var(--color-text-muted)] ring-2 ring-white">
          +{rest}
        </span>
      )}
    </div>
  );
}

/* ── Panel detail ─────────────────────────────────────────────────── */

function DetailPanel({
  order,
  canCreate,
  anchoring,
  onAnchor,
}: {
  order: JointProcurementView;
  canCreate: boolean;
  anchoring: boolean;
  onAnchor: () => void;
}): ReactNode {
  const m = computeMetrics(order);

  return (
    <div className="space-y-4">
      {/* Kepala */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CoopAvatar coopId={order.initiatorId} name={order.initiatorName} size="md" />
              <div className="min-w-0">
                <h2 className="truncate font-[var(--font-display)] text-xl leading-tight text-[var(--color-text-primary)]">
                  {order.commodity}
                </h2>
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  Inisiator {order.initiatorName} · target {formatDate(order.targetDate)}
                </p>
              </div>
            </div>
          </div>
          <StatusPill status={order.status} />
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-surface)] px-3 py-2.5">
          <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-surface-card)] text-[var(--color-text-secondary)]">
            <TruckIcon />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--color-text-muted)]">Supplier</p>
            <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{order.supplierName}</p>
          </div>
        </div>

        <StatusTimeline status={order.status} />
      </section>

      {/* Sorotan penghematan */}
      <SavingsSpotlight order={order} />

      {/* Tier harga volume */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Harga berdasarkan volume</h3>
          <span className="text-xs text-[var(--color-text-muted)]">
            Volume gabungan {formatQty(m.totalRequested, order.unit)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          Supplier memberi harga berbeda menurut volume. Dengan menggabungkan kebutuhan, koperasi menebus tier yang
          lebih murah.
        </p>
        <PricingLadder tiers={order.pricingTiers} unit={order.unit} totalVolume={m.totalRequested} />
      </section>

      {/* Alokasi per koperasi */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Alokasi per koperasi</h3>
          <span className="text-xs text-[var(--color-text-muted)]">
            {m.confirmedCount}/{m.participantCount} konfirmasi
          </span>
        </div>
        {m.oversubscribed && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--color-amber-100)] px-3 py-2 text-[11px] text-[var(--color-amber-400)]">
            Permintaan melebihi kapasitas. Alokasi dipotong secara proporsional (pro-rata).
          </p>
        )}
        <div className="mt-3 space-y-2">
          {order.participants.map((p) => (
            <AllocationRow key={p.coopId} participant={p} unit={order.unit} unitPrice={m.jointUnitPrice} />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-sm">
          <span className="text-[var(--color-text-secondary)]">Total dialokasikan</span>
          <span className="font-[var(--font-mono)] font-semibold text-[var(--color-text-primary)]">
            {formatQty(m.totalAllocated, order.unit)} · {formatRp(m.totalAllocated * m.jointUnitPrice)}
          </span>
        </div>
      </section>

      {/* Transparansi Fabric */}
      <FabricRecord order={order} canAnchor={canCreate} anchoring={anchoring} onAnchor={onAnchor} />
    </div>
  );
}

function StatusTimeline({ status }: { status: JointStatus }): ReactNode {
  const current = statusIndex(status);
  const labels: Record<JointStatus, string> = {
    planning: 'Rencana',
    open: 'Undang',
    confirmed: 'Sepakat',
    purchasing: 'Beli',
    delivered: 'Kirim',
    closed: 'Selesai',
  };
  return (
    <ol className="mt-4 flex items-center">
      {STATUS_FLOW.map((step, i) => {
        const done = current >= statusIndex(step) || status === 'closed';
        const isCurrent = step === status;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold transition-colors ${
                  done
                    ? 'bg-[var(--color-brand-600)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]'
                } ${isCurrent ? 'ring-2 ring-[var(--color-brand-200)]' : ''}`}
              >
                {done ? <CheckIcon className="h-3 w-3" /> : i + 1}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">{labels[step]}</span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <span
                className="mx-1 h-0.5 flex-1 rounded-full"
                style={{
                  backgroundColor:
                    current > statusIndex(step) || status === 'closed'
                      ? 'var(--color-brand-600)'
                      : 'var(--color-border)',
                }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SavingsSpotlight({ order }: { order: JointProcurementView }): ReactNode {
  const m = computeMetrics(order);
  const animatedSavings = useCountUp(m.savings, order.id);
  const jointRatio = m.soloTotal > 0 ? (m.jointTotal / m.soloTotal) * 100 : 100;

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--color-brand-200)] bg-gradient-to-br from-[var(--color-brand-50)] to-[var(--color-surface-card)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[var(--color-brand-600)] text-white">
          <SavingsIcon />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-700)]">
            Penghematan beli bersama
          </p>
          <p className="font-[var(--font-display)] text-[2.4rem] leading-none text-[var(--color-brand-800)]">
            {formatRp(animatedSavings)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {m.savingsPct.toFixed(1)}% lebih hemat dari beli sendiri-sendiri
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        <PriceBar
          label="Beli sendiri"
          sub={`${formatRp(m.soloUnitPrice)}/${order.unit}`}
          amount={m.soloTotal}
          widthPct={100}
          color="var(--color-text-muted)"
        />
        <PriceBar
          label="Beli bersama"
          sub={`${formatRp(m.jointUnitPrice)}/${order.unit}`}
          amount={m.jointTotal}
          widthPct={Math.max(8, jointRatio)}
          color="var(--color-brand-600)"
          strong
        />
      </div>
    </section>
  );
}

function PriceBar({
  label,
  sub,
  amount,
  widthPct,
  color,
  strong,
}: {
  label: string;
  sub: string;
  amount: number;
  widthPct: number;
  color: string;
  strong?: boolean;
}): ReactNode {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-[var(--color-text-secondary)]">
          {label} <span className="text-[var(--color-text-muted)]">· {sub}</span>
        </span>
        <span className={`font-[var(--font-mono)] ${strong ? 'font-semibold text-[var(--color-brand-700)]' : 'text-[var(--color-text-secondary)]'}`}>
          {formatRp(amount)}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.0,0.0,0.2,1)]"
          style={{ width: `${widthPct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function PricingLadder({
  tiers,
  unit,
  totalVolume,
}: {
  tiers: PricingTier[];
  unit: string;
  totalVolume: number;
}): ReactNode {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const activePrice = unitPriceForVolume(tiers, totalVolume);
  const solo = soloUnitPrice(tiers);

  return (
    <ul className="mt-3 space-y-1.5">
      {sorted.map((tier) => {
        const isActive = tier.unitPrice === activePrice;
        const cut = solo > 0 ? Math.round(((solo - tier.unitPrice) / solo) * 100) : 0;
        return (
          <li
            key={`${tier.minQty}-${tier.unitPrice}`}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
              isActive
                ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-50)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            <span
              className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-xs font-bold ${
                isActive ? 'bg-[var(--color-brand-600)] text-white' : 'bg-[var(--color-surface-card)] text-[var(--color-text-muted)]'
              }`}
            >
              {tier.minQty === 0 ? '1' : `${tier.minQty}+`}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{tier.label}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {tier.minQty === 0 ? 'volume kecil' : `mulai ${formatQty(tier.minQty, unit)}`}
                {cut > 0 ? ` · hemat ${cut}%` : ''}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="font-[var(--font-mono)] text-sm font-semibold text-[var(--color-text-primary)]">
                {formatRp(tier.unitPrice)}
              </p>
              {isActive && (
                <p className="text-[10px] font-semibold text-[var(--color-brand-700)]">← volume kalian</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AllocationRow({
  participant,
  unit,
  unitPrice,
}: {
  participant: ParticipantAllocation;
  unit: string;
  unitPrice: number;
}): ReactNode {
  const cut = participant.requestedQty > 0 ? (participant.allocatedQty / participant.requestedQty) * 100 : 100;
  const reduced = participant.allocatedQty < participant.requestedQty;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-2.5">
      <CoopAvatar coopId={participant.coopId} name={participant.coopName} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            {participant.coopName.replace('Koperasi ', '')}
          </p>
          {participant.external && (
            <span
              className="rounded-full bg-[#ede9fe] px-1.5 py-0.5 text-[9px] font-semibold text-[#7c3aed]"
              title="Belum terdaftar di sistem. Konfirmasi dan bayar secara manual."
            >
              manual
            </span>
          )}
          {participant.confirmed ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--color-grade-a)]">
              <CheckIcon className="h-3 w-3" /> konfirmasi
            </span>
          ) : (
            <span className="text-[10px] text-[var(--color-text-muted)]">menunggu</span>
          )}
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${cut}%`,
              backgroundColor: reduced ? 'var(--color-amber-400)' : 'var(--color-brand-600)',
            }}
          />
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-[var(--font-mono)] text-sm text-[var(--color-text-primary)]">
          {integerFormat.format(participant.allocatedQty)}
          {reduced && (
            <span className="text-[var(--color-text-muted)]"> / {integerFormat.format(participant.requestedQty)}</span>
          )}
          <span className="text-[11px] text-[var(--color-text-muted)]"> {unit.split(' ')[0]}</span>
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          {formatRpShort(participant.allocatedQty * unitPrice)} ·{' '}
          <span style={{ color: participant.payment === 'paid' ? 'var(--color-grade-a)' : 'var(--color-amber-400)' }}>
            {participant.payment === 'paid' ? 'lunas' : 'belum'}
          </span>
        </p>
      </div>
    </div>
  );
}

function FabricRecord({
  order,
  canAnchor,
  anchoring,
  onAnchor,
}: {
  order: JointProcurementView;
  canAnchor: boolean;
  anchoring: boolean;
  onAnchor: () => void;
}): ReactNode {
  const recorded = Boolean(order.txId);
  return (
    <section
      className={`rounded-lg border p-4 ${
        recorded ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-50)]' : 'border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-card)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${
            recorded ? 'bg-[var(--color-brand-600)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
          }`}
        >
          <ChainIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {recorded ? 'Tercatat di Hyperledger Fabric' : 'Belum dicatat ke blockchain'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {recorded
              ? 'Alokasi dan harga telah dikunci permanen di blockchain. Setiap koperasi dapat memverifikasi secara independen.'
              : 'Kunci kesepakatan dengan mencatat alokasi & harga ke ledger bersama.'}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <Meta label="Channel" value="arta-channel" />
            <Meta label="Chaincode" value="stock-trace" />
            {recorded && <Meta label="Tx" value={shortHash(order.txId!)} mono />}
            <Meta label="Inisiator MSP" value={order.participants.find((p) => p.coopId === order.initiatorId)?.mspId ?? '—'} mono />
          </dl>
        </div>
      </div>
      {!recorded && canAnchor && (
        <button
          type="button"
          onClick={onAnchor}
          disabled={anchoring}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:opacity-60 cursor-pointer"
        >
          {anchoring ? (
            <>
              <span className="h-4 w-4 animate-arta-spin rounded-full border-2 border-white/40 border-t-white" />
              Mencatat ke ledger…
            </>
          ) : (
            <>
              <ChainIcon className="h-4 w-4" />
              Catat ke blockchain
            </>
          )}
        </button>
      )}
    </section>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }): ReactNode {
  return (
    <div className="min-w-0">
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd className={`truncate ${mono ? 'font-[var(--font-mono)]' : ''} text-[var(--color-text-secondary)]`} title={value}>
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }): ReactNode {
  return (
    <div className="px-4 py-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
        <BoxIcon />
      </span>
      <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Belum ada pengadaan bersama</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-[var(--color-text-secondary)]">
        Mulai gabungkan kebutuhan dengan koperasi lain untuk menebus harga volume.
      </p>
      {canCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
        >
          <PlusIcon />
          Buat pengadaan
        </button>
      )}
    </div>
  );
}

/* ── Modal buat pengadaan ─────────────────────────────────────────── */

interface DraftParticipant {
  coopId: string;
  selected: boolean;
  requestedQty: number;
}

function CreateOrderModal({
  preview,
  onClose,
  onCreate,
}: {
  preview: boolean;
  onClose: () => void;
  onCreate: (order: JointProcurementView) => void;
}): ReactNode {
  const [commodity, setCommodity] = useState('');
  const [unit, setUnit] = useState('sak');
  const [supplier, setSupplier] = useState('');
  const [soloPrice, setSoloPrice] = useState(0);
  const [jointPrice, setJointPrice] = useState(0);
  const [threshold, setThreshold] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [participants, setParticipants] = useState<DraftParticipant[]>(
    COOPERATIVES.map((c) => ({ coopId: c.id, selected: c.isUs, requestedQty: c.isUs ? 10 : 0 })),
  );

  const chosen = participants.filter((p) => p.selected && p.requestedQty > 0);
  const totalQty = chosen.reduce((s, p) => s + p.requestedQty, 0);
  const valid =
    commodity.trim().length > 0 && supplier.trim().length > 0 && soloPrice > 0 && jointPrice > 0 && chosen.length >= 2;

  function toggle(coopId: string): void {
    setParticipants((prev) =>
      prev.map((p) => (p.coopId === coopId ? { ...p, selected: !p.selected } : p)),
    );
  }
  function setQty(coopId: string, qty: number): void {
    setParticipants((prev) =>
      prev.map((p) => (p.coopId === coopId ? { ...p, requestedQty: Math.max(0, qty), selected: qty > 0 ? true : p.selected } : p)),
    );
  }

  async function submit(): Promise<void> {
    if (!valid) return;
    setSubmitting(true);
    const tiers: PricingTier[] = [
      { minQty: 0, unitPrice: soloPrice, label: 'Eceran (beli sendiri)' },
      { minQty: threshold, unitPrice: jointPrice, label: `Volume ${threshold}+ ${unit}` },
    ];
    const order: JointProcurementView = {
      id: `jp-${Date.now().toString(36)}`,
      commodity: commodity.trim(),
      unit,
      initiatorId: OUR_COOP.id,
      initiatorName: OUR_COOP.name,
      status: 'open',
      supplierName: supplier.trim(),
      pricingTiers: tiers,
      participants: chosen.map((p) => {
        const coop = COOPERATIVES.find((c) => c.id === p.coopId)!;
        return {
          coopId: p.coopId,
          coopName: coop.name,
          mspId: coop.mspId,
          requestedQty: p.requestedQty,
          allocatedQty: p.requestedQty,
          payment: 'pending' as const,
          confirmed: coop.isUs,
          external: !coop.onSystem,
        };
      }),
      createdAt: new Date().toISOString(),
      targetDate: new Date(Date.now() + 14 * 864e5).toISOString(),
    };

    // Jalur data nyata (best-effort, tidak memblok UX pratinjau).
    if (!preview) {
      try {
        await fetch('/api/procurement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commodity: order.commodity,
            totalQuantity: totalQty,
            unitPrice: jointPrice,
            initiatedBy: OUR_COOP.id,
            participants: chosen.map((p) => ({ tenantId: p.coopId, requestedKg: p.requestedQty })),
          }),
        });
      } catch {
        /* tetap tampilkan optimistik */
      }
    }
    setSubmitting(false);
    onCreate(order);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buat pengadaan bersama"
        className="relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.4)] animate-arta-rise"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-xl text-[var(--color-text-primary)]">Buat pengadaan bersama</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] cursor-pointer"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Komoditas" className="col-span-2">
              <input
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                placeholder="mis. Pupuk Urea bersubsidi"
                className={inputCls}
              />
            </Field>
            <Field label="Satuan">
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="sak / kg / liter" className={inputCls} />
            </Field>
            <Field label="Supplier">
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="nama distributor" className={inputCls} />
            </Field>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Harga supplier</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Field label="Eceran/sat.">
                <input type="number" min={0} value={soloPrice || ''} onChange={(e) => setSoloPrice(Number(e.target.value))} placeholder="130000" className={inputCls} />
              </Field>
              <Field label="Harga gabung">
                <input type="number" min={0} value={jointPrice || ''} onChange={(e) => setJointPrice(Number(e.target.value))} placeholder="98000" className={inputCls} />
              </Field>
              <Field label={`Ambang (${unit})`}>
                <input type="number" min={1} value={threshold || ''} onChange={(e) => setThreshold(Number(e.target.value))} placeholder="50" className={inputCls} />
              </Field>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Koperasi peserta & kebutuhan</p>
            <div className="mt-2 space-y-1.5">
              {participants.map((p) => {
                const coop = COOPERATIVES.find((c) => c.id === p.coopId)!;
                return (
                  <div
                    key={p.coopId}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                      p.selected ? 'border-[var(--color-brand-200)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={p.selected}
                      onChange={() => toggle(p.coopId)}
                      disabled={coop.isUs}
                      className="h-4 w-4 accent-[var(--color-brand-600)] cursor-pointer"
                      aria-label={`Ikutkan ${coop.name}`}
                    />
                    <CoopAvatar coopId={p.coopId} name={coop.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {coop.name.replace('Koperasi ', '')}
                        {coop.isUs && <span className="ml-1 text-[10px] text-[var(--color-brand-700)]">(kita)</span>}
                      </p>
                      {!coop.onSystem && <p className="text-[10px] text-[#7c3aed]">manual · sinyal lemah</p>}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={p.requestedQty || ''}
                      onChange={(e) => setQty(p.coopId, Number(e.target.value))}
                      placeholder="0"
                      className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-2 py-1.5 text-right text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-400)]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface)] px-3 py-2.5 text-sm">
            <span className="text-[var(--color-text-secondary)]">Total volume gabungan</span>
            <span className="font-[var(--font-mono)] font-semibold text-[var(--color-text-primary)]">
              {formatQty(totalQty, unit)}
              {totalQty >= threshold && soloPrice > 0 && jointPrice > 0 && (
                <span className="ml-2 text-[var(--color-brand-700)]">
                  hemat {formatRpShort(totalQty * (soloPrice - jointPrice))}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <span className="h-4 w-4 animate-arta-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <PlusIcon />
            )}
            Buat pengadaan
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-brand-400)] placeholder:text-[var(--color-text-muted)]';

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }): ReactNode {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

/* ── util ─────────────────────────────────────────────────────────── */

function randomHash(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 40; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

/** Count-up animasi untuk angka sorotan; restart saat `resetKey` berubah. */
function useCountUp(target: number, resetKey: string): number {
  const [value, setValue] = useState(target);
  const frame = useRef<number>(0);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const duration = 700;
    const from = 0;
    function tick(now: number): void {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, resetKey]);
  return value;
}

function buildCsv(orders: JointProcurementView[]): string {
  const header = [
    'procurement_id',
    'commodity',
    'unit',
    'initiator',
    'supplier',
    'status',
    'coop',
    'msp_id',
    'requested_qty',
    'allocated_qty',
    'unit_price',
    'subtotal',
    'payment',
    'confirmed',
    'external',
    'tx_id',
  ];
  const lines: string[] = [];
  for (const order of orders) {
    const m = computeMetrics(order);
    for (const p of order.participants) {
      lines.push(
        [
          order.id,
          order.commodity,
          order.unit,
          order.initiatorName,
          order.supplierName,
          order.status,
          p.coopName,
          p.mspId,
          p.requestedQty,
          p.allocatedQty,
          m.jointUnitPrice,
          p.allocatedQty * m.jointUnitPrice,
          p.payment,
          p.confirmed ? 'true' : 'false',
          p.external ? 'true' : 'false',
          order.txId ?? '',
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }
  return [header.join(','), ...lines].join('\r\n');
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
