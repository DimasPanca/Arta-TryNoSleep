import crypto from 'crypto';

import { createServerClient } from '@/lib/supabase/server';
import type { ScanResult } from '@/types/scan';

export function generateImageHash(base64Image: string): string {
  return crypto.createHash('sha256').update(base64Image).digest('hex');
}

export async function getCachedResult(hash: string): Promise<ScanResult | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('scan_records')
    .select('consensus_data')
    .eq('image_hash', hash)
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[vision/cache] Gagal membaca cache scan:', error);
    return null;
  }
  if (!data) return null;

  const result = (data as { consensus_data: unknown }).consensus_data;
  if (!isCachedScanResult(result)) return null;

  return { ...result, source: 'cache' };
}

// setCachedResult tidak digunakan — scan_records di-insert langsung dari route
// agar tenant_id dan size_estimate (NOT NULL) selalu tersedia

function isCachedScanResult(value: unknown): value is ScanResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.grade === 'string' &&
    typeof v.qualityScore === 'number' &&
    typeof v.reasoning === 'string'
  );
}
