import { createServerClient } from '@/lib/supabase/server';
import type { TenantRole } from '@/types/tenant';

export interface DashboardIdentity {
  role: TenantRole;
  name: string;
  tenantName: string;
  tenantId: string | null;
  /** true bila belum login sama sekali (sesi tidak ada). */
  preview: boolean;
  /** true bila sudah login tapi belum terdaftar di tabel members sebagai anggota aktif. */
  noMembership?: boolean;
}

/** Belum login — hanya untuk halaman publik yang memerlukan fallback UI. */
const PREVIEW_IDENTITY: DashboardIdentity = {
  role: 'anggota',
  name: 'Tamu',
  tenantName: '',
  tenantId: null,
  preview: true,
};

/**
 * Identitas untuk chrome dashboard.
 * - Belum login                        → preview: true
 * - Login, tidak ada member aktif      → noMembership: true
 * - Login, member aktif ditemukan      → data nyata dari DB
 */
export async function getDashboardIdentity(): Promise<DashboardIdentity> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return PREVIEW_IDENTITY;

  // Query members terpisah dari tenants — menghindari masalah RLS pada inner join
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('role, full_name, tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (memberErr) {
    console.error('[identity] members query error:', memberErr.message, '| uid:', user.id);
  }

  if (!member) {
    const meta = user.user_metadata as Record<string, string> | undefined;
    const displayName = meta?.full_name ?? user.email?.split('@')[0] ?? 'Pengguna';
    return {
      role: 'anggota',
      name: displayName,
      tenantName: '',
      tenantId: null,
      preview: false,
      noMembership: true,
    };
  }

  // Query tenant name terpisah — RLS tenants punya USING(true) jadi pasti lolos
  let tenantName = 'Koperasi';
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', member.tenant_id)
    .single();

  if (tenant) {
    tenantName = tenant.name;
  }

  return {
    role: member.role as TenantRole,
    name: (member.full_name as string | null) ?? 'Pengguna',
    tenantName,
    tenantId: member.tenant_id as string,
    preview: false,
  };
}
