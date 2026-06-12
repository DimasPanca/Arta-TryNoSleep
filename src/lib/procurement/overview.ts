/**
 * Model & perhitungan untuk Pengadaan Bersama lintas koperasi.
 *
 * Menjawab kasus lapangan:
 *  - "supplier memberi harga berbeda tergantung volume"  → {@link PricingTier}
 *  - "kebutuhan masing-masing berbeda"                   → requestedQty per peserta
 *  - "gudang mereka terpisah"                            → alokasi per peserta
 *  - "salah satu belum punya rekening di sistem"         → peserta `external`
 *
 * Transparansi dijamin Hyperledger Fabric: setiap pengadaan punya `txId`
 * sehingga setiap koperasi bisa memverifikasi alokasi & harga tanpa harus
 * saling percaya secara buta.
 */

import { cooperativeName, getCooperative } from '@/lib/procurement/cooperatives';

export type JointStatus =
  | 'planning' // inisiator menyusun kebutuhan
  | 'open' // peserta diundang & mengisi kebutuhan
  | 'confirmed' // alokasi disepakati, harga volume terkunci
  | 'purchasing' // sedang dibeli ke supplier
  | 'delivered' // barang sampai & didistribusikan ke gudang masing-masing
  | 'closed';

export type ParticipantPayment = 'pending' | 'paid';

/** Tier harga supplier berdasarkan volume gabungan. */
export interface PricingTier {
  /** Ambang volume minimal (dalam satuan komoditas). */
  minQty: number;
  /** Harga per satuan pada tier ini. */
  unitPrice: number;
  label: string;
}

export interface ParticipantAllocation {
  coopId: string;
  coopName: string;
  mspId: string;
  /** Kebutuhan yang diminta koperasi ini. */
  requestedQty: number;
  /** Alokasi final (bisa < requested bila over-subscribed). */
  allocatedQty: number;
  payment: ParticipantPayment;
  /** Sudah konfirmasi ikut? */
  confirmed: boolean;
  /** true → belum di sistem (konfirmasi/bayar dicatat manual). */
  external: boolean;
}

export interface JointProcurementView {
  id: string;
  commodity: string;
  /** Satuan: 'sak', 'kg', 'liter', dst. */
  unit: string;
  initiatorId: string;
  initiatorName: string;
  status: JointStatus;
  supplierName: string;
  /** Tier harga volume dari supplier (urut menaik berdasarkan minQty). */
  pricingTiers: PricingTier[];
  participants: ParticipantAllocation[];
  createdAt: string;
  /** Tanggal target pembelian/pengiriman. */
  targetDate: string;
  /** Hash transaksi Fabric (bila sudah ter-anchor). */
  txId?: string;
}

export interface JointMetrics {
  totalRequested: number;
  totalAllocated: number;
  participantCount: number;
  confirmedCount: number;
  /** Harga satuan jika tiap koperasi beli sendiri (volume kecil). */
  soloUnitPrice: number;
  /** Harga satuan hasil gabung volume. */
  jointUnitPrice: number;
  /** Total biaya bila beli sendiri-sendiri. */
  soloTotal: number;
  /** Total biaya beli bersama. */
  jointTotal: number;
  /** Penghematan rupiah. */
  savings: number;
  /** Penghematan dalam persen (0–100). */
  savingsPct: number;
  /** true bila permintaan melebihi kapasitas tier tertinggi yang dipilih. */
  oversubscribed: boolean;
}

const STATUS_FLOW: JointStatus[] = ['planning', 'open', 'confirmed', 'purchasing', 'delivered', 'closed'];

export function statusIndex(status: JointStatus): number {
  return STATUS_FLOW.indexOf(status);
}

/** Harga satuan untuk volume tertentu berdasarkan tier (ambil tier tertinggi yang terpenuhi). */
export function unitPriceForVolume(tiers: PricingTier[], volume: number): number {
  if (tiers.length === 0) return 0;
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let price = sorted[0]!.unitPrice;
  for (const tier of sorted) {
    if (volume >= tier.minQty) price = tier.unitPrice;
  }
  return price;
}

/** Harga satuan "beli sendiri" = tier volume terkecil (paling mahal). */
export function soloUnitPrice(tiers: PricingTier[]): number {
  if (tiers.length === 0) return 0;
  return [...tiers].sort((a, b) => a.minQty - b.minQty)[0]!.unitPrice;
}

/**
 * Hitung alokasi proporsional. Bila total permintaan melebihi kapasitas,
 * dipotong pro-rata. Mengembalikan peta coopId → alokasi (dibulatkan).
 */
