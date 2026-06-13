/**
 * Data contoh untuk halaman Audit & Portofolio — Koperasi Melati Jaya.
 * Dipakai mode pratinjau sebelum data nyata di-wire dari Supabase & Fabric.
 */

import type {
  ActivityLog,
  AnomalyRecord,
  BlockchainRecord,
  ComplianceReport,
  CoopPortfolio,
  FabricIntegrity,
  TrustSignals,
} from '@/lib/audit/audit-overview';

function daysAgo(n: number, hourOffset = 0): string {
  return new Date(Date.now() - n * 864e5 + hourOffset * 36e5).toISOString();
}

/* ── Anomali ──────────────────────────────────────────────────────── */

export const SAMPLE_ANOMALIES: AnomalyRecord[] = [
  {
    id: 'an-1',
    severity: 'critical',
    module: 'finance',
    title: 'Pinjaman disetujui oleh pengaju sendiri',
    description: 'Lestari Handayani (bendahara) menyetujui pengajuan pinjaman FL-019 milik akun yang sama. Tidak ada validator kedua.',
    actor: 'Lestari Handayani',
    entityRef: 'FL-019',
    detectedAt: daysAgo(0, -2),
    resolved: false,
    requiresInvestigation: true,
  },
  {
    id: 'an-2',
    severity: 'warning',
    module: 'stock',
    title: 'Stok Benih Tomat turun 65% tanpa transaksi',
    description: '120 kg berkurang menjadi 42 kg dalam 4 jam tanpa ada pencatatan penjualan atau penyesuaian.',
    actor: 'Rina Marlina',
    entityRef: 'STOCK-007',
    detectedAt: daysAgo(1),
    resolved: false,
    requiresInvestigation: false,
  },
  {
    id: 'an-3',
    severity: 'warning',
    module: 'members',
    title: 'Perubahan peran di luar jam operasional',
    description: 'Peran Joko Susilo diubah dari anggota → kasir pukul 02:14 WIB. Aktivitas di luar jam kerja normal.',
    actor: 'Andi Nugroho',
    entityRef: 'Joko Susilo',
    detectedAt: daysAgo(3),
    resolved: true,
    requiresInvestigation: false,
  },
  {
    id: 'an-4',
    severity: 'warning',
    module: 'procurement',
    title: 'Pengadaan ter-anchor tapi alokasi tidak cocok',
    description: 'txId a3f9c2e1 mencatat total 205 sak Pupuk Urea, namun jumlah alokasi per koperasi hanya 190 sak (selisih 15 sak).',
    entityRef: 'JP-UREA-001',
    detectedAt: daysAgo(2),
    resolved: false,
    requiresInvestigation: true,
  },
  {
    id: 'an-5',
    severity: 'info',
    module: 'blockchain',
    title: 'Fabric tidak terjangkau selama 18 menit',
    description: 'Node Hyperledger tidak merespons 18:32–18:50 WIB. Dua transaksi tertunda, sudah di-retry dan sukses.',
    detectedAt: daysAgo(4),
    resolved: true,
    requiresInvestigation: false,
  },
  {
    id: 'an-6',
    severity: 'info',
    module: 'finance',
    title: 'Pembayaran cicilan duplikat terdeteksi',
    description: 'FL-011 menerima dua pembayaran dalam interval 4 menit. Satu sudah di-void otomatis oleh sistem.',
    actor: 'Hadi Purnomo',
    entityRef: 'FL-011',
    detectedAt: daysAgo(5),
    resolved: true,
    requiresInvestigation: false,
  },
];

/* ── Log Aktivitas ────────────────────────────────────────────────── */

