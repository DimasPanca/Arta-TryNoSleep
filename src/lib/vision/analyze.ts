import { generateImageHash } from '@/lib/vision/cache';
import { scanWithConsensus } from '@/lib/vision/consensus';
import { analyzeWithGemini } from '@/lib/vision/gemini';
import { mockScan } from '@/lib/vision/mock';
import type { ScanResult } from '@/types/scan';

export type ProviderTag = 'claude' | 'gemini' | 'demo';

/** Ambil base64 murni dari data URL ("data:image/jpeg;base64,...") atau string base64 apa adanya. */
export function extractBase64(image: string): string | null {
  if (typeof image !== 'string' || image.length === 0) return null;
  if (image.startsWith('data:')) {
    const comma = image.indexOf(',');
    if (comma < 0) return null;
    const data = image.slice(comma + 1);
    return data.length > 0 ? data : null;
  }
  return image;
}

export interface AnalyzeOutput {
  result: ScanResult;
  imageHash: string;
  provider: ProviderTag;
  latencyMs: number;
}

/**
 * Analisis kualitas dengan rantai fallback:
 * Claude (konsensus 3×) → Gemini → demo heuristik (tanpa key).
 * Tidak menyimpan ke DB — pemanggil yang memutuskan kapan menyimpan.
 */
export async function analyzeWithFallback(
  base64Image: string,
  commodity: string,
): Promise<AnalyzeOutput> {
  const imageHash = generateImageHash(base64Image);
  const start = Date.now();
  const elapsed = (): number => Date.now() - start;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await scanWithConsensus(base64Image, commodity);
      return { result, imageHash, provider: 'claude', latencyMs: elapsed() };
    } catch (error) {
      console.error('[vision/analyze] Claude gagal, mencoba Gemini:', error);
    }
  }

  if (process.env.GOOGLE_API_KEY) {
    try {
      const result = await analyzeWithGemini(base64Image, commodity);
      return { result, imageHash, provider: 'gemini', latencyMs: elapsed() };
    } catch (error) {
      console.error('[vision/analyze] Gemini gagal, memakai mode demo:', error);
    }
  }

  const result = await mockScan(base64Image);
  return { result, imageHash, provider: 'demo', latencyMs: elapsed() };
}
