/**
 * Registry koperasi yang dikenal dalam jejaring Arta.
 *
 * Lima koperasi nyata sesuai data lapangan. "Melati Jaya" adalah koperasi
 * kita (sektor sayuran & cold storage). Setiap koperasi punya MSP ID untuk
 * Hyperledger Fabric agar setiap transaksi pengadaan bersama bisa dicatat
 * dan diverifikasi lintas organisasi.
 *
 * `onSystem: false` menandai koperasi yang belum punya akun/rekening
 * terhubung ke sistem (mis. Harapan Baru — lokasi jauh, sinyal lemah).
 * Mereka tetap bisa ikut pengadaan bersama, tapi konfirmasi & pembayaran
 * dicatat manual oleh inisiator.
 */

export interface Cooperative {
  id: string;
  /** MSP ID di jaringan Hyperledger Fabric. */
  mspId: string;
  name: string;
  /** Fokus usaha (dari data lapangan). */
  focus: string;
  location: string;
  /** Warna aksen untuk visual jejaring. */
  accent: string;
  /** true → koperasi kita (Melati Jaya). */
  isUs: boolean;
  /** false → belum terhubung sistem; konfirmasi/pembayaran manual. */
  onSystem: boolean;
  /** Catatan lapangan singkat. */
  note: string;
}

/** UUID tenant Melati Jaya (selaras dengan tenant demo lain). */
export const MELATI_JAYA_ID = '11111111-1111-1111-1111-111111111111';

export const COOPERATIVES: Cooperative[] = [
  {
    id: MELATI_JAYA_ID,
    mspId: 'MelatiJayaMSP',
    name: 'Koperasi Melati Jaya',
    focus: 'Sayuran & cold storage',
    location: 'Lembang, Bandung Barat',
    accent: '#3a7a3a',
    isUs: true,
    onSystem: true,
    note: 'Koperasi kita, pusat jejaring pengadaan bersama.',
  },
  {
    id: 'PadiwangiMSP',
    mspId: 'PadiwangiMSP',
    name: 'Koperasi Padiwangi',
    focus: 'Simpan pinjam + beras',
    location: 'Ciwidey, Bandung',
    accent: '#2563eb',
    isUs: false,
    onSystem: true,
    note: 'Data pengurus masih di Excel & manual, belum terstruktur.',
  },
  {
    id: 'SumberMakmurMSP',
    mspId: 'SumberMakmurMSP',
    name: 'Koperasi Sumber Makmur',
    focus: 'Pupuk & toko gerai',
    location: 'Pangalengan, Bandung',
    accent: '#d97706',
    isUs: false,
    onSystem: true,
    note: 'Punya relasi kuat dengan supplier pupuk, sering memimpin pengadaan bersama.',
  },
  {
    id: 'TirtaBersamaMSP',
    mspId: 'TirtaBersamaMSP',
    name: 'Koperasi Tirta Bersama',
    focus: 'Air bersih & simpan pinjam',
    location: 'Cimenyan, Bandung',
    accent: '#0891b2',
    isUs: false,
    onSystem: true,
    note: 'Pencatatan kurang lengkap & sebagian data tidak akurat.',
  },
  {
    id: 'HarapanBaruMSP',
    mspId: 'HarapanBaruMSP',
    name: 'Koperasi Harapan Baru',
    focus: 'Ternak & pakan',
    location: 'Kertasari, Bandung (terpencil)',
    accent: '#7c3aed',
    isUs: false,
    onSystem: false,
    note: 'Lokasi paling terpencil dengan sinyal lemah. Konfirmasi dan pembayaran dilakukan manual.',
  },
];

export const OUR_COOP: Cooperative = COOPERATIVES[0]!;

const BY_ID = new Map(COOPERATIVES.map((c) => [c.id, c]));
const BY_MSP = new Map(COOPERATIVES.map((c) => [c.mspId, c]));

export function getCooperative(idOrMsp: string): Cooperative | undefined {
  return BY_ID.get(idOrMsp) ?? BY_MSP.get(idOrMsp);
}

export function cooperativeName(idOrMsp: string): string {
  return getCooperative(idOrMsp)?.name ?? idOrMsp;
}

/** Koperasi lain (selain kita) yang bisa diundang ke pengadaan bersama. */
export const PARTNER_COOPERATIVES: Cooperative[] = COOPERATIVES.filter((c) => !c.isUs);
