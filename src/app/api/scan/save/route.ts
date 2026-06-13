import { NextResponse, type NextRequest } from 'next/server';

import { recordBatchReceived } from '@/lib/blockchain/record';
import { predictShelfLife } from '@/lib/stock/shelf-life';
import { createServerClient } from '@/lib/supabase/server';
import type { ScanResult } from '@/types/scan';
import type { StorageType } from '@/types/stock';

export const runtime = 'nodejs';

const GRADES = ['A', 'B', 'C', 'D', 'F'];
const RIPENESS = ['unripe', 'semi_ripe', 'ripe', 'overripe'];
const SURFACE = ['clean', 'minor_blemish', 'moderate_damage', 'severe_damage'];
const SIZES = ['small', 'medium', 'large'];
const CONF = ['high', 'medium', 'low'];
const STORAGE = ['ambient', 'cold'];

function isScanResult(value: unknown): value is ScanResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.grade === 'string' && GRADES.includes(v.grade) &&
    typeof v.qualityScore === 'number' && v.qualityScore >= 0 && v.qualityScore <= 100 &&
    Array.isArray(v.defects) && v.defects.every((d) => typeof d === 'string') &&
    typeof v.colorRipeness === 'string' && RIPENESS.includes(v.colorRipeness) &&
    typeof v.surfaceCondition === 'string' && SURFACE.includes(v.surfaceCondition) &&
    typeof v.sizeEstimate === 'string' && SIZES.includes(v.sizeEstimate) &&
    typeof v.confidence === 'string' && CONF.includes(v.confidence) &&
    typeof v.reasoning === 'string'
  );
}

/**
 * Simpan hasil scan ke scan_records (permanen) dan, opsional, buat batch stok baru.
 * Wajib login; tenant diambil dari keanggotaan aktif pengguna (bukan dari klien).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Anda harus masuk untuk menyimpan.' }, { status: 401 });
  }

  const { data: member } = await supabase
    .from('members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const tenantId = (member as { tenant_id: string } | null)?.tenant_id;
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: 'Akun Anda belum tergabung di koperasi aktif.' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body permintaan tidak valid.' }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  if (!isScanResult(b.result)) {
    return NextResponse.json({ ok: false, error: 'Data hasil scan tidak valid.' }, { status: 400 });
  }
  const result = b.result;

  const commodity =
    typeof b.commodity === 'string' && b.commodity.trim().length > 0 ? b.commodity.trim() : 'Tomat';
  const imageHash = typeof b.imageHash === 'string' ? b.imageHash : null;
  const storageType: StorageType = typeof b.storageType === 'string' && STORAGE.includes(b.storageType)
    ? (b.storageType as StorageType)
    : 'ambient';
  const quantityKg = typeof b.quantityKg === 'number' && Number.isFinite(b.quantityKg) ? b.quantityKg : 0;
  const createBatch = b.createBatch === true && quantityKg > 0;

  let batchId: string | null = null;
  let blockchainTx: string | null = null;

  if (createBatch) {
    const receivedAt = new Date().toISOString();
    // Prediksi masa simpan dari kondisi nyata hasil scan → expires_at lebih akurat.
    const shelf = predictShelfLife({
      commodity,
      grade: result.grade,
      qualityScore: result.qualityScore,
      storageType,
      receivedAt,
      colorRipeness: result.colorRipeness,
      surfaceCondition: result.surfaceCondition,
    });
    const expiresAt = shelf.predictedShelfLifeDays > 0 ? shelf.spoilDate : null;

    const { data: batch, error: batchError } = await supabase
      .from('stock_batches')
      .insert({
        tenant_id: tenantId,
        commodity,
        quantity_kg: quantityKg,
        grade: result.grade,
        quality_score: result.qualityScore,
        storage_type: storageType,
        status: 'available',
        received_at: receivedAt,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (batchError || !batch) {
      console.error('[api/scan/save] Gagal membuat batch:', batchError);
      return NextResponse.json({ ok: false, error: 'Gagal membuat batch stok.' }, { status: 500 });
    }
    batchId = (batch as { id: string }).id;

    // Catat batch ke Hyperledger Fabric (best-effort). Supabase tetap sumber
    // utama bila Fabric offline — txId disimpan agar baris terverifikasi on-chain.
    try {
      const tx = await recordBatchReceived({
        batchId,
        tenantId,
        commodity,
        quantityKg,
        grade: result.grade,
        qualityScore: result.qualityScore,
        receivedAt,
        operatorId: user.id,
      });
      blockchainTx = tx.txId;
      await supabase.from('stock_batches').update({ blockchain_tx: tx.txId }).eq('id', batchId);
    } catch (fabricErr) {
      console.error('[api/scan/save] Fabric recordBatchReceived gagal (fallback Supabase):', fabricErr);
    }
  }

  const { error: scanError } = await supabase.from('scan_records').insert({
    batch_id: batchId,
    tenant_id: tenantId,
    grade: result.grade,
    quality_score: result.qualityScore,
    defects: result.defects,
    color_ripeness: result.colorRipeness,
    surface_condition: result.surfaceCondition,
    size_estimate: result.sizeEstimate,
    confidence: result.confidence,
    reasoning: result.reasoning,
    image_hash: imageHash,
    consensus_data: result,
    scanned_by: user.id,
  });

  if (scanError) {
    console.error('[api/scan/save] Gagal menyimpan scan_record:', scanError);
    return NextResponse.json({ ok: false, error: 'Gagal menyimpan hasil scan.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, batchId, blockchainTx });
}
