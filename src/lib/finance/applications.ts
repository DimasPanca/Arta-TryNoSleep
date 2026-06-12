import { createServerClient } from '@/lib/supabase/server';
import type {
  ApplicationStatus,
  CreditHistoryEntry,
  FinancingType,
  LoanApplication,
} from '@/types/finance';

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
  financing_type: FinancingType;
  asset_name: string | null;
  asset_category: string | null;
  asset_price: number | null;
  vendor_name: string | null;
  down_payment: number;
  tenor_months: number;
  margin_pct: number;
  disbursed_at: string | null;
  settled_at: string | null;
  asset_transferred_at: string | null;
}

const SELECT_COLUMNS =
  'id, applicant_id, target_tenant_id, amount, purpose, status, credit_score, cross_tenant_data, created_at, financing_type, asset_name, asset_category, asset_price, vendor_name, down_payment, tenor_months, margin_pct, disbursed_at, settled_at, asset_transferred_at';

export interface NewLoanApplication {
  applicantId: string;
  targetTenantId: string;
  amount: number;
  purpose?: string;
  creditScore?: number;
  crossTenantData?: CreditHistoryEntry[];
  financingType: FinancingType;
  assetName?: string;
  assetCategory?: string;
  assetPrice?: number;
  vendorName?: string;
  downPayment: number;
  tenorMonths: number;
  marginPct: number;
}

export async function createLoanApplication(data: NewLoanApplication): Promise<LoanApplication> {
  const supabase = await createServerClient();

  const { data: inserted, error } = await supabase
    .from('loan_applications')
    .insert({
      applicant_id: data.applicantId,
      target_tenant_id: data.targetTenantId,
      amount: data.amount,
      purpose: data.purpose ?? null,
      credit_score: data.creditScore ?? null,
      cross_tenant_data: data.crossTenantData ?? null,
      financing_type: data.financingType,
      asset_name: data.assetName ?? null,
      asset_category: data.assetCategory ?? null,
      asset_price: data.assetPrice ?? null,
      vendor_name: data.vendorName ?? null,
      down_payment: data.downPayment,
      tenor_months: data.tenorMonths,
      margin_pct: data.marginPct,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    console.error('[finance/applications] Gagal membuat pengajuan:', error);
    throw new Error('Gagal menyimpan pengajuan pembiayaan');
  }

  return mapRow(inserted as LoanApplicationRow);
}

/** Pengajuan yang masuk ke koperasi (sudut pandang pengurus/approver). */
export async function getLoanApplications(tenantId: string): Promise<LoanApplication[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('loan_applications')
    .select(SELECT_COLUMNS)
    .eq('target_tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[finance/applications] Gagal mengambil daftar pengajuan:', error);
    throw new Error('Gagal mengambil daftar pengajuan');
  }

  const rows = (data as LoanApplicationRow[]).map(mapRow);
  return attachApplicantNames(supabase, tenantId, rows);
}

/** Pengajuan milik seorang anggota (sudut pandang pemohon). */
export async function getApplicationsByApplicant(applicantId: string): Promise<LoanApplication[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('loan_applications')
    .select(SELECT_COLUMNS)
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[finance/applications] Gagal mengambil pengajuan anggota:', error);
    throw new Error('Gagal mengambil pengajuan');
  }

  return (data as LoanApplicationRow[]).map(mapRow);
}

export async function getLoanApplicationById(applicationId: string): Promise<LoanApplication | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('loan_applications')
    .select(SELECT_COLUMNS)
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
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('loan_applications')
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', applicationId)
    .select(SELECT_COLUMNS)
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

/** Lampirkan nama anggota pemohon (dari tabel members koperasi tujuan). */
async function attachApplicantNames(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string,
  apps: LoanApplication[],
): Promise<LoanApplication[]> {
  const ids = [...new Set(apps.map((a) => a.applicantId))];
  if (ids.length === 0) return apps;

  const { data } = await supabase
    .from('members')
    .select('user_id, full_name')
    .eq('tenant_id', tenantId)
    .in('user_id', ids);

  const names = new Map<string, string>();
  for (const m of (data ?? []) as { user_id: string; full_name: string | null }[]) {
    if (m.full_name) names.set(m.user_id, m.full_name);
  }

  return apps.map((a) => {
    const name = names.get(a.applicantId);
    return name ? { ...a, applicantName: name } : a;
  });
}

function mapRow(row: LoanApplicationRow): LoanApplication {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    targetTenantId: row.target_tenant_id,
    amount: Number(row.amount),
    ...(row.purpose != null && { purpose: row.purpose }),
    status: row.status,
    ...(row.credit_score != null && { creditScore: row.credit_score }),
    ...(row.cross_tenant_data != null && { crossTenantData: row.cross_tenant_data }),
    createdAt: row.created_at,
    financingType: row.financing_type,
    ...(row.asset_name != null && { assetName: row.asset_name }),
    ...(row.asset_category != null && { assetCategory: row.asset_category }),
    ...(row.asset_price != null && { assetPrice: Number(row.asset_price) }),
    ...(row.vendor_name != null && { vendorName: row.vendor_name }),
    downPayment: Number(row.down_payment),
    tenorMonths: row.tenor_months,
    marginPct: Number(row.margin_pct),
    ...(row.disbursed_at != null && { disbursedAt: row.disbursed_at }),
    ...(row.settled_at != null && { settledAt: row.settled_at }),
    ...(row.asset_transferred_at != null && { assetTransferredAt: row.asset_transferred_at }),
  };
}
