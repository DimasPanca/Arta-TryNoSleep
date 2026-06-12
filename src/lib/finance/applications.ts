import { createServerClient } from '@/lib/supabase/server';
import type { ApplicationStatus, CreditHistoryEntry, LoanApplication } from '@/types/finance';

interface LoanApplicationRow {
  id: string;
  applicant_id: string;
  target_tenant_id: string;
  amount: number;
  purpose: string | null;
  status: ApplicationStatus;
  credit_score: number | null;
  cross_tenant_data: CreditHistoryEntry[] | null;
  created_at: string;
}

export async function createLoanApplication(
  data: Omit<LoanApplication, 'id' | 'createdAt' | 'status'>,
): Promise<LoanApplication> {
  const supabase = createServerClient();

  const { data: inserted, error } = await supabase
    .from('loan_applications')
    .insert({
      applicant_id: data.applicantId,
      target_tenant_id: data.targetTenantId,
      amount: data.amount,
      purpose: data.purpose ?? null,
      credit_score: data.creditScore ?? null,
      cross_tenant_data: data.crossTenantData ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[finance/applications] Gagal membuat pengajuan:', error);
    throw new Error('Gagal menyimpan pengajuan pembiayaan');
  }

  return mapRow(inserted as LoanApplicationRow);
}

export async function getLoanApplications(tenantId: string): Promise<LoanApplication[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('target_tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[finance/applications] Gagal mengambil daftar pengajuan:', error);
    throw new Error('Gagal mengambil daftar pengajuan');
  }

  return (data as LoanApplicationRow[]).map(mapRow);
}

export async function getLoanApplicationById(
  applicationId: string,
): Promise<LoanApplication | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();

  if (error) {
    console.error('[finance/applications] Gagal mengambil pengajuan:', error);
    throw new Error('Gagal mengambil detail pengajuan');
  }

  return data ? mapRow(data as LoanApplicationRow) : null;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  reviewerId: string,
): Promise<LoanApplication> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('loan_applications')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[finance/applications] Gagal memperbarui status pengajuan:', error);
    throw new Error('Gagal memperbarui status pengajuan');
  }
  if (!data) {
    throw new Error('Pengajuan tidak ditemukan');
  }

  return mapRow(data as LoanApplicationRow);
}

function mapRow(row: LoanApplicationRow): LoanApplication {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    targetTenantId: row.target_tenant_id,
    amount: Number(row.amount),
    purpose: row.purpose ?? undefined,
    status: row.status,
    creditScore: row.credit_score ?? undefined,
    crossTenantData: row.cross_tenant_data ?? undefined,
    createdAt: row.created_at,
  };
}
