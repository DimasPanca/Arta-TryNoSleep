/**
 * Model domain untuk halaman Audit & Portofolio Koperasi Arta.
 *
 * Menjawab dua kebutuhan:
 *  1. Audit internal — anomali, log aktivitas, rekam jejak Fabric, integritas
 *  2. Portofolio trusted — track record on-chain yang bisa dibagikan ke mitra/dinas
 *     tanpa memperlihatkan data sensitif. Tiap metrik portofolio punya `anchorTxId`
 *     sehingga penerima bisa memverifikasi langsung ke ledger Hyperledger Fabric.
 *
 * Pure & client-safe — tidak mengimpor modul server.
 */

/* ── Anomali ──────────────────────────────────────────────────────── */

export type AnomalySeverity = 'critical' | 'warning' | 'info';
export type AuditModule = 'finance' | 'stock' | 'members' | 'procurement' | 'blockchain';

export interface AnomalyRecord {
  id: string;
  severity: AnomalySeverity;
  module: AuditModule;
  title: string;
  description: string;
  actor?: string;
  entityRef?: string;
  detectedAt: string;
  resolved: boolean;
  /** true → butuh `audit:investigate` untuk buka detail */
  requiresInvestigation: boolean;
}

/* ── Log Aktivitas ────────────────────────────────────────────────── */

export type ActivityModule = AuditModule | 'system';

export interface ActivityLog {
  id: string;
  module: ActivityModule;
  actor: string;
  actorRole: string;
  action: string;
  /** Deskripsi human-readable. */
  description: string;
  entityRef?: string;
  amount?: number;
  /** txId bila aksi ini dicatat ke Fabric. */
  txId?: string;
  timestamp: string;
}

/* ── Rekam Jejak Blockchain ───────────────────────────────────────── */

export type FabricChaincode = 'stock-trace' | 'credit-history' | 'procurement';

export interface BlockchainRecord {
  id: string;
  txId: string;
  channel: 'arta-channel';
  chaincode: FabricChaincode;
  /** Nama fungsi yang dipanggil. */
  fnName: string;
  module: AuditModule;
  summary: string;
  initiator: string;
  timestamp: string;
  /** true bila cross-verified dari dua koperasi. */
  crossVerified: boolean;
}

/* ── Laporan Kepatuhan ────────────────────────────────────────────── */

export type ReportPeriod = 'monthly' | 'quarterly' | 'annual';
export type ReportModule = 'finance' | 'procurement' | 'members' | 'stock';

export interface ComplianceReport {
  id: string;
  module: ReportModule;
  period: ReportPeriod;
  periodLabel: string;
  generatedAt: string;
  summary: string;
  metrics: Array<{ label: string; value: string; trend?: 'up' | 'down' | 'flat'; good?: boolean }>;
  /** txId snapshot akhir periode yang dikunci di Fabric */
  anchorTxId?: string;
}

/* ── Integritas Fabric ────────────────────────────────────────────── */

export interface FabricIntegrity {
  online: boolean;
  configuredUrl: string;
  checkedAt: string;
  totalAnchored: number;
  totalUnanchored: number;
  /** ISO string event terakhir ter-anchor */
  lastAnchoredAt?: string;
  /** Rantai koperasi peer yang terhubung */
  connectedPeers: string[];
  error?: string;
}

/* ── Portofolio Terpercaya ────────────────────────────────────────── */

/**
 * Portofolio koperasi yang sepenuhnya berbasis data on-chain.
 *
 * Setiap metrik punya `anchorTxId` sehingga penerima (mitra/dinas) dapat:
 * 1. Melihat ringkasan tanpa data sensitif individual.
 * 2. Memverifikasi angka langsung ke ledger Fabric.
 * 3. Mempercayai data tanpa bergantung pada "kata pengurus saja".
 *
 * Portofolio bisa dibagikan via tautan dengan scope yang dikonfigurasi.
 */
