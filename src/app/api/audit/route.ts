import { NextRequest, NextResponse } from 'next/server';

import { getAuditLogs } from '@/lib/audit/queries';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Parameter tenantId wajib diisi' }, { status: 400 });
  }

  const filters = {
    ...(searchParams.get('actorId') && { actorId: searchParams.get('actorId')! }),
    ...(searchParams.get('startDate') && { startDate: searchParams.get('startDate')! }),
    ...(searchParams.get('endDate') && { endDate: searchParams.get('endDate')! }),
  };

  try {
    const logs = await getAuditLogs(tenantId, filters);
    return NextResponse.json({ data: logs }, { status: 200 });
  } catch (error) {
    console.error('[api/audit] Gagal mengambil log audit:', error);
    return NextResponse.json({ error: 'Gagal mengambil log audit' }, { status: 500 });
  }
}
