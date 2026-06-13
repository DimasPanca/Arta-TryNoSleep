/**
 * Mesin prediksi masa simpan (shelf-life) sayur & buah.
 *
 * Memperkirakan berapa lama sebuah batch masih layak jual berdasarkan data
 * NYATA hasil scan: komoditas, grade, skor mutu, tingkat kematangan, kondisi
 * permukaan, dan jenis penyimpanan (suhu ruang / pendingin). Dari situ
 * dihitung tanggal busuk perkiraan, sisa hari, tingkat urgensi, serta
 * rekomendasi suhu simpan & prioritas penjualan.
 *
 * Semua fungsi murni (tanpa efek samping) agar mudah dipakai di server
 * (stock page, dashboard) maupun saat menyimpan batch baru.
 */

import type { QualityGrade, StorageType } from '@/types/stock';

export type ColorRipeness = 'unripe' | 'semi_ripe' | 'ripe' | 'overripe';
export type SurfaceCondition = 'clean' | 'minor_blemish' | 'moderate_damage' | 'severe_damage';

/** Urutan urgensi dari paling aman ke paling mendesak. */
export type ShelfLifeUrgency = 'fresh' | 'monitor' | 'urgent' | 'critical' | 'expired';

interface CommodityProfile {
  /** Kategori untuk pengelompokan. */
  category: string;
  /** Perkiraan masa simpan dasar (hari) untuk grade A pada tiap penyimpanan. */
  baseDays: { ambient: number; cold: number };
  /** Apakah komoditas ini sebaiknya disimpan dingin. */
  prefersCold: boolean;
  /** Rekomendasi suhu simpan (teks ramah). */
  storage: { temp: string; humidity: string; note: string };
}

/** Profil per kategori komoditas. */
const CATEGORY_PROFILES: Record<string, CommodityProfile> = {
  daun: {
    category: 'Sayuran daun',
    baseDays: { ambient: 2, cold: 8 },
    prefersCold: true,
    storage: { temp: '0–4 °C', humidity: '95%', note: 'Simpan dingin, jaga kelembapan tinggi agar tidak layu.' },
  },
  buah_lunak: {
    category: 'Buah lunak',
    baseDays: { ambient: 4, cold: 10 },
    prefersCold: true,
    storage: { temp: '7–10 °C', humidity: '85–90%', note: 'Dinginkan setelah matang; suhu terlalu rendah memicu chilling injury.' },
  },
  buah_keras: {
    category: 'Buah berkulit tebal',
    baseDays: { ambient: 7, cold: 21 },
    prefersCold: true,
    storage: { temp: '5–8 °C', humidity: '85–90%', note: 'Tahan lebih lama; pendinginan memperpanjang kesegaran.' },
  },
  umbi: {
    category: 'Umbi & akar',
    baseDays: { ambient: 30, cold: 90 },
    prefersCold: false,
    storage: { temp: '10–15 °C', humidity: '85–90%', note: 'Simpan sejuk, kering, dan gelap; hindari lembap berlebih.' },
  },
  bumbu: {
    category: 'Bawang & bumbu',
    baseDays: { ambient: 40, cold: 120 },
    prefersCold: false,
    storage: { temp: '0–5 °C kering', humidity: '65–70%', note: 'Simpan kering dengan sirkulasi udara; kelembapan tinggi memicu busuk.' },
  },
  buah_sayur: {
    category: 'Sayuran buah',
    baseDays: { ambient: 4, cold: 12 },
    prefersCold: true,
    storage: { temp: '8–12 °C', humidity: '90–95%', note: 'Dinginkan ringan; hindari di bawah 7 °C untuk timun & terong.' },
  },
  jamur: {
    category: 'Jamur',
    baseDays: { ambient: 1, cold: 5 },
    prefersCold: true,
    storage: { temp: '0–4 °C', humidity: '90%', note: 'Sangat mudah rusak — segera dinginkan, jangan dicuci sebelum simpan.' },
  },
  default: {
    category: 'Umum',
    baseDays: { ambient: 4, cold: 12 },
    prefersCold: true,
    storage: { temp: '8–12 °C', humidity: '85–90%', note: 'Simpan sejuk dan terhindar dari sinar matahari langsung.' },
  },
};