export const SAMPLE_ACTIVITIES: ActivityLog[] = [
  {
    id: 'act-1',
    module: 'finance',
    actor: 'Lestari Handayani',
    actorRole: 'Bendahara',
    action: 'approve_loan',
    description: 'Menyetujui pengajuan pinjaman FL-023 senilai Rp 5.000.000 atas nama Slamet Riyadi',
    entityRef: 'FL-023',
    amount: 5000000,
    txId: 'b9c4e2a7f1d308ab',
    timestamp: daysAgo(0, -1),
  },
  {
    id: 'act-2',
    module: 'procurement',
    actor: 'Andi Nugroho',
    actorRole: 'Operator',
    action: 'anchor_procurement',
    description: 'Pengadaan Pupuk Urea (205 sak) dicatat ke Hyperledger Fabric',
    entityRef: 'JP-UREA-001',
    txId: 'a3f9c2e1b7d40891',
    timestamp: daysAgo(0, -3),
  },
  {
    id: 'act-3',
    module: 'members',
    actor: 'Sutrisno Wibowo',
    actorRole: 'Ketua',
    action: 'approve_member',
    description: 'Menyetujui pendaftaran mandiri Yanto Saputra sebagai anggota',
    entityRef: 'Yanto Saputra',
    timestamp: daysAgo(1),
  },
  {
    id: 'act-4',
    module: 'stock',
    actor: 'Rina Marlina',
    actorRole: 'Kasir',
    action: 'update_stock',
    description: 'Memperbarui stok Benih Tomat: 150 kg → 80 kg (penjualan 70 kg)',
    entityRef: 'STOCK-007',
    amount: 70,
    txId: 'c1d8b6a0f3e20934',
    timestamp: daysAgo(1, -2),
  },
  {
    id: 'act-5',
    module: 'members',
    actor: 'Wahyuni Pratiwi',
    actorRole: 'Wakil Ketua',
    action: 'invite_member',
    description: 'Mengirim undangan kasir ke +62 812-7777-2211',
    timestamp: daysAgo(2),
  },
  {
    id: 'act-6',
    module: 'finance',
    actor: 'BPR Arta Sembada',
    actorRole: 'Mitra',
    action: 'disburse_loan',
    description: 'Mencairkan pinjaman FL-021 senilai Rp 12.000.000 kepada Sri Wahyuningsih',
    entityRef: 'FL-021',
    amount: 12000000,
    txId: 'e7a2f1c9d0b50123',
    timestamp: daysAgo(3),
  },
  {
    id: 'act-7',
    module: 'stock',
    actor: 'Joko Susilo',
    actorRole: 'Kasir',
    action: 'scan_batch',
    description: 'Pindai masuk batch Pupuk NPK 50 sak dari PT Petrokimia',
    entityRef: 'BATCH-NPK-031',
    txId: 'f2b1d4e8c9a60752',
    timestamp: daysAgo(3, -5),
  },
  {
    id: 'act-8',
    module: 'finance',
    actor: 'Dinas Pertanian Sleman',
    actorRole: 'Dinas',
    action: 'validate_subsidy',
    description: 'Memvalidasi 3 pengajuan pinjaman subsidi pupuk periode Oktober',
    timestamp: daysAgo(5),
  },
  {
    id: 'act-9',
    module: 'procurement',
    actor: 'Andi Nugroho',
    actorRole: 'Operator',
    action: 'create_procurement',
    description: 'Membuat pengadaan bersama Benih Sayuran (target 120 kg, 3 koperasi)',
    entityRef: 'JP-BENIH-002',
    timestamp: daysAgo(7),
  },
  {
    id: 'act-10',
    module: 'system',
    actor: 'Sistem',
    actorRole: 'Otomatis',
    action: 'fabric_retry',
    description: 'Retry 2 transaksi tertunda setelah Fabric kembali online',
    timestamp: daysAgo(4),
  },
];

/* ── Rekam Jejak Blockchain ───────────────────────────────────────── */

export const SAMPLE_BLOCKCHAIN: BlockchainRecord[] = [
  {
    id: 'bc-1',
    txId: 'b9c4e2a7f1d308ab4c2e91d07f3b56a2',
    channel: 'arta-channel',
    chaincode: 'credit-history',
    fnName: 'RecordLoanDecision',
    module: 'finance',
    summary: 'Persetujuan pinjaman FL-023 senilai Rp 5 jt atas nama Slamet Riyadi',
    initiator: 'Lestari Handayani',
    timestamp: daysAgo(0, -1),
    crossVerified: false,
  },
  {
    id: 'bc-2',
    txId: 'a3f9c2e1b7d408914d8f20c1b6e7a309',
    channel: 'arta-channel',
    chaincode: 'procurement',
    fnName: 'RecordProcurementEvent',
    module: 'procurement',
    summary: 'Pengadaan Pupuk Urea 205 sak oleh 4 koperasi, efisiensi biaya Rp 6,5 jt',
    initiator: 'Andi Nugroho',
    timestamp: daysAgo(0, -3),
    crossVerified: true,
  },
  {
    id: 'bc-3',
    txId: 'c1d8b6a0f3e209345f1a83d2e7b09c41',
    channel: 'arta-channel',
    chaincode: 'stock-trace',
    fnName: 'RecordBatch',
    module: 'stock',
    summary: 'Batch Benih Tomat: penjualan 70 kg, sisa stok turun dari 150 ke 80 kg',
    initiator: 'Rina Marlina',
    timestamp: daysAgo(1, -2),
    crossVerified: false,
  },
  {
    id: 'bc-4',
    txId: 'e7a2f1c9d0b501230b9f47d2c8a3e610',
    channel: 'arta-channel',
    chaincode: 'credit-history',
    fnName: 'RecordDisbursement',
    module: 'finance',
    summary: 'Pencairan FL-021 senilai Rp 12 jt kepada Sri Wahyuningsih oleh BPR Arta Sembada',
    initiator: 'BPR Arta Sembada',
    timestamp: daysAgo(3),
    crossVerified: true,
  },
  {
    id: 'bc-5',
    txId: 'f2b1d4e8c9a607528e3d91a0b6f24c17',
    channel: 'arta-channel',
    chaincode: 'stock-trace',
    fnName: 'RecordBatch',
    module: 'stock',
    summary: 'Penerimaan Pupuk NPK 50 sak dari PT Petrokimia',
    initiator: 'Joko Susilo',
    timestamp: daysAgo(3, -5),
    crossVerified: false,
  },
];

