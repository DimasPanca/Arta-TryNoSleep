export type TenantRole = 'admin' | 'pengurus' | 'kasir' | 'anggota';
export type KoperasiType = 'sayuran' | 'simpan_pinjam' | 'pupuk' | 'umum';

export interface Tenant {
  id: string;
  name: string;
  type: KoperasiType;
  description?: string;
}

export interface Member {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
}
