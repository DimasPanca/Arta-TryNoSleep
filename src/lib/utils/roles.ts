import type { TenantRole } from '@/types/tenant';

/** Label ramah untuk setiap role koperasi. */
export const ROLE_LABELS: Record<TenantRole, string> = {
  ketua: 'Ketua Koperasi',
  wakil_ketua: 'Wakil Ketua',
  bendahara: 'Bendahara',
  operator: 'Operator',
  kasir: 'Kasir',
  anggota: 'Anggota',
  mitra: 'Mitra Pembiayaan',
  dinas: 'Dinas / Pemerintah',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as TenantRole] ?? role;
}
