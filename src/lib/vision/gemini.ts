import { GoogleGenerativeAI } from '@google/generative-ai';

import { buildGradingPrompt } from '@/lib/vision/prompts';
import type { ScanResult } from '@/types/scan';

const GEMINI_MODEL = 'gemini-2.0-flash';

const VALID_GRADES = ['A', 'B', 'C', 'D', 'F'] as const;
const VALID_RIPENESS = ['unripe', 'semi_ripe', 'ripe', 'overripe'] as const;
const VALID_SURFACES = ['clean', 'minor_blemish', 'moderate_damage', 'severe_damage'] as const;
const VALID_SIZES = ['small', 'medium', 'large'] as const;
const VALID_CONFIDENCE = ['high', 'medium', 'low'] as const;

export async function analyzeWithGemini(
  base64Image: string,
  commodity: string,
): Promise<ScanResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY tidak dikonfigurasi');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const result = await model.generateContent([
      { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
      buildGradingPrompt(commodity),
    ]);

    return parseScanResult(result.response.text());
  } catch (error) {
    console.error('[vision/gemini] Analisis fallback gagal:', error);
    throw error;
  }
}

function extractJson(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Respons Gemini tidak mengandung JSON');
  }
  return raw.slice(start, end + 1);
}

function isScanResult(value: unknown): value is ScanResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.grade === 'string' &&
    (VALID_GRADES as readonly string[]).includes(v.grade) &&
    typeof v.qualityScore === 'number' &&
    Array.isArray(v.defects) &&
    (v.defects as unknown[]).every((d) => typeof d === 'string') &&
    typeof v.colorRipeness === 'string' &&
    (VALID_RIPENESS as readonly string[]).includes(v.colorRipeness) &&
    typeof v.surfaceCondition === 'string' &&
    (VALID_SURFACES as readonly string[]).includes(v.surfaceCondition) &&
    typeof v.sizeEstimate === 'string' &&
    (VALID_SIZES as readonly string[]).includes(v.sizeEstimate) &&
    typeof v.confidence === 'string' &&
    (VALID_CONFIDENCE as readonly string[]).includes(v.confidence) &&
    typeof v.reasoning === 'string'
  );
}

function parseScanResult(raw: string): ScanResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new Error('Respons Gemini bukan JSON yang valid');
  }

  if (!isScanResult(parsed)) {
    throw new Error('Respons Gemini tidak memiliki semua field yang dibutuhkan');
  }

  return parsed;
}