/** Pemetaan nama komoditas → kategori. Pencocokan tidak peka huruf besar/kecil. */
const COMMODITY_CATEGORY: Record<string, string> = {
  kangkung: 'daun', selada: 'daun', brokoli: 'daun', kol: 'daun', bayam: 'daun', sawi: 'daun',
  tomat: 'buah_sayur', terong: 'buah_sayur', timun: 'buah_sayur', pare: 'buah_sayur',
  'labu siam': 'buah_sayur', 'kacang panjang': 'buah_sayur', buncis: 'buah_sayur', jagung: 'buah_sayur',
  pisang: 'buah_lunak', pepaya: 'buah_lunak', mangga: 'buah_lunak', semangka: 'buah_lunak', salak: 'buah_lunak',
  jeruk: 'buah_keras', nanas: 'buah_keras',
  kentang: 'umbi', 'ubi jalar': 'umbi',
  'bawang merah': 'bumbu', 'bawang putih': 'bumbu',
  'jamur tiram': 'jamur', jamur: 'jamur',
};

export function getCommodityProfile(commodity: string): CommodityProfile {
  const key = commodity.trim().toLowerCase();
  const category = COMMODITY_CATEGORY[key];
  if (category && CATEGORY_PROFILES[category]) return CATEGORY_PROFILES[category];
  return CATEGORY_PROFILES.default!;
}

/** Faktor pengali masa simpan berdasarkan grade mutu. */
const GRADE_FACTOR: Record<QualityGrade, number> = { A: 1, B: 0.85, C: 0.6, D: 0.35, F: 0.1 };

const RIPENESS_FACTOR: Record<ColorRipeness, number> = {
  unripe: 1.15, semi_ripe: 1, ripe: 0.8, overripe: 0.45,
};

const SURFACE_FACTOR: Record<SurfaceCondition, number> = {
  clean: 1, minor_blemish: 0.85, moderate_damage: 0.6, severe_damage: 0.35,
};

export interface ShelfLifeInput {
  commodity: string;
  grade: QualityGrade;
  qualityScore: number;
  storageType: StorageType;
  receivedAt: string;
  colorRipeness?: ColorRipeness | null;
  surfaceCondition?: SurfaceCondition | null;
  /** expires_at tersimpan (dipakai sebagai fallback bila data scan tak lengkap). */
  storedExpiresAt?: string | null;
  /** Waktu acuan "sekarang" (default Date.now()). */
  now?: number;
}

export interface ShelfLifeResult {
  /** Perkiraan total masa simpan sejak diterima (hari). */
  predictedShelfLifeDays: number;
  /** Tanggal busuk perkiraan (ISO). */
  spoilDate: string;
  /** Sisa hari sampai busuk (bisa negatif bila sudah lewat). */
  daysRemaining: number;
  /** Persentase masa simpan yang masih tersisa (0–100). */
  freshnessPct: number;
  urgency: ShelfLifeUrgency;
  /** Rekomendasi suhu & catatan penyimpanan. */
  storage: CommodityProfile['storage'];
  category: string;
  /** Saran pindah ke pendingin bila menguntungkan. */
  recommendColdStorage: boolean;
  /** Skor prioritas jual (semakin tinggi semakin mendesak). */
  priorityScore: number;
}

const DAY_MS = 86_400_000;

