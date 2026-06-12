import { NextResponse, type NextRequest } from 'next/server';

import { getTraceHistory } from '@/lib/blockchain/query';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/stock/trace?batchId=...
 * Ambil jejak immutable sebuah batch langsung dari Hyperledger Fabric.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Anda harus masuk.' }, { status: 401 });
  }

  const batchId = request.nextUrl.searchParams.get('batchId');
  if (!batchId) {
    return NextResponse.json({ ok: false, error: 'Parameter batchId wajib.' }, { status: 400 });
  }

  try {
    const trace = await getTraceHistory(batchId);
    return NextResponse.json({ ok: true, batchId, entries: trace.entries ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Fabric tidak terjangkau.',
      },
      { status: 502 },
    );
  }
}
