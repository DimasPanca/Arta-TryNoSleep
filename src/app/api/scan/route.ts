import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getCachedResult, generateImageHash } from '@/lib/vision/cache';
import { scanWithConsensus } from '@/lib/vision/consensus';
import { analyzeWithGemini } from '@/lib/vision/gemini';
import type { ScanResult } from '@/types/scan';

interface ScanRequestBody {
  base64Image: string;
  commodity: string;
  batchId?: string;
  tenantId: string;
}

function isValidBody(body: unknown): body is ScanRequestBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.base64Image === 'string' && b.base64Image.length > 0 &&
    typeof b.commodity === 'string' && b.commodity.length > 0 &&
    typeof b.tenantId === 'string' && b.tenantId.length > 0
  );
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
      { error: 'Field yang dibutuhkan tidak lengkap: base64Image, commodity, tenantId' },
      { status: 400 },
    );
  }

  const hash = generateImageHash(body.base64Image);
  const cached = await getCachedResult(hash);
  if (cached) {
    return NextResponse.json({ data: cached }, { status: 200 });
  }

  try {
    let result: ScanResult;
    try {
      const consensus = await scanWithConsensus(body.base64Image, body.commodity);
      result = consensus;
    } catch (claudeError) {
      console.error('[api/scan] Claude gagal, mencoba fallback Gemini:', claudeError);
      result = await analyzeWithGemini(body.base64Image, body.commodity);
    }

    await supabase.from('scan_records').insert({
      batch_id:          body.batchId ?? null,
      tenant_id:         body.tenantId,
      grade:             result.grade,
      quality_score:     result.qualityScore,
      defects:           result.defects,
      color_ripeness:    result.colorRipeness,
      surface_condition: result.surfaceCondition,
      size_estimate:     result.sizeEstimate,
      confidence:        result.confidence,
      reasoning:         result.reasoning,
      image_hash:        hash,
      consensus_data:    result,
      scanned_by:        user.id,
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('[api/scan] Analisis kualitas gagal:', error);
    return NextResponse.json(
      { error: 'Analisis kualitas tidak berhasil. Coba lagi atau periksa koneksi.' },
      { status: 500 },
    );
  }
}
