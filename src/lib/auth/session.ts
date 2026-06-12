import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import type { KoperasiType, TenantRole } from '@/types/tenant';

export interface Membership {
  userId: string;
  role: TenantRole;
  tenantId: string;
  tenantName: string;
  tenantType: KoperasiType;
}

export async function requireMembership(): Promise<Membership> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('members')
    .select('role, tenant_id, tenants!inner(id, name, type)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) redirect('/onboarding');

  const t = data.tenants as { id: string; name: string; type: string };

  return {
    userId: user.id,
    role: data.role as TenantRole,
    tenantId: t.id,
    tenantName: t.name,
    tenantType: t.type as KoperasiType,
  };
}
