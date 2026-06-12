import { NextRequest, NextResponse } from 'next/server';

import { detectAnomalies } from '@/lib/audit/detector';
import { notifyPengurus } from '@/lib/audit/notifications';
import { createServerClient } from '@/lib/supabase/server';

interface AnomalyCheckBody {
  tenantId: string;
  actorId: string;
  lookbackDays?: number;
  notifyOnDetect?: boolean;
}

function isValidBody(body: unknown): body is AnomalyCheckBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.tenantId === 'string' && typeof b.actorId === 'string';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: 'Field yang dibutuhkan tidak lengkap: tenantId, actorId' },
      { status: 400 },
    );
  }

  try {
    const patterns = await detectAnomalies(body.tenantId, body.actorId, body.lookbackDays);

    if (patterns.length > 0 && body.notifyOnDetect) {
      await Promise.all(
        patterns.map((pattern) => notifyPengurus(body.tenantId, pattern)),
      );
    }

    return NextResponse.json({ data: patterns }, { status: 200 });
  } catch (error) {
    console.error('[api/audit/anomaly] Gagal mendeteksi anomali:', error);
    return NextResponse.json({ error: 'Gagal mendeteksi anomali' }, { status: 500 });
  }
}
