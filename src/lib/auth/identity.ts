import { createServerClient } from '@/lib/supabase/server';
import type { TenantRole } from '@/types/tenant';

export interface DashboardIdentity {
  role: TenantRole;
  name: string;
  tenantName: string;
  tenantId: string | null;
  /** true bila belum login (mode pratinjau sebelum Phone Auth aktif). */
  preview: boolean;
}

const PREVIEW_IDENTITY: DashboardIdentity = {
  role: 'ketua',
  name: 'Mode Pratinjau',
  tenantName: 'Koperasi Tani Makmur',
  tenantId: null,
  preview: true,
};

/**
 * Identitas untuk chrome dashboard. Memakai sesi login bila ada;
 * jika belum login, jatuh ke mode pratinjau agar desain tetap bisa
 * dilihat selama Phone Auth belum dikonfigurasi.
 */
export async function getDashboardIdentity(): Promise<DashboardIdentity> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return PREVIEW_IDENTITY;

  const { data } = await supabase
    .from('members')
    .select('role, full_name, tenant_id, tenants!inner(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) return PREVIEW_IDENTITY;

  const tenant = data.tenants as { name: string } | { name: string }[];
  const tenantName = Array.isArray(tenant) ? (tenant[0]?.name ?? 'Koperasi') : tenant.name;

  return {
    role: data.role as TenantRole,
    name: (data.full_name as string | null) ?? 'Pengguna',
    tenantName,
    tenantId: data.tenant_id as string,
    preview: false,
  };
}
