import type React from 'react';

import { CommandBar } from '@/components/dashboard/CommandBar';
import { getDashboardIdentity } from '@/lib/auth/identity';

export default async function TenantLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const identity = await getDashboardIdentity();

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <CommandBar
        role={identity.role}
        name={identity.name}
        tenantName={identity.tenantName}
        preview={identity.preview}
      />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