export function computeAllocations(
  participants: Array<{ coopId: string; requestedQty: number }>,
  capacity?: number,
): Map<string, number> {
  const totalRequested = participants.reduce((s, p) => s + p.requestedQty, 0);
  const cap = capacity ?? totalRequested;
  const ratio = totalRequested > cap && totalRequested > 0 ? cap / totalRequested : 1;
  const result = new Map<string, number>();
  for (const p of participants) {
    result.set(p.coopId, Math.round(p.requestedQty * ratio));
  }
  return result;
}

export function computeMetrics(order: JointProcurementView): JointMetrics {
  const participants = order.participants;
  const totalRequested = participants.reduce((s, p) => s + p.requestedQty, 0);
  const totalAllocated = participants.reduce((s, p) => s + p.allocatedQty, 0);
  const solo = soloUnitPrice(order.pricingTiers);
  const joint = unitPriceForVolume(order.pricingTiers, totalRequested);
  const soloTotal = totalRequested * solo;
  const jointTotal = totalRequested * joint;
  const savings = Math.max(0, soloTotal - jointTotal);
  const topTier = [...order.pricingTiers].sort((a, b) => b.minQty - a.minQty)[0];

  return {
    totalRequested,
    totalAllocated,
    participantCount: participants.length,
    confirmedCount: participants.filter((p) => p.confirmed).length,
    soloUnitPrice: solo,
    jointUnitPrice: joint,
    soloTotal,
    jointTotal,
    savings,
    savingsPct: soloTotal > 0 ? (savings / soloTotal) * 100 : 0,
    oversubscribed: topTier ? totalAllocated < totalRequested : false,
  };
}

/** Ringkasan portofolio seluruh pengadaan untuk KPI di header. */
export interface ProcurementSummary {
  totalOrders: number;
  activeOrders: number;
  totalVolumeRequested: number;
  totalSavings: number;
  participatingCoops: number;
  anchoredCount: number;
}

export function summarizeOrders(orders: JointProcurementView[]): ProcurementSummary {
  const coops = new Set<string>();
  let totalVolumeRequested = 0;
  let totalSavings = 0;
  let anchoredCount = 0;

  for (const order of orders) {
    for (const p of order.participants) coops.add(p.coopId);
    const m = computeMetrics(order);
    totalVolumeRequested += m.totalRequested;
    totalSavings += m.savings;
    if (order.txId) anchoredCount += 1;
  }

  return {
    totalOrders: orders.length,
    activeOrders: orders.filter((o) => o.status !== 'closed' && o.status !== 'delivered').length,
    totalVolumeRequested,
    totalSavings,
    participatingCoops: coops.size,
    anchoredCount,
  };
}

/** Status koneksi Fabric (best-effort). Diisi oleh modul server `fabric.ts`. */
export interface ProcurementFabricStatus {
  online: boolean;
  configuredUrl: string;
  checkedAt: string;
  error?: string;
}

/** Bangun view dari baris DB + alokasi (untuk jalur data nyata). */
export function buildJointView(
  row: {
    id: string;
    commodity: string;
    unit?: string | null;
    initiatedBy: string;
    status: JointStatus;
    supplierName?: string | null;
    pricingTiers?: PricingTier[] | null;
    targetDate?: string | null;
    createdAt: string;
    txId?: string | null;
  },
  allocations: Array<{
    coopId: string;
    requestedQty: number;
    allocatedQty: number;
    payment: ParticipantPayment;
    confirmed: boolean;
  }>,
): JointProcurementView {
  return {
    id: row.id,
    commodity: row.commodity,
    unit: row.unit ?? 'kg',
    initiatorId: row.initiatedBy,
    initiatorName: cooperativeName(row.initiatedBy),
    status: row.status,
    supplierName: row.supplierName ?? 'Supplier belum ditentukan',
    pricingTiers: row.pricingTiers ?? [],
    participants: allocations.map((a) => {
      const coop = getCooperative(a.coopId);
      return {
        coopId: a.coopId,
        coopName: coop?.name ?? a.coopId,
        mspId: coop?.mspId ?? a.coopId,
        requestedQty: a.requestedQty,
        allocatedQty: a.allocatedQty,
        payment: a.payment,
        confirmed: a.confirmed,
        external: coop ? !coop.onSystem : false,
      };
    }),
    createdAt: row.createdAt,
    targetDate: row.targetDate ?? row.createdAt,
    ...(row.txId ? { txId: row.txId } : {}),
  };
}
