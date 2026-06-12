import type { LoanApplication } from '@/types/finance';

type Decision = 'approve' | 'review' | 'reject';
type Validator = 'pengurus' | 'dinas';

interface LoanRecommendation {
  decision: Decision;
  reasons: string[];
  nextValidator?: Validator;
}

const AUTO_REJECT_THRESHOLD = 50;
const REVIEW_THRESHOLD = 80;

export async function generateLoanRecommendation(
  application: LoanApplication,
  creditScore: number,
): Promise<LoanRecommendation> {
  const reasons: string[] = [];

  if (creditScore < AUTO_REJECT_THRESHOLD) {
    reasons.push(`Skor kredit ${creditScore} di bawah batas minimum ${AUTO_REJECT_THRESHOLD}`);
    reasons.push('Pengajuan ditolak otomatis tanpa perlu validasi pengurus');
    return { decision: 'reject', reasons };
  }

  const hasArrears = (application.crossTenantData ?? []).some((entry) => entry.activeArrears > 0);

  if (creditScore < REVIEW_THRESHOLD) {
    reasons.push(`Skor kredit ${creditScore} masuk rentang tinjauan ${AUTO_REJECT_THRESHOLD}-${REVIEW_THRESHOLD - 1}`);
    reasons.push('Pengajuan diteruskan ke pengurus dengan catatan untuk ditinjau lebih lanjut');
    return { decision: 'review', reasons, nextValidator: 'pengurus' };
  }

  if (hasArrears) {
    reasons.push('Skor kredit baik namun masih ada tunggakan aktif di koperasi lain');
    reasons.push('Pengajuan diteruskan ke pengurus untuk verifikasi tunggakan');
    return { decision: 'review', reasons, nextValidator: 'pengurus' };
  }

  reasons.push(`Skor kredit ${creditScore} memenuhi syarat persetujuan`);
  reasons.push('Pengajuan diteruskan ke pengurus untuk validasi tahap pertama');
  return { decision: 'approve', reasons, nextValidator: 'pengurus' };
}
