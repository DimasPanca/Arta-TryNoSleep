import { generateImageHash, getCachedResult } from '@/lib/vision/cache';
import { analyzeVegetableQuality } from '@/lib/vision/client';
import type { ScanResult } from '@/types/scan';
import type { QualityGrade } from '@/types/stock';

const CONSENSUS_PASSES = 3;

export async function scanWithConsensus(
  base64Image: string,
  commodity: string,
): Promise<ScanResult & { individualResults: ScanResult[] }> {
  const hash = generateImageHash(base64Image);

  const cached = await getCachedResult(hash);
  if (cached) {
    return { ...cached, individualResults: [] };
  }

  const results = await Promise.all(
    Array.from({ length: CONSENSUS_PASSES }, () =>
      analyzeVegetableQuality(base64Image, commodity),
    ),
  );

  const consensus = buildConsensus(results);

  return { ...consensus, individualResults: results };
}

function buildConsensus(results: ScanResult[]): ScanResult {
  const votes = new Map<QualityGrade, number>();
  for (const result of results) {
    votes.set(result.grade, (votes.get(result.grade) ?? 0) + 1);
  }

  let majorityGrade = results[0].grade;
  let maxVotes = 0;
  for (const [grade, count] of votes) {
    if (count > maxVotes) {
      maxVotes = count;
      majorityGrade = grade;
    }
  }

  const base = results.find((r) => r.grade === majorityGrade) ?? results[0];
  const averageScore = Math.round(
    results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length,
  );

  return {
    ...base,
    qualityScore: averageScore,
    consensusConfidence: maxVotes === results.length ? 'high' : 'medium',
    source: 'fresh_scan',
  };
}
