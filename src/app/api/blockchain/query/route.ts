import { NextRequest, NextResponse } from 'next/server';

import { getTraceHistory, getBatchesByTenant, getPortfolioData } from '@/lib/blockchain/query';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const batchId = searchParams.get('batchId');
  const tenantId = searchParams.get('tenantId');
  const periodStart = searchParams.get('periodStart');
  const periodEnd = searchParams.get('periodEnd');

  try {
    if (type === 'trace' && batchId) {
      const result = await getTraceHistory(batchId);
      return NextResponse.json({ data: result }, { status: 200 });
    }

    if (type === 'tenant' && tenantId) {
      const result = await getBatchesByTenant(tenantId);
      return NextResponse.json({ data: result }, { status: 200 });
    }

    if (type === 'portfolio' && tenantId && periodStart && periodEnd) {
      const result = await getPortfolioData(tenantId, periodStart, periodEnd);
      return NextResponse.json({ data: result }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Parameter tidak lengkap. Gunakan: type=trace&batchId=, type=tenant&tenantId=, atau type=portfolio&tenantId=&periodStart=&periodEnd=' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[api/blockchain/query] Gagal query blockchain:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dari blockchain' }, { status: 500 });
  }
}
