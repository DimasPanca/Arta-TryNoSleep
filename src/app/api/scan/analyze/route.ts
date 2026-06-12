import { NextResponse, type NextRequest } from 'next/server';

import { analyzeWithFallback, extractBase64 } from '@/lib/vision/analyze';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** ~9 MB biner (base64 ≈ 1.33×). */
const MAX_BASE64 = 12_000_000;

/**
 * Analisis kualitas interaktif untuk studio scan.
 * Tidak butuh login dan tidak menyimpan ke DB — murni mengembalikan penilaian
 * agar pengguna bisa meninjau dulu sebelum memilih "Simpan ke stok".
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body permintaan tidak valid.' }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const image = typeof b.image === 'string' ? b.image : '';
  const commodity =
    typeof b.commodity === 'string' && b.commodity.trim().length > 0 ? b.commodity.trim() : 'tomat';

  const base64 = extractBase64(image);
  if (!base64) {
    return NextResponse.json(
      { ok: false, error: 'Field "image" wajib diisi (data URL atau base64).' },
      { status: 400 },
    );
  }
  if (base64.length > MAX_BASE64) {
    return NextResponse.json({ ok: false, error: 'Ukuran gambar terlalu besar.' }, { status: 413 });
  }

  try {
    const out = await analyzeWithFallback(base64, commodity);
    return NextResponse.json({ ok: true, ...out });
  } catch (error) {
    console.error('[api/scan/analyze] Analisis gagal:', error);
    return NextResponse.json(
      { ok: false, error: 'Analisis kualitas tidak berhasil. Coba lagi.' },
      { status: 500 },
    );
  }
}
