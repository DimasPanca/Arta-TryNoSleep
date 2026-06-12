import { getLoanApplicationById } from '@/lib/finance/applications';
import { createServerClient } from '@/lib/supabase/server';
import type { InstallmentStatus, InternalValidator, LoanInstallment, Verdict } from '@/types/finance';

interface InstallmentRow {
  id: string;
  application_id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: InstallmentStatus;
  paid_at: string | null;
}

function mapInstallment(row: InstallmentRow): LoanInstallment {
  return {
    id: row.id,
    applicationId: row.application_id,
    installmentNo: row.installment_no,
    dueDate: row.due_date,
    amount: Number(row.amount),
    paidAmount: Number(row.paid_amount),
    status: row.status,
    ...(row.paid_at != null && { paidAt: row.paid_at }),
  };
}

function addMonths(base: Date, n: number): string {
  const d = new Date(base.getTime());
  d.setMonth(d.getMonth() + n);
  const iso = d.toISOString();
  return iso.slice(0, 10); // YYYY-MM-DD
}

/**
 * Catat keputusan validator internal (bendahara/ketua/wakil).
 * Trigger DB (sync_loan_status_after_decision) yang memindahkan status pengajuan.
 */
export async function submitDecision(params: {
  applicationId: string;
  validatorId: string;
  validatorType: InternalValidator;
  tenantId: string;
  verdict: Verdict;
  reason?: string;
}): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from('loan_validator_decisions').insert({
    application_id: params.applicationId,
    validator_id: params.validatorId,
    validator_type: params.validatorType,
    tenant_id: params.tenantId,
    verdict: params.verdict,
    reason: params.reason ?? null,
  });

  if (error) {
    console.error('[finance/lifecycle] Gagal menyimpan keputusan validator:', error);
    throw new Error(error.message || 'Gagal menyimpan keputusan');
  }
}

/**
 * Cairkan pembiayaan yang sudah disetujui: ubah status -> active,
 * lalu bangun jadwal cicilan sepanjang tenor.
 */
export async function disburseApplication(
  applicationId: string,
  reviewerId: string,
): Promise<LoanInstallment[]> {
  const supabase = await createServerClient();
  const app = await getLoanApplicationById(applicationId);
  if (!app) throw new Error('Pengajuan tidak ditemukan');
  if (app.status !== 'approved') {
    throw new Error('Hanya pengajuan berstatus disetujui yang bisa dicairkan');
  }

  const financed = app.amount;
  const totalRepayable = Math.round(financed * (1 + app.marginPct / 100));
  const tenor = Math.max(1, app.tenorMonths);
  const per = Math.floor(totalRepayable / tenor);
  const start = new Date();

  const rows = Array.from({ length: tenor }, (_, i) => ({
    application_id: applicationId,
    installment_no: i + 1,
    due_date: addMonths(start, i + 1),
    // Cicilan terakhir menyerap sisa pembulatan
    amount: i === tenor - 1 ? totalRepayable - per * (tenor - 1) : per,
  }));

  const { data, error } = await supabase
    .from('loan_installments')
    .insert(rows)
    .select('id, application_id, installment_no, due_date, amount, paid_amount, status, paid_at');

  if (error) {
    console.error('[finance/lifecycle] Gagal membuat jadwal cicilan:', error);
    throw new Error(error.message || 'Gagal membuat jadwal cicilan');
  }

  await supabase
    .from('loan_applications')
    .update({ status: 'active', disbursed_at: new Date().toISOString(), reviewed_by: reviewerId })
    .eq('id', applicationId);

  return (data as InstallmentRow[]).map(mapInstallment);
}

export async function getInstallments(applicationId: string): Promise<LoanInstallment[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('loan_installments')
    .select('id, application_id, installment_no, due_date, amount, paid_amount, status, paid_at')
    .eq('application_id', applicationId)
    .order('installment_no', { ascending: true });

  if (error) {
    console.error('[finance/lifecycle] Gagal mengambil cicilan:', error);
    throw new Error('Gagal mengambil jadwal cicilan');
  }
  return (data as InstallmentRow[]).map(mapInstallment);
}

/**
 * Catat pembayaran satu cicilan. Bila seluruh cicilan lunas, pengajuan
 * otomatis menjadi 'settled' dan kepemilikan aset diserahkan ke anggota.
 */
export async function recordRepayment(
  installmentId: string,
): Promise<{ installment: LoanInstallment; settled: boolean }> {
  const supabase = await createServerClient();

  const { data: instData, error: instErr } = await supabase
    .from('loan_installments')
    .select('id, application_id, installment_no, due_date, amount, paid_amount, status, paid_at')
    .eq('id', installmentId)
    .maybeSingle();

  if (instErr || !instData) throw new Error('Cicilan tidak ditemukan');
  const current = instData as InstallmentRow;

  const { data: updated, error: updErr } = await supabase
    .from('loan_installments')
    .update({ paid_amount: current.amount, status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', installmentId)
    .select('id, application_id, installment_no, due_date, amount, paid_amount, status, paid_at')
    .single();

  if (updErr || !updated) {
    console.error('[finance/lifecycle] Gagal mencatat pembayaran:', updErr);
    throw new Error('Gagal mencatat pembayaran cicilan');
  }

  // Lunas? cek sisa cicilan yang belum dibayar
  const { count } = await supabase
    .from('loan_installments')
    .select('id', { count: 'exact', head: true })
    .eq('application_id', current.application_id)
    .neq('status', 'paid');

  let settled = false;
  if ((count ?? 0) === 0) {
    const now = new Date().toISOString();
    await supabase
      .from('loan_applications')
      .update({ status: 'settled', settled_at: now, asset_transferred_at: now })
      .eq('id', current.application_id);
    settled = true;
  }

  return { installment: mapInstallment(updated as InstallmentRow), settled };
}
