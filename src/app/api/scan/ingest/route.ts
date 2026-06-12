import { NextResponse, type NextRequest } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { analyzeWithFallback, extractBase64 } from '@/lib/vision/analyze';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BASE64 = 12_000_000;

/**
 * Endpoint ingest untuk perangkat IoT (mis. ESP32-CAM / kamera konveyor sortir).
 *
 * Otentikasi via header `x-device-key` yang dicocokkan dengan IOT_DEVICE_KEY.
 * Body JSON: { image: base64|dataURL, deviceId?, commodity?, save? }
 *
 * Bila `save=true` dan IOT_TENANT_ID terpasang, hasil otomatis disimpan ke
 * scan_records koperasi tsb (lewat service-role, melewati RLS).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const configured = process.env.IOT_DEVICE_KEY;
  if (!configured) {
    return NextResponse.json(
      { ok: false, error: 'Integrasi IoT belum dikonfigurasi (IOT_DEVICE_KEY kosong).' },
      { status: 503 },
    );
  }

  if (request.headers.get('x-device-key') !== configured) {
    return NextResponse.json({ ok: false, error: 'Kunci perangkat tidak sah.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body permintaan tidak valid.' }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const deviceId = typeof b.deviceId === 'string' ? b.deviceId : 'iot-device';
  const commodity =
    typeof b.commodity === 'string' && b.commodity.trim().length > 0 ? b.commodity.trim() : 'tomat';
  const base64 = extractBase64(typeof b.image === 'string' ? b.image : '');

  if (!base64) {
    return NextResponse.json({ ok: false, error: 'Field "image" wajib diisi.' }, { status: 400 });
  }
  if (base64.length > MAX_BASE64) {
    return NextResponse.json({ ok: false, error: 'Ukuran gambar terlalu besar.' }, { status: 413 });
  }

  let out;
  try {
    out = await analyzeWithFallback(base64, commodity);
  } catch (error) {
    console.error('[api/scan/ingest] Analisis gagal:', error);
    return NextResponse.json({ ok: false, error: 'Analisis gagal.' }, { status: 500 });
  }

  let saved = false;
  const iotTenantId = process.env.IOT_TENANT_ID;
  if (b.save === true && iotTenantId) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.from('scan_records').insert({
        tenant_id: iotTenantId,
        grade: out.result.grade,
        quality_score: out.result.qualityScore,
        defects: out.result.defects,
        color_ripeness: out.result.colorRipeness,
        surface_condition: out.result.surfaceCondition,
        size_estimate: out.result.sizeEstimate,
        confidence: out.result.confidence,
        reasoning: `[IoT ${deviceId}] ${out.result.reasoning}`,
        image_hash: out.imageHash,
        consensus_data: { ...out.result, source: 'iot', deviceId },
        scanned_by: null,
      });
      if (error) console.error('[api/scan/ingest] Gagal menyimpan:', error);
      else saved = true;
    } catch (error) {
      console.error('[api/scan/ingest] Service-role tidak tersedia:', error);
    }
  }

  return NextResponse.json({
    ok: true,
    deviceId,
    provider: out.provider,
    imageHash: out.imageHash,
    latencyMs: out.latencyMs,
    saved,
    result: out.result,
  });
}
