import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getCrossTenantCreditScore } from '@/lib/finance/credit';

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

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
  }

  const { applicantId, requestingTenantId } = body as Record<string, unknown>;

  if (typeof applicantId !== 'string' || typeof requestingTenantId !== 'string') {
    return NextResponse.json(
      { error: 'Field yang dibutuhkan tidak lengkap: applicantId, requestingTenantId' },
      { status: 400 },
    );
  }

  try {
    const result = await getCrossTenantCreditScore(applicantId, requestingTenantId);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('[api/finance/credit-check] Gagal mengambil data kredit:', error);
    return NextResponse.json({ error: 'Gagal mengambil riwayat kredit lintas koperasi' }, { status: 500 });
  }
}