/* ── Sinyal Skor Kepercayaan ──────────────────────────────────────── */

export const SAMPLE_TRUST_SIGNALS: TrustSignals = {
  repaymentRate: 0.943,
  anchoringCoverage: 0.96,
  nplRate: 0.011,
  crossVerifiedRatio: 0.34,
  anomalyResolution: 0.86,
  yearsActive: 5,
};

/* ── Tren (sparkline) ─────────────────────────────────────────────── */

/** Pertumbuhan transaksi ter-anchor per bulan (6 bulan terakhir). */
export const TREND_ANCHORED: number[] = [12, 18, 23, 29, 38, 47];
/** Pencairan pinjaman per bulan (Rp juta, 6 bulan). */
export const TREND_DISBURSED: number[] = [34, 41, 38, 52, 67, 87];
/** Aktivitas harian (14 hari terakhir). */
export const TREND_ACTIVITY: number[] = [3, 5, 2, 6, 4, 7, 5, 8, 6, 4, 9, 7, 6, 10];
/** Skor kepercayaan historis (6 bulan). */
export const TREND_TRUST: number[] = [71, 74, 76, 79, 82, 84];

/* ── Integritas Fabric ────────────────────────────────────────────── */

export const SAMPLE_FABRIC_INTEGRITY: FabricIntegrity = {
  online: true,
  configuredUrl: 'http://172.16.2.205:4000',
  checkedAt: new Date().toISOString(),
  totalAnchored: 47,
  totalUnanchored: 3,
  lastAnchoredAt: daysAgo(0, -1),
  connectedPeers: ['peer0.MelatiJayaMSP', 'peer0.PadiwangiMSP', 'peer0.SumberMakmurMSP'],
};

/* ── Laporan Kepatuhan ────────────────────────────────────────────── */

export const SAMPLE_REPORTS: ComplianceReport[] = [
  {
    id: 'rep-1',
    module: 'finance',
    period: 'monthly',
    periodLabel: 'November 2025',
    generatedAt: daysAgo(5),
    summary: '14 pengajuan pinjaman diproses. Tingkat persetujuan 78.5%. Tidak ada kredit macet baru.',
    metrics: [
      { label: 'Total pinjaman', value: 'Rp 87.500.000', trend: 'up', good: true },
      { label: 'Tingkat persetujuan', value: '78,5%', trend: 'up', good: true },
      { label: 'Kredit macet', value: '1 akun', trend: 'flat', good: false },
      { label: 'Rata-rata tenor', value: '6,2 bulan', trend: 'flat' },
    ],
    anchorTxId: 'a0b1c2d3e4f50617',
  },
  {
    id: 'rep-2',
    module: 'procurement',
    period: 'monthly',
    periodLabel: 'November 2025',
    generatedAt: daysAgo(5),
    summary: '4 pengadaan bersama diselesaikan. Total penghematan Rp 21,4 jt. 75% ter-anchor di Fabric.',
    metrics: [
      { label: 'Total pengadaan', value: '4 transaksi', trend: 'up', good: true },
      { label: 'Total penghematan', value: 'Rp 21.400.000', trend: 'up', good: true },
      { label: 'Ter-anchor on-chain', value: '3 dari 4 (75%)', trend: 'flat' },
      { label: 'Koperasi terlibat', value: '5 koperasi', trend: 'flat' },
    ],
    anchorTxId: 'b1c2d3e4f5061728',
  },
  {
    id: 'rep-3',
    module: 'members',
    period: 'monthly',
    periodLabel: 'November 2025',
    generatedAt: daysAgo(5),
    summary: '3 anggota baru bergabung. 1 peran diubah. Tidak ada anggota keluar.',
    metrics: [
      { label: 'Total anggota aktif', value: '12 orang', trend: 'up', good: true },
      { label: 'Bergabung bulan ini', value: '3 orang', trend: 'up', good: true },
      { label: 'Perubahan peran', value: '1 kali', trend: 'flat' },
      { label: 'Keluar', value: '0', trend: 'flat', good: true },
    ],
  },
];