export type PortfolioScope = 'full' | 'finance_only' | 'procurement_only' | 'public_summary';

export interface PortfolioMetric {
  label: string;
  value: string;
  sub?: string;
  /** Hash tx Fabric yang membuktikan nilai ini. */
  anchorTxId?: string;
  trend?: 'up' | 'down' | 'flat';
  good?: boolean;
}

export interface PortfolioSection {
  id: string;
  title: string;
  icon: 'finance' | 'procurement' | 'members' | 'stock' | 'integrity';
  metrics: PortfolioMetric[];
  /** txId snapshot yang mengunci seluruh seksi ini */
  sectionAnchorTxId?: string;
  lastUpdated: string;
}

export interface CoopPortfolio {
  coopName: string;
  coopId: string;
  /** Sektor usaha koperasi */
  sector: string;
  location: string;
  establishedYear: number;
  scope: PortfolioScope;
  sections: PortfolioSection[];
  /** Dihasilkan & ditandatangani oleh Fabric — verifiable hash of all txIds */
  portfolioHash?: string;
  generatedAt: string;
  /** Tautan berbagi (opsional, dibuat saat user klik "Bagikan") */
  shareToken?: string;
}

/* ── Ringkasan halaman ────────────────────────────────────────────── */

export interface AuditSummary {
  criticalCount: number;
  warningCount: number;
  resolvedToday: number;
  totalActivities: number;
  anchoredRecords: number;
  unanchoredRecords: number;
  fabricOnline: boolean;
}

export function computeAuditSummary(
  anomalies: AnomalyRecord[],
  activities: ActivityLog[],
  blockchain: BlockchainRecord[],
  fabric: FabricIntegrity,
): AuditSummary {
  const today = new Date().toDateString();
  return {
    criticalCount: anomalies.filter((a) => a.severity === 'critical' && !a.resolved).length,
    warningCount: anomalies.filter((a) => a.severity === 'warning' && !a.resolved).length,
    resolvedToday: anomalies.filter((a) => a.resolved && new Date(a.detectedAt).toDateString() === today).length,
    totalActivities: activities.length,
    anchoredRecords: blockchain.length,
    unanchoredRecords: fabric.totalUnanchored,
    fabricOnline: fabric.online,
  };
}

/* ── Helpers tampilan ─────────────────────────────────────────────── */

export const SEVERITY_META: Record<AnomalySeverity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Kritis', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  warning: { label: 'Peringatan', color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
  info: { label: 'Info', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
};

export const MODULE_META: Record<AuditModule, { label: string; color: string }> = {
  finance: { label: 'Pembiayaan', color: '#2563eb' },
  stock: { label: 'Stok', color: '#16a34a' },
  members: { label: 'Anggota', color: '#7c3aed' },
  procurement: { label: 'Pengadaan', color: '#0e7490' },
  blockchain: { label: 'Blockchain', color: '#3a7a3a' },
};

export const CHAINCODE_META: Record<FabricChaincode, { label: string; color: string }> = {
  'stock-trace': { label: 'stock-trace', color: '#16a34a' },
  'credit-history': { label: 'credit-history', color: '#2563eb' },
  procurement: { label: 'procurement', color: '#0e7490' },
};

/* ── Skor Kepercayaan (Trust Score) ───────────────────────────────── */

/**
 * Sinyal mentah yang diturunkan dari rekam jejak on-chain Fabric.
 * Inilah dasar skor kepercayaan yang membuat portofolio bisa dipercaya
 * lembaga pembiayaan tanpa harus percaya "kata pengurus saja".
 */
export interface TrustSignals {
  /** Rasio pelunasan tepat waktu (0–1). */
  repaymentRate: number;
  /** Cakupan transaksi yang ter-anchor di Fabric (0–1). */
  anchoringCoverage: number;
  /** Rasio kredit macet / NPL (0–1, makin kecil makin baik). */
  nplRate: number;
  /** Rasio transaksi yang diverifikasi ≥ 2 peer koperasi (0–1). */
  crossVerifiedRatio: number;
  /** Rasio anomali yang sudah ditangani dalam 90 hari (0–1). */
  anomalyResolution: number;
  /** Lama koperasi beroperasi (tahun). */
  yearsActive: number;
}

