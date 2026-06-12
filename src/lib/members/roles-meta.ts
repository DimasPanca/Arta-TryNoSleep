/**
 * Metadata presentasi untuk 8 peran tenant Arta — label Indonesia, pengelompokan
 * tier, warna aksen, dan ringkasan wewenang. Murni & client-safe (hanya tipe).
 *
 * Sumber kebenaran izin tetap di `src/constants/roles.ts`; berkas ini hanya
 * menambah lapisan presentasi agar peran mudah dipahami secara visual.
 */

import type { TenantRole } from '@/types/tenant';

export type RoleTier = 'pimpinan' | 'pengelola' | 'anggota' | 'eksternal';

export interface RoleMeta {
  role: TenantRole;
  /** Label tampil (Bahasa Indonesia). */
  label: string;
  tier: RoleTier;
  /** Warna aksen untuk avatar & badge. */
  accent: string;
  /** Ringkasan satu kalimat wewenang utama. */
  summary: string;
  /** true → lembaga di luar koperasi (mitra/dinas). */
  external: boolean;
}

export interface TierMeta {
  tier: RoleTier;
  label: string;
  accent: string;
  description: string;
}

/** Urutan kanonik peran dari pucuk pimpinan hingga lembaga eksternal. */
export const ROLE_ORDER: TenantRole[] = [
  'ketua',
  'wakil_ketua',
  'bendahara',
  'operator',
  'kasir',
  'anggota',
  'mitra',
  'dinas',
];

export const ROLE_META: Record<TenantRole, RoleMeta> = {
  ketua: {
    role: 'ketua',
    label: 'Ketua',
    tier: 'pimpinan',
    accent: '#1e4a1e',
    summary: 'Akses penuh · kelola anggota & undang semua peran',
    external: false,
  },
  wakil_ketua: {
    role: 'wakil_ketua',
    label: 'Wakil Ketua',
    tier: 'pimpinan',
    accent: '#3a7a3a',
    summary: 'Akses penuh · wakil pimpinan, kelola & undang semua peran',
    external: false,
  },
  bendahara: {
    role: 'bendahara',
    label: 'Bendahara',
    tier: 'pengelola',
    accent: '#2563eb',
    summary: 'Setujui & catat pembiayaan koperasi',
    external: false,
  },
  operator: {
    role: 'operator',
    label: 'Operator',
    tier: 'pengelola',
    accent: '#7c3aed',
    summary: 'Operasional, stok & pengadaan · undang kasir/mitra/dinas',
    external: false,
  },
  kasir: {
    role: 'kasir',
    label: 'Kasir',
    tier: 'pengelola',
    accent: '#0e7490',
    summary: 'Input stok & transaksi harian',
    external: false,
  },
  anggota: {
    role: 'anggota',
    label: 'Anggota',
    tier: 'anggota',
    accent: '#5a9e5a',
    summary: 'Petani anggota · ajukan pembiayaan, lihat stok',
    external: false,
  },
  mitra: {
    role: 'mitra',
    label: 'Mitra',
    tier: 'eksternal',
    accent: '#d97706',
    summary: 'Lembaga pembiayaan · setujui & cairkan pinjaman',
    external: true,
  },
  dinas: {
    role: 'dinas',
    label: 'Dinas',
    tier: 'eksternal',
    accent: '#475569',
    summary: 'Pemerintah · validasi subsidi & pengawasan',
    external: true,
  },
};

export const TIER_META: Record<RoleTier, TierMeta> = {
  pimpinan: {
    tier: 'pimpinan',
    label: 'Pimpinan',
    accent: '#2d6a2d',
    description: 'Wewenang penuh atas koperasi & keanggotaan',
  },
  pengelola: {
    tier: 'pengelola',
    label: 'Pengelola',
    accent: '#2563eb',
    description: 'Keuangan, operasional, dan transaksi harian',
  },
  anggota: {
    tier: 'anggota',
    label: 'Anggota',
    accent: '#5a9e5a',
    description: 'Petani anggota koperasi',
  },
  eksternal: {
    tier: 'eksternal',
    label: 'Eksternal',
    accent: '#d97706',
    description: 'Mitra pembiayaan & lembaga pemerintah',
  },
};

export const TIER_ORDER: RoleTier[] = ['pimpinan', 'pengelola', 'anggota', 'eksternal'];

export function roleMeta(role: TenantRole): RoleMeta {
  return ROLE_META[role];
}

/** Daftar peran dalam sebuah tier, sesuai urutan kanonik. */
export function rolesInTier(tier: RoleTier): TenantRole[] {
  return ROLE_ORDER.filter((r) => ROLE_META[r].tier === tier);
}
