import type { TenantRole } from '@/types/tenant';

export type Permission =
  | 'stock:read'
  | 'stock:write'
  | 'stock:delete'
  | 'scan:execute'
  | 'finance:read'
  | 'finance:write'
  | 'finance:approve'
  | 'finance:disburse'
  | 'finance:apply'
  | 'finance:cross_tenant_read'
  | 'procurement:read'
  | 'procurement:write'
  | 'audit:read'
  | 'audit:investigate'
  | 'members:manage'
  | 'members:invite'
  | 'members:approve'
  | 'tenant:manage';

const ALL_PERMISSIONS: Permission[] = [
  'stock:read',
  'stock:write',
  'stock:delete',
  'scan:execute',
  'finance:read',
  'finance:write',
  'finance:approve',
  'finance:disburse',
  'finance:apply',
  'finance:cross_tenant_read',
  'procurement:read',
  'procurement:write',
  'audit:read',
  'audit:investigate',
  'members:manage',
  'members:invite',
  'members:approve',
  'tenant:manage',
];

export const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  // Pimpinan — akses penuh
  ketua: ALL_PERMISSIONS,
  wakil_ketua: ALL_PERMISSIONS,

  // Keuangan — approve pinjaman (langkah internal)
  bendahara: [
    'finance:read',
    'finance:write',
    'finance:approve',
    'finance:cross_tenant_read',
    'procurement:read',
    'audit:read',
  ],

  // Operasional & administrasi anggota
  operator: [
    'stock:read',
    'stock:write',
    'stock:delete',
    'scan:execute',
    'procurement:read',
    'procurement:write',
    'members:manage',
    'members:invite',
    'members:approve',
    'audit:read',
  ],

  // Input data harian
  kasir: [
    'stock:read',
    'stock:write',
    'scan:execute',
    'procurement:read',
  ],

  // Petani anggota
  anggota: [
    'stock:read',
    'finance:read',
    'finance:apply',
    'procurement:read',
  ],

  // Lembaga pembiayaan eksternal
  mitra: [
    'finance:read',
    'finance:approve',
    'finance:disburse',
    'finance:cross_tenant_read',
    'audit:read',
  ],

  // Pemerintah / Dinas Pertanian
  dinas: [
    'finance:read',
    'finance:approve',
    'finance:cross_tenant_read',
    'procurement:read',
    'audit:read',
    'audit:investigate',
  ],
};

export function hasPermission(role: TenantRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