export type TrustTone = 'excellent' | 'good' | 'fair' | 'weak';

export interface TrustPillar {
  key: string;
  label: string;
  /** Skor pilar (0–1). */
  score: number;
  /** Bobot terhadap skor total (0–1). */
  weight: number;
  /** Nilai mentah dalam teks. */
  display: string;
  good: boolean;
}

export interface TrustScore {
  /** Skor akhir 0–100. */
  score: number;
  /** Peringkat huruf (AAA…B). */
  grade: string;
  /** Putusan kelayakan pembiayaan. */
  verdict: string;
  tone: TrustTone;
  pillars: TrustPillar[];
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Hitung skor kepercayaan tertimbang dari sinyal on-chain.
 * Pelunasan 30% · cakupan on-chain 25% · NPL 20% · verifikasi lintas 10% ·
 * penanganan anomali 15%.
 */
export function computeTrustScore(s: TrustSignals): TrustScore {
  const nplScore = clamp01(1 - s.nplRate / 0.05); // NPL 5% = batas BI

  const pillars: TrustPillar[] = [
    { key: 'repayment', label: 'Pelunasan tepat waktu', score: clamp01(s.repaymentRate), weight: 0.3, display: `${(s.repaymentRate * 100).toFixed(1)}%`, good: s.repaymentRate >= 0.85 },
    { key: 'anchoring', label: 'Cakupan bukti on-chain', score: clamp01(s.anchoringCoverage), weight: 0.25, display: `${(s.anchoringCoverage * 100).toFixed(0)}%`, good: s.anchoringCoverage >= 0.8 },
    { key: 'npl', label: 'Kualitas kredit (NPL)', score: nplScore, weight: 0.2, display: `${(s.nplRate * 100).toFixed(1)}%`, good: s.nplRate <= 0.05 },
    { key: 'crossverified', label: 'Verifikasi lintas koperasi', score: clamp01(s.crossVerifiedRatio), weight: 0.1, display: `${(s.crossVerifiedRatio * 100).toFixed(0)}%`, good: s.crossVerifiedRatio >= 0.2 },
    { key: 'anomaly', label: 'Penanganan anomali', score: clamp01(s.anomalyResolution), weight: 0.15, display: `${(s.anomalyResolution * 100).toFixed(0)}%`, good: s.anomalyResolution >= 0.7 },
  ];

  const raw = pillars.reduce((sum, p) => sum + p.score * p.weight, 0);
  const score = Math.round(raw * 100);
  const tier = gradeFor(score);
  return { score, ...tier, pillars };
}

function gradeFor(score: number): { grade: string; verdict: string; tone: TrustTone } {
  if (score >= 90) return { grade: 'AAA', verdict: 'Sangat layak dibiayai', tone: 'excellent' };
  if (score >= 80) return { grade: 'AA', verdict: 'Layak dibiayai', tone: 'excellent' };
  if (score >= 72) return { grade: 'A', verdict: 'Layak dengan pemantauan', tone: 'good' };
  if (score >= 64) return { grade: 'BBB', verdict: 'Cukup layak', tone: 'good' };
  if (score >= 55) return { grade: 'BB', verdict: 'Perlu perhatian', tone: 'fair' };
  return { grade: 'B', verdict: 'Berisiko tinggi', tone: 'weak' };
}

export const TONE_COLOR: Record<TrustTone, string> = {
  excellent: '#16a34a',
  good: '#3a7a3a',
  fair: '#d97706',
  weak: '#dc2626',
};

/** Rangkaian angka untuk sparkline (tren). */
export interface TrendSeries {
  label: string;
  points: number[];
}
