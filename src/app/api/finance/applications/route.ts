import { NextResponse, type NextRequest } from 'next/server';

import { submitLoanApplication } from '@/lib/blockchain/record';
import { createLoanApplication, getLoanApplications } from '@/lib/finance/applications';
import { getCrossTenantCreditScore } from '@/lib/finance/credit';
import { generateLoanRecommendation } from '@/lib/finance/recommendations';
import { createServerClient } from '@/lib/supabase/server';
import type { FinancingType } from '@/types/finance';

export const runtime = 'nodejs';

interface ParsedBody {
  targetTenantId: string;
  financingType: FinancingType;
  amount: number;
  purpose?: string;
  assetName?: string;
  assetCategory?: string;
  assetPrice?: number;
  vendorName?: string;
  downPayment: number;
  tenorMonths: number;
  marginPct: number;
  error?: string;
}

function parseBody(body: unknown): ParsedBody | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body tidak valid.' };
  const b = body as Record<string, unknown>;

  if (typeof b.targetTenantId !== 'string' || b.targetTenantId.length === 0) {
    return { error: 'targetTenantId wajib diisi.' };
  }
  const financingType: FinancingType = b.financingType === 'cash' ? 'cash' : 'asset';
  const tenorMonths = Number.isFinite(b.tenorMonths) ? Math.round(Number(b.tenorMonths)) : 12;
  if (tenorMonths < 1 || tenorMonths > 60) return { error: 'Tenor harus 1–60 bulan.' };
  const marginPct = Number.isFinite(b.marginPct) ? Number(b.marginPct) : 0;
  const downPayment = Number.isFinite(b.downPayment) ? Number(b.downPayment) : 0;
  const purpose = typeof b.purpose === 'string' ? b.purpose : undefined;

  if (financingType === 'asset') {
    const assetPrice = Number(b.assetPrice);
    if (!Number.isFinite(assetPrice) || assetPrice <= 0) {
      return { error: 'Harga aset wajib diisi.' };
    }
    if (typeof b.assetName !== 'string' || b.assetName.trim().length === 0) {
      return { error: 'Nama aset wajib diisi.' };
    }
    if (downPayment < 0 || downPayment >= assetPrice) {
      return { error: 'Uang muka tidak valid (harus 0 sampai di bawah harga aset).' };
    }
    const amount = Math.round(assetPrice - downPayment);
    return {
      targetTenantId: b.targetTenantId,
      financingType,
      amount,
      assetName: b.assetName.trim(),
      assetPrice,
      downPayment,
      tenorMonths,
      marginPct,
      ...(typeof b.assetCategory === 'string' && { assetCategory: b.assetCategory }),
      ...(typeof b.vendorName === 'string' && { vendorName: b.vendorName }),
      ...(purpose !== undefined && { purpose }),
    };
  }

  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Nominal pinjaman tidak valid.' };
  return {
    targetTenantId: b.targetTenantId,
    financingType,
    amount,
    downPayment: 0,
    tenorMonths,
    marginPct,
    ...(purpose !== undefined && { purpose }),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'Parameter tenantId wajib diisi' }, { status: 400 });

  try {
    const applications = await getLoanApplications(tenantId);
    return NextResponse.json({ data: applications });
  } catch (error) {
    console.error('[api/finance/applications] GET gagal:', error);
    return NextResponse.json({ error: 'Gagal mengambil daftar pengajuan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const credit = await getCrossTenantCreditScore(user.id, parsed.targetTenantId);

    if (credit.recommendation === 'reject') {
      return NextResponse.json(
        {
          error: 'Pengajuan ditolak otomatis berdasarkan riwayat kredit lintas koperasi.',
          data: { status: 'rejected', creditScore: credit.score, history: credit.history },
        },
        { status: 422 },
      );
    }

    const application = await createLoanApplication({
      applicantId: user.id,
      targetTenantId: parsed.targetTenantId,
      amount: parsed.amount,
      ...(parsed.purpose !== undefined && { purpose: parsed.purpose }),
      creditScore: credit.score,
      crossTenantData: credit.history,
      financingType: parsed.financingType,
      ...(parsed.assetName !== undefined && { assetName: parsed.assetName }),
      ...(parsed.assetCategory !== undefined && { assetCategory: parsed.assetCategory }),
      ...(parsed.assetPrice !== undefined && { assetPrice: parsed.assetPrice }),
      ...(parsed.vendorName !== undefined && { vendorName: parsed.vendorName }),
      downPayment: parsed.downPayment,
      tenorMonths: parsed.tenorMonths,
      marginPct: parsed.marginPct,
    });

    const recommendation = await generateLoanRecommendation(application, credit.score);

    void submitLoanApplication({
      applicationId: application.id,
      applicantId: user.id,
      targetTenantId: parsed.targetTenantId,
      amount: parsed.amount,
      purpose: parsed.purpose ?? application.assetName ?? '',
      submittedAt: application.createdAt,
    }).catch((err) => console.error('[api/finance/applications] Fabric gagal:', err));

    return NextResponse.json({ data: { application, recommendation } }, { status: 201 });
  } catch (error) {
    console.error('[api/finance/applications] POST gagal:', error);
    return NextResponse.json({ error: 'Gagal memproses pengajuan pembiayaan' }, { status: 500 });
  }
}
