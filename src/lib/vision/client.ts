import Anthropic from '@anthropic-ai/sdk';

import { buildGradingPrompt } from '@/lib/vision/prompts';
import type { ScanResult } from '@/types/scan';

const VISION_MODEL = 'claude-opus-4-5';
const MAX_RESPONSE_TOKENS = 1024;

const VALID_GRADES = ['A', 'B', 'C', 'D', 'F'] as const;
const VALID_RIPENESS = ['unripe', 'semi_ripe', 'ripe', 'overripe'] as const;
const VALID_SURFACES = ['clean', 'minor_blemish', 'moderate_damage', 'severe_damage'] as const;
const VALID_SIZES = ['small', 'medium', 'large'] as const;
const VALID_CONFIDENCE = ['high', 'medium', 'low'] as const;

export async function analyzeVegetableQuality(
  base64Image: string,
  commodity: string,
): Promise<ScanResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            { type: 'text', text: buildGradingPrompt(commodity) },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Respons vision tidak mengandung blok teks');
    }

    return parseScanResult(textBlock.text);
  } catch (error) {
    console.error('[vision/client] Analisis kualitas gagal:', error);
    throw error;
  }
}

function extractJson(raw: string): string {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Respons vision tidak mengandung JSON');
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
    throw new Error('Respons vision bukan JSON yang valid');
  }

  if (!isScanResult(parsed)) {
    throw new Error('Respons vision tidak memiliki semua field yang dibutuhkan');
  }

  return parsed;
}
