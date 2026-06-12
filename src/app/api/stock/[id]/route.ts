import { NextRequest, NextResponse } from 'next/server';

import { getStockBatchById, updateStockBatch, deleteStockBatch } from '@/lib/stock/queries';
import { createServerClient } from '@/lib/supabase/server';
import type { StockBatch } from '@/types/stock';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = new URL(request.url).searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'Parameter tenantId wajib diisi' }, { status: 400 });
  }

  const { id } = await params;

  try {
    const batch = await getStockBatchById(tenantId, id);
    if (!batch) {
      return NextResponse.json({ error: 'Batch tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ data: batch }, { status: 200 });
  } catch (error) {
    console.error('[api/stock/[id]] Gagal mengambil batch:', error);
    return NextResponse.json({ error: 'Gagal mengambil detail batch' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const supabase = await createServerClient();
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

  if (typeof body !== 'object' || body === null || !('tenantId' in body)) {
    return NextResponse.json({ error: 'Field tenantId wajib diisi' }, { status: 400 });
  }

  const { tenantId, ...updates } = body as { tenantId: string } & Partial<StockBatch>;
  const { id } = await params;

  try {
    const updated = await updateStockBatch(tenantId, id, updates);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error('[api/stock/[id]] Gagal memperbarui batch:', error);
    return NextResponse.json({ error: 'Gagal memperbarui batch' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = new URL(request.url).searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'Parameter tenantId wajib diisi' }, { status: 400 });
  }

  const { id } = await params;

  try {
    await deleteStockBatch(tenantId, id);
    return NextResponse.json({ data: null }, { status: 200 });
  } catch (error) {
    console.error('[api/stock/[id]] Gagal menghapus batch:', error);
    return NextResponse.json({ error: 'Gagal menghapus batch' }, { status: 500 });
  }
}
