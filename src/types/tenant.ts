export type TenantRole =
  | 'ketua'
  | 'wakil_ketua'
  | 'bendahara'
  | 'operator'
  | 'kasir'
  | 'anggota'
  | 'mitra'
  | 'dinas';

export type MemberStatus = 'active' | 'pending';

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
  status: MemberStatus;
  phone?: string;
  fullName?: string;
}

export interface MemberInvite {
  id: string;
  token: string;
  tenantId: string;
  role: Exclude<TenantRole, 'anggota'>;
  createdBy: string;
  note?: string;
  expiresAt: string;
  usedAt?: string;
  usedBy?: string;
  createdAt: string;
}
