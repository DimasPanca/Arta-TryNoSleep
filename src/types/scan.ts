import type { QualityGrade } from '@/types/stock';

export type RipenessLevel = 'unripe' | 'semi_ripe' | 'ripe' | 'overripe';
export type SurfaceCondition = 'clean' | 'minor_blemish' | 'moderate_damage' | 'severe_damage';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ScanResult {
  grade: QualityGrade;
  qualityScore: number;
  defects: string[];
  colorRipeness: RipenessLevel;
  surfaceCondition: SurfaceCondition;
  sizeEstimate: 'small' | 'medium' | 'large';
  confidence: ConfidenceLevel;
  reasoning: string;
  consensusConfidence?: 'high' | 'medium';
  source?: 'cache' | 'fresh_scan';
}