/* ── Portofolio Koperasi ──────────────────────────────────────────── */

export const SAMPLE_PORTFOLIO: CoopPortfolio = {
  coopName: 'Koperasi Melati Jaya',
  coopId: '11111111-1111-1111-1111-111111111111',
  sector: 'Sayuran & Cold Storage',
  location: 'Sleman, Yogyakarta',
  establishedYear: 2019,
  scope: 'full',
  generatedAt: new Date().toISOString(),
  portfolioHash: 'sha256:4f2a9c1e8b7d3056f1a83d2e7b09c41d',
  sections: [
    {
      id: 'port-finance',
      title: 'Rekam Jejak Pembiayaan',
      icon: 'finance',
      sectionAnchorTxId: 'a0b1c2d3e4f50617',
      lastUpdated: daysAgo(5),
      metrics: [
        { label: 'Total pinjaman dicairkan', value: 'Rp 312.000.000', sub: 'sejak 2023', trend: 'up', good: true, anchorTxId: 'a0b1c2d3e4f50617' },
        { label: 'Tingkat pelunasan tepat waktu', value: '91,4%', sub: '64 dari 70 pinjaman', trend: 'up', good: true },
        { label: 'Rata-rata tenor', value: '5,8 bulan', sub: 'sesuai rencana' },
        { label: 'Kredit macet (NPL)', value: '1,2%', sub: 'di bawah batas BI 5%', good: true },
        { label: 'Mitra pembiayaan aktif', value: '1 lembaga', sub: 'BPR Arta Sembada' },
        { label: 'Pinjaman terverifikasi on-chain', value: '47 dari 50', sub: '94% coverage', trend: 'up', good: true },
      ],
    },
    {
      id: 'port-procurement',
      title: 'Pengadaan Bersama',
      icon: 'procurement',
      sectionAnchorTxId: 'b1c2d3e4f5061728',
      lastUpdated: daysAgo(5),
      metrics: [
        { label: 'Total pengadaan bersama', value: '18 transaksi', sub: 'lintas 5 koperasi', trend: 'up', good: true },
        { label: 'Total penghematan kumulatif', value: 'Rp 74.200.000', sub: 'dibanding harga eceran', trend: 'up', good: true, anchorTxId: 'b1c2d3e4f5061728' },
        { label: 'Rata-rata penghematan per deal', value: '22,4%', trend: 'up', good: true },
        { label: 'Koperasi mitra aktif', value: '4 dari 5', sub: 'Harapan Baru konfirmasi manual' },
        { label: 'Deal ter-anchor on-chain', value: '14 dari 18 (78%)', trend: 'up' },
      ],
    },
    {
      id: 'port-stock',
      title: 'Integritas Stok & Rantai Pasok',
      icon: 'stock',
      lastUpdated: daysAgo(2),
      metrics: [
        { label: 'Batch stok terlacak di Fabric', value: '203 batch', trend: 'up', good: true },
        { label: 'Akurasi stok vs fisik', value: '97,3%', sub: 'audit 3 bulanan terakhir', good: true },
        { label: 'Komoditas aktif dilacak', value: '11 jenis', sub: 'sayuran, benih, pupuk' },
        { label: 'Rata-rata waktu rotasi', value: '8,4 hari', sub: 'cold storage Sleman' },
      ],
    },
    {
      id: 'port-members',
      title: 'Keanggotaan & Tata Kelola',
      icon: 'members',
      lastUpdated: daysAgo(5),
      metrics: [
        { label: 'Total anggota aktif', value: '12 orang', trend: 'up', good: true },
        { label: 'Petani anggota', value: '4 orang', sub: 'penerima manfaat langsung' },
        { label: 'Berdiri sejak', value: '2019', sub: '5 tahun operasional' },
        { label: 'Undangan bergabung sukses', value: '8 dari 10 (80%)', trend: 'up', good: true },
      ],
    },
    {
      id: 'port-integrity',
      title: 'Integritas & Transparansi Blockchain',
      icon: 'integrity',
      lastUpdated: new Date().toISOString(),
      metrics: [
        { label: 'Total transaksi on-chain', value: '47 records', trend: 'up', good: true, anchorTxId: 'f2b1d4e8c9a60752' },
        { label: 'Cross-verified antar koperasi', value: '12 transaksi', sub: 'diverifikasi ≥ 2 peer', good: true },
        { label: 'Channel Fabric', value: 'arta-channel', sub: 'multi-org permissioned' },
        { label: 'Peer koperasi terhubung', value: '3 peer aktif', good: true },
        { label: 'Portfolio hash', value: 'sha256:4f2a9c1e…', sub: 'dapat diverifikasi di ledger' },
      ],
    },
  ],
};
