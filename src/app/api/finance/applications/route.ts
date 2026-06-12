import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { createLoanApplication, getLoanApplications } from '@/lib/finance/applications';
import { getCrossTenantCreditScore } from '@/lib/finance/credit';
import { generateLoanRecommendation } from '@/lib/finance/recommendations';
import { submitLoanApplication } from '@/lib/blockchain/record';

interface CreateApplicationBody {
  targetTenantId: string;
  amount: number;
  purpose?: string;
}

function isValidBody(body: unknown): body is CreateApplicationBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.targetTenantId === 'string' &&
    typeof b.amount === 'number' && b.amount > 0
  );
}

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
    const applications = await getLoanApplications(tenantId);
    return NextResponse.json({ data: applications }, { status: 200 });
  } catch (error) {
    console.error('[api/finance/applications] Gagal mengambil daftar pengajuan:', error);
    return NextResponse.json({ error: 'Gagal mengambil daftar pengajuan' }, { status: 500 });
  }
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
      { error: 'Field yang dibutuhkan tidak lengkap: targetTenantId, amount' },
      { status: 400 },
    );
  }

  try {
    const creditResult = await getCrossTenantCreditScore(user.id, body.targetTenantId);

    if (creditResult.recommendation === 'reject') {
      return NextResponse.json(
        {
          error: 'Pengajuan ditolak otomatis berdasarkan riwayat kredit',
          data: {
            status: 'rejected',
            creditScore: creditResult.score,
            recommendation: creditResult.recommendation,
          },
        },
        { status: 422 },
      );
    }

    const applicationId = crypto.randomUUID();

    const application = await createLoanApplication({
      applicantId:     user.id,
      targetTenantId:  body.targetTenantId,
      amount:          body.amount,
      purpose:         body.purpose,
      creditScore:     creditResult.score,
      crossTenantData: creditResult.history,
    });

    const recommendation = await generateLoanRecommendation(application, creditResult.score);

    // Fire and forget: blockchain record tidak memblok response
    void submitLoanApplication({
      applicationId,
      applicantId:    user.id,
      targetTenantId: body.targetTenantId,
      amount:         body.amount,
      purpose:        body.purpose ?? '',
      submittedAt:    application.createdAt,
    }).catch((err) => {
      console.error('[api/finance/applications] Gagal mencatat ke blockchain:', err);
    });

    return NextResponse.json(
      { data: { application, recommendation } },
      { status: 201 },
    );
  } catch (error) {
    console.error('[api/finance/applications] Gagal membuat pengajuan:', error);
    return NextResponse.json({ error: 'Gagal memproses pengajuan pembiayaan' }, { status: 500 });
  }
}
