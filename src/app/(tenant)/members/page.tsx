import type { Metadata } from 'next';
import type React from 'react';

import { MembersWorkspace } from '@/components/members/MembersWorkspace';
import { getDashboardIdentity } from '@/lib/auth/identity';
import { SAMPLE_INVITES, SAMPLE_MEMBERS, SAMPLE_PENDING } from '@/lib/members/samples';

export const metadata: Metadata = {
  title: 'Anggota · Arta',
};

export const dynamic = 'force-dynamic';

export default async function MembersPage(): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();
  const tenantName = identity.tenantId ? identity.tenantName : 'Koperasi Melati Jaya';

  // Sumber data saat ini = fixtures keanggotaan Melati Jaya (mode pratinjau).
  // Jalur data nyata via tabel `members`/`member_invites` di-wire bertahap saat
  // Phone Auth & service-role aktif. Wewenang tindakan tetap mengikuti peran.
  return (
    <MembersWorkspace
      members={SAMPLE_MEMBERS}
      pending={SAMPLE_PENDING}
      invites={SAMPLE_INVITES}
      viewerRole={identity.role}
      viewerId="viewer-self"
      tenantName={tenantName}
      preview={identity.preview}
    />
  );
}
