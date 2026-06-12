import type { TenantRole } from '@/types/tenant';

type Permission =
  | 'stock:read'
  | 'stock:write'
  | 'stock:delete'
  | 'scan:execute'
  | 'finance:read'
  | 'finance:write'
  | 'finance:approve'
  | 'finance:cross_tenant_read'
  | 'procurement:read'
  | 'procurement:write'
  | 'audit:read'
  | 'audit:investigate'
  | 'members:manage';

export const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  admin: [
    'stock:read',
    'stock:write',
    'stock:delete',
    'scan:execute',
    'finance:read',
    'finance:write',
    'finance:approve',
    'finance:cross_tenant_read',
    'procurement:read',
    'procurement:write',
    'audit:read',
    'audit:investigate',
    'members:manage',
  ],
  pengurus: [
    'stock:read',
    'stock:write',
    'scan:execute',
    'finance:read',
    'finance:write',
    'finance:approve',
    'finance:cross_tenant_read',
    'procurement:read',
    'procurement:write',
    'audit:read',
    'audit:investigate',
  ],
  kasir: [
    'stock:read',
    'stock:write',
    'scan:execute',
    'finance:read',
    'procurement:read',
  ],
  anggota: [
    'stock:read',
    'scan:execute',
    'finance:read',
    'procurement:read',
  ],
};

export function hasPermission(role: TenantRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
