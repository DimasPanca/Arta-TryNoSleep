import type { QualityGrade } from '@/types/stock';

export const GRADE_THRESHOLDS: Record<QualityGrade, { min: number; max: number }> = {
  A: { min: 90, max: 100 },
  B: { min: 75, max: 89 },
  C: { min: 60, max: 74 },
  D: { min: 40, max: 59 },
  F: { min: 0, max: 39 },
};

export const GRADE_LABELS: Record<QualityGrade, string> = {
  A: 'Grade A',
  B: 'Grade B',
  C: 'Grade C',
  D: 'Grade D',
  F: 'Grade F',
};

export const GRADE_CSS_CLASS: Record<QualityGrade, string> = {
  A: 'badge-grade-a',
  B: 'badge-grade-b',
  C: 'badge-grade-c',
  D: 'badge-grade-d',
  F: 'badge-grade-f',
};

export function scoreToGrade(score: number): QualityGrade {
  const entry = (Object.entries(GRADE_THRESHOLDS) as [QualityGrade, { min: number; max: number }][]).find(
    ([, { min, max }]) => score >= min && score <= max,
  );
  return entry ? entry[0] : 'F';
}
