import { NextRequest, NextResponse } from 'next/server';

import { getCreditHistory } from '@/lib/blockchain/query';
import { createServerClient } from '@/lib/supabase/server';

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

  const { applicantId, requestingTenantId: _requestingTenantId } = body as Record<string, string>;
  if (!applicantId) {
    return NextResponse.json({ error: 'applicantId wajib diisi' }, { status: 400 });
  }

  try {
    // Ambil riwayat kredit dari blockchain (lintas tenant)
    const creditHistory = await getCreditHistory(applicantId);

    // Hitung skor kredit sederhana
    let score = 500; // default mid score
    let recommendation: 'approve' | 'review' | 'reject' = 'review';

    if (creditHistory.entries.length > 0) {
      let totalLoans = 0;
      let totalSettled = 0;
      let totalArrears = 0;

      for (const entry of creditHistory.entries) {
        totalLoans += entry.totalLoans;
        totalSettled += entry.settledLoans;
        totalArrears += entry.activeArrears;
      }

      const settleRate = totalLoans > 0 ? totalSettled / totalLoans : 0;
      const arrearsRatio = totalLoans > 0 ? totalArrears / totalLoans : 0;

      score = Math.round(300 + (settleRate * 400) - (arrearsRatio * 200));
      score = Math.max(100, Math.min(850, score)); // clamp

      if (arrearsRatio > 0.5 && totalArrears > 2) {
        recommendation = 'reject';
      } else if (arrearsRatio > 0.3) {
        recommendation = 'review';
      } else {
        recommendation = 'approve';
      }
    } else {
      // No history = new applicant, beri kesempatan
      score = 400;
      recommendation = 'review';
    }

    return NextResponse.json({
      data: {
        applicantId,
        score,
        recommendation,
        history: creditHistory.entries,
        evaluatedAt: new Date().toISOString(),
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[finance/credit-check] Gagal cek kredit:', error);
    return NextResponse.json({ error: 'Gagal melakukan credit check' }, { status: 500 });
  }
}
