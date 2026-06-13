import type { Metadata } from 'next';
import type React from 'react';

import { MembersWorkspace } from '@/components/members/MembersWorkspace';
import { getDashboardIdentity } from '@/lib/auth/identity';
import type { InviteRecord, InviteState, MemberRecord } from '@/lib/members/overview';
import { createServerClient } from '@/lib/supabase/server';
import type { TenantRole } from '@/types/tenant';

export const metadata: Metadata = {
  title: 'Anggota · Arta',
};

export const dynamic = 'force-dynamic';

export default async function MembersPage(): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();
  const tenantId = identity.tenantId;

  let members: MemberRecord[] = [];
  let pending: MemberRecord[] = [];
  let invites: InviteRecord[] = [];

  if (tenantId) {
    const supabase = await createServerClient();

    const [membersRes, pendingRes, invitesRes] = await Promise.all([
      supabase
        .from('members')
        .select('id, full_name, role, status, phone, joined_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true }),

      supabase
        .from('members')
        .select('id, full_name, role, status, phone, joined_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('joined_at', { ascending: false }),

      supabase
        .from('member_invites')
        .select('id, token, role, note, created_at, expires_at, used_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
    ]);

    type MemberRow = {
      id: string;
      full_name: string | null;
      role: string;
      status: string;
      phone: string | null;
      joined_at: string;
    };

    type InviteRow = {
      id: string;
      token: string;
      role: string;
      note: string | null;
      created_at: string;
      expires_at: string;
      used_at: string | null;
    };

    members = ((membersRes.data ?? []) as MemberRow[]).map((r) => ({
      id: r.id,
      fullName: r.full_name ?? 'Anggota',
      role: r.role as TenantRole,
      status: 'active' as const,
      phone: r.phone ?? '',
      joinedAt: r.joined_at,
    }));

    pending = ((pendingRes.data ?? []) as MemberRow[]).map((r) => ({
      id: r.id,
      fullName: r.full_name ?? 'Anggota',
      role: r.role as TenantRole,
      status: 'pending' as const,
      phone: r.phone ?? '',
      joinedAt: r.joined_at,
      appliedAt: r.joined_at,
    }));

    invites = ((invitesRes.data ?? []) as InviteRow[]).map((r): InviteRecord => {
      const now = Date.now();
      const expired = new Date(r.expires_at).getTime() < now;
      const state: InviteState = r.used_at ? 'accepted' : expired ? 'expired' : 'pending';
      return {
        id: r.id,
        token: r.token,
        role: r.role as Exclude<TenantRole, 'anggota'>,
        ...(r.note != null && { note: r.note }),
        phone: '',
        createdByName: '',
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        state,
      };
    });
  }

  return (
    <MembersWorkspace
      members={members}
      pending={pending}
      invites={invites}
      viewerRole={identity.role}
      viewerId="viewer-self"
      tenantName={identity.tenantName}
      preview={identity.preview}
    />
  );
}
