import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { createJointOrder, getJointOrders } from '@/lib/procurement/joint-order';
import { calculateAllocation, createAllocations } from '@/lib/procurement/allocation';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = new URL(request.url).searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'Parameter tenantId wajib diisi' }, { status: 400 });
  }

  try {
    const orders = await getJointOrders(tenantId);
    return NextResponse.json({ data: orders }, { status: 200 });
  } catch (error) {
    console.error('[api/procurement] Gagal mengambil daftar pengadaan:', error);
    return NextResponse.json({ error: 'Gagal mengambil daftar pengadaan' }, { status: 500 });
  }
}

interface CreateProcurementBody {
  commodity: string;
  totalQuantity: number;
  unitPrice?: number;
  initiatedBy: string;
  participants: Array<{ tenantId: string; requestedKg: number }>;
}

function isValidBody(body: unknown): body is CreateProcurementBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.commodity === 'string' &&
    typeof b.totalQuantity === 'number' && b.totalQuantity > 0 &&
    typeof b.initiatedBy === 'string' &&
    Array.isArray(b.participants) && b.participants.length > 0
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
      { error: 'Field yang dibutuhkan tidak lengkap: commodity, totalQuantity, initiatedBy, participants' },
      { status: 400 },
    );
  }

  try {
    const order = await createJointOrder({
      commodity:     body.commodity,
      totalQuantity: body.totalQuantity,
      unitPrice:     body.unitPrice,
      initiatedBy:   body.initiatedBy,
    });

    const allocations = await calculateAllocation(order.id, body.participants);
    await createAllocations(allocations);

    return NextResponse.json({ data: { order, allocations } }, { status: 201 });
  } catch (error) {
    console.error('[api/procurement] Gagal membuat pengadaan bersama:', error);
    return NextResponse.json({ error: 'Gagal membuat pengadaan bersama' }, { status: 500 });
  }
}
