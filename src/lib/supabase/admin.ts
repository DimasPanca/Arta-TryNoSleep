import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase dengan service-role key — MELEWATI RLS.
 * HANYA boleh dipakai di server (route handler / server component).
 * Jangan pernah diimpor ke komponen client.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface InviteDetails {
  token: string;
  tenantId: string;
  tenantName: string;
  role: string;
  expired: boolean;
  used: boolean;
}

/**
 * Validasi token undangan tanpa perlu user login.
 * Mengembalikan null jika token tidak ditemukan.
 */
export async function getInviteByToken(token: string): Promise<InviteDetails | null> {
  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const { data, error } = await admin
    .from('member_invites')
    .select('token, tenant_id, role, expires_at, used_at, tenants!inner(name)')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return null;

  const tenant = data.tenants as { name: string } | { name: string }[];
  const tenantName = Array.isArray(tenant) ? (tenant[0]?.name ?? '') : tenant.name;

  return {
    token: data.token as string,
    tenantId: data.tenant_id as string,
    tenantName,
    role: data.role as string,
    expired: new Date(data.expires_at as string).getTime() < Date.now(),
    used: data.used_at != null,
  };
}
