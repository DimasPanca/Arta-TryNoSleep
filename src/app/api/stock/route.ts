import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getStockBatches, createStockBatch } from '@/lib/stock/queries';
import { processBatchReceival } from '@/lib/stock/batch';
import type { BatchStatus, QualityGrade } from '@/types/stock';
import type { ScanResult } from '@/types/scan';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const status = searchParams.get('status') as BatchStatus | null;
  const grade = searchParams.get('grade') as QualityGrade | null;

  if (!tenantId) {
    return NextResponse.json({ error: 'Parameter tenantId wajib diisi' }, { status: 400 });
  }

  try {
    const batches = await getStockBatches(tenantId, {
      ...(status && { status }),
      ...(grade && { grade }),
    });
    return NextResponse.json({ data: batches }, { status: 200 });
  } catch (error) {
    console.error('[api/stock] Gagal mengambil data stok:', error);
    return NextResponse.json({ error: 'Gagal mengambil data stok' }, { status: 500 });
  }
}

interface CreateStockBody {
  tenantId: string;
  commodity: string;
  quantityKg: number;
  storageType: 'ambient' | 'cold';
  operatorId: string;
  farmerId?: string;
  scanResult?: ScanResult;
}

function isValidCreateBody(body: unknown): body is CreateStockBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.tenantId === 'string' &&
    typeof b.commodity === 'string' &&
    typeof b.quantityKg === 'number' && b.quantityKg > 0 &&
    (b.storageType === 'ambient' || b.storageType === 'cold') &&
    typeof b.operatorId === 'string'
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

  if (!isValidCreateBody(body)) {
    return NextResponse.json(
      { error: 'Field yang dibutuhkan tidak lengkap: tenantId, commodity, quantityKg, storageType, operatorId' },
      { status: 400 },
    );
  }

  try {
    if (body.scanResult) {
      const batch = await processBatchReceival(
        body.tenantId,
        {
          commodity:   body.commodity,
          quantityKg:  body.quantityKg,
          storageType: body.storageType,
          status:      'available',
          operatorId:  body.operatorId,
          farmerId:    body.farmerId,
        },
        body.scanResult,
      );
      return NextResponse.json({ data: batch }, { status: 201 });
    }

    const batch = await createStockBatch(body.tenantId, {
      commodity:   body.commodity,
      quantityKg:  body.quantityKg,
      storageType: body.storageType,
      status:      'available',
    });
    return NextResponse.json({ data: batch }, { status: 201 });
  } catch (error) {
    console.error('[api/stock] Gagal membuat batch baru:', error);
    return NextResponse.json({ error: 'Gagal menyimpan batch baru' }, { status: 500 });
  }
}
