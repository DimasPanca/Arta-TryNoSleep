import { getCreditHistory } from '@/lib/blockchain/query';
import type { CreditHistoryEntry } from '@/types/finance';

type Recommendation = 'approve' | 'review' | 'reject';

interface CreditScoreResult {
  score: number;
  history: CreditHistoryEntry[];
  recommendation: Recommendation;
}

export async function getCrossTenantCreditScore(
  userId: string,
  requestingTenantId: string,
): Promise<CreditScoreResult> {
  const creditHistory = await getCreditHistory(userId);

  // Cross-tenant berarti riwayat di koperasi lain; koperasi yang dituju tidak dihitung sebagai referensi eksternal
  const history = creditHistory.entries.filter(
    (entry) => entry.tenantId !== requestingTenantId,
  );

  const score = calculateScore(history);
  const hasActiveArrears = history.some((entry) => entry.activeArrears > 0);

  return {
    score,
    history,
    recommendation: resolveRecommendation(score, hasActiveArrears),
  };
}

function calculateScore(history: CreditHistoryEntry[]): number {
  if (history.length === 0) {
    return 70;
  }

  const totalLoans = history.reduce((sum, entry) => sum + entry.totalLoans, 0);
  const settledLoans = history.reduce((sum, entry) => sum + entry.settledLoans, 0);
  const activeArrears = history.reduce((sum, entry) => sum + entry.activeArrears, 0);

  if (totalLoans === 0) {
    return 70;
  }

  const settlementRatio = settledLoans / totalLoans;
  const arrearPenalty = (activeArrears / totalLoans) * 60;
  const score = Math.round(settlementRatio * 100 - arrearPenalty);

  return Math.max(0, Math.min(100, score));
}

function resolveRecommendation(score: number, hasActiveArrears: boolean): Recommendation {
  if (score < 50 || hasActiveArrears) {
    return 'reject';
  }
  if (score < 80) {
    return 'review';
  }
  return 'approve';
}
