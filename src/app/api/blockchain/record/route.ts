import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { recordStockEvent } from '@/lib/blockchain/record';
import type { BlockchainAction, BlockchainStockRecord } from '@/types/blockchain';

const VALID_ACTIONS: ReadonlySet<string> = new Set([
  'batch_received',
  'batch_dispatched',
  'quality_updated',
  'batch_expired',
]);

interface RecordBody {
  action: BlockchainAction;
  record: BlockchainStockRecord;
}

function isValidBody(body: unknown): body is RecordBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.action === 'string' && VALID_ACTIONS.has(b.action) &&
    typeof b.record === 'object' && b.record !== null
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid' }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: 'Field yang dibutuhkan tidak lengkap: action, record' },
      { status: 400 },
    );
  }

  try {
    const result = await recordStockEvent(body.action, body.record);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('[api/blockchain/record] Gagal mencatat ke blockchain:', error);
    return NextResponse.json({ error: 'Gagal mencatat data ke blockchain' }, { status: 500 });
  }
}
