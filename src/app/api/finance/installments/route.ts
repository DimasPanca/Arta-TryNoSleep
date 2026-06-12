import { NextResponse, type NextRequest } from 'next/server';

import { getInstallments } from '@/lib/finance/lifecycle';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** GET /api/finance/installments?applicationId=... — RLS membatasi visibilitas. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Anda harus masuk.' }, { status: 401 });

  const applicationId = request.nextUrl.searchParams.get('applicationId');
  if (!applicationId) {
    return NextResponse.json({ ok: false, error: 'Parameter applicationId wajib.' }, { status: 400 });
  }

  try {
    const installments = await getInstallments(applicationId);
    return NextResponse.json({ ok: true, installments });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Gagal mengambil cicilan.' },
      { status: 500 },
    );
  }
}