export function predictShelfLife(input: ShelfLifeInput): ShelfLifeResult {
  const profile = getCommodityProfile(input.commodity);
  const now = input.now ?? Date.now();
  const receivedMs = toMs(input.receivedAt, now);

  const base = profile.baseDays[input.storageType];
  const gradeFactor = GRADE_FACTOR[input.grade] ?? 0.5;
  const ripenessFactor = input.colorRipeness ? RIPENESS_FACTOR[input.colorRipeness] : 1;
  const surfaceFactor = input.surfaceCondition ? SURFACE_FACTOR[input.surfaceCondition] : 1;
  // Skor mutu memberi koreksi halus (0.5–1.0) di atas faktor grade.
  const scoreFactor = clamp(0.5 + (input.qualityScore / 100) * 0.5, 0.5, 1);

  let predictedDays = Math.round(base * gradeFactor * ripenessFactor * surfaceFactor * scoreFactor);
  predictedDays = Math.max(0, predictedDays);

  // Hitung tanggal busuk dari prediksi; bila ada expires_at tersimpan dan data
  // scan tidak lengkap, pakai yang lebih konservatif (lebih awal).
  let spoilMs = receivedMs + predictedDays * DAY_MS;
  if (input.storedExpiresAt) {
    const storedMs = toMs(input.storedExpiresAt, spoilMs);
    if (Number.isFinite(storedMs)) spoilMs = Math.min(spoilMs, storedMs);
  }

  const totalSpanMs = Math.max(DAY_MS, spoilMs - receivedMs);
  const elapsedMs = now - receivedMs;
  const daysRemaining = Math.ceil((spoilMs - now) / DAY_MS);
  const freshnessPct = clamp(Math.round(((totalSpanMs - elapsedMs) / totalSpanMs) * 100), 0, 100);
  const urgency = toUrgency(daysRemaining);

  return {
    predictedShelfLifeDays: predictedDays,
    spoilDate: new Date(spoilMs).toISOString(),
    daysRemaining,
    freshnessPct,
    urgency,
    storage: profile.storage,
    category: profile.category,
    recommendColdStorage: profile.prefersCold && input.storageType === 'ambient' && urgency !== 'expired',
    priorityScore: computePriority(daysRemaining, urgency),
  };
}

function toUrgency(daysRemaining: number): ShelfLifeUrgency {
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 1) return 'critical';
  if (daysRemaining <= 2) return 'urgent';
  if (daysRemaining <= 4) return 'monitor';
  return 'fresh';
}

/** Prioritas jual: makin sedikit sisa hari → makin tinggi. Expired diberi skor tinggi tapi di bawah kritis-aktif. */
function computePriority(daysRemaining: number, urgency: ShelfLifeUrgency): number {
  if (urgency === 'expired') return 90;
  return clamp(Math.round(100 - daysRemaining * 12), 0, 100);
}

export interface ShelfLifeUrgencyMeta {
  label: string;
  /** Anjuran tindakan singkat. */
  action: string;
  /** Variabel warna CSS yang konsisten dengan tema. */
  color: string;
  bg: string;
}

export const URGENCY_META: Record<ShelfLifeUrgency, ShelfLifeUrgencyMeta> = {
  fresh: {
    label: 'Aman',
    action: 'Masih segar, tidak perlu tindakan.',
    color: 'var(--color-grade-a)',
    bg: 'var(--color-brand-50)',
  },
  monitor: {
    label: 'Pantau',
    action: 'Pantau berkala; rencanakan penjualan dalam beberapa hari.',
    color: 'var(--color-grade-b)',
    bg: 'var(--color-brand-50)',
  },
  urgent: {
    label: 'Segera jual',
    action: 'Prioritaskan penjualan/olah dalam 1–2 hari.',
    color: 'var(--color-amber-400)',
    bg: 'var(--color-amber-100)',
  },
  critical: {
    label: 'Kritis',
    action: 'Jual atau olah hari ini sebelum mutu turun drastis.',
    color: 'var(--color-grade-d)',
    bg: 'var(--color-amber-100)',
  },
  expired: {
    label: 'Lewat masa',
    action: 'Sudah melewati perkiraan masa simpan — periksa & tarik dari stok.',
    color: 'var(--color-danger-400)',
    bg: 'var(--color-danger-100)',
  },
};

/** Urutan keparahan untuk perbandingan/sortir. */
export const URGENCY_SEVERITY: Record<ShelfLifeUrgency, number> = {
  fresh: 0, monitor: 1, urgent: 2, critical: 3, expired: 4,
};

/** Apakah urgensi ini perlu menimbulkan notifikasi ke operator/ketua. */
export function needsAttention(urgency: ShelfLifeUrgency): boolean {
  return URGENCY_SEVERITY[urgency] >= URGENCY_SEVERITY.urgent;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toMs(value: string, fallback: number): number {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : fallback;
}
