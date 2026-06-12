-- ============================================================
-- Migration 005 — Performance Indexes
-- ============================================================
-- Setiap index ada alasannya:
--   • FK indexes: Supabase/PG tidak auto-index FK
--   • Compound indexes: query paling sering dijalankan
--   • Partial indexes: filter status yang paling sering dipakai
-- ============================================================

-- ============================================================
-- members
-- ============================================================

-- Lookup member by user_id (login, auth checks)
CREATE INDEX idx_members_user_id
  ON members (user_id);

-- Lookup semua member di satu tenant (halaman kelola anggota)
CREATE INDEX idx_members_tenant_id
  ON members (tenant_id);

-- ============================================================
-- stock_batches
-- ============================================================

-- Semua query stok utama: filter by tenant + status
CREATE INDEX idx_stock_batches_tenant_status
  ON stock_batches (tenant_id, status);

-- Filter by grade untuk quality report
CREATE INDEX idx_stock_batches_tenant_grade
  ON stock_batches (tenant_id, grade);

-- Lookup batch yang mendekati expired (cron job / scheduler)
CREATE INDEX idx_stock_batches_expires_at
  ON stock_batches (expires_at)
  WHERE expires_at IS NOT NULL AND status = 'available';

-- Cold storage capacity query: hanya batch cold + available
CREATE INDEX idx_stock_batches_cold_storage
  ON stock_batches (tenant_id, quantity_kg)
  WHERE storage_type = 'cold' AND status = 'available';

-- ============================================================
-- scan_records
-- ============================================================

-- Cache lookup: cari hasil scan sebelumnya by image hash
CREATE INDEX idx_scan_records_image_hash
  ON scan_records (image_hash)
  WHERE image_hash IS NOT NULL;

-- Riwayat scan per batch
CREATE INDEX idx_scan_records_batch_id
  ON scan_records (batch_id)
  WHERE batch_id IS NOT NULL;

-- Scan records per tenant (halaman riwayat scan)
CREATE INDEX idx_scan_records_tenant_scanned_at
  ON scan_records (tenant_id, scanned_at DESC);

-- ============================================================
-- loan_applications
-- ============================================================

-- Pengajuan oleh satu applicant (halaman history peminjam)
CREATE INDEX idx_loan_applications_applicant_id
  ON loan_applications (applicant_id);

-- Pengajuan masuk ke satu koperasi (halaman review pengurus)
CREATE INDEX idx_loan_applications_target_tenant
  ON loan_applications (target_tenant_id, status);

-- Pengajuan pending yang butuh aksi (dashboard notifikasi)
CREATE INDEX idx_loan_applications_pending
  ON loan_applications (target_tenant_id, created_at DESC)
  WHERE status IN ('pending_pengurus', 'pending_dinas');

-- ============================================================
-- loan_validator_decisions
-- ============================================================

-- Semua keputusan untuk satu pengajuan
CREATE INDEX idx_validator_decisions_application
  ON loan_validator_decisions (application_id, decided_at);

-- Keputusan per tenant (laporan aktivitas validator)
CREATE INDEX idx_validator_decisions_tenant
  ON loan_validator_decisions (tenant_id, decided_at DESC);

-- ============================================================
-- audit_logs
-- ============================================================

-- Query utama: semua log per tenant, urut by waktu
CREATE INDEX idx_audit_logs_tenant_created_at
  ON audit_logs (tenant_id, created_at DESC);

-- Filter per aktor (investigasi kasir)
CREATE INDEX idx_audit_logs_actor
  ON audit_logs (tenant_id, actor_id, created_at DESC);

-- Filter anomali saja (alert dashboard)
CREATE INDEX idx_audit_logs_anomalous
  ON audit_logs (tenant_id, created_at DESC)
  WHERE is_anomalous = true;

-- ============================================================
-- joint_procurements
-- ============================================================

CREATE INDEX idx_joint_procurements_initiated_by
  ON joint_procurements (initiated_by, status);

-- ============================================================
-- procurement_allocations
-- ============================================================

CREATE INDEX idx_procurement_allocations_tenant
  ON procurement_allocations (tenant_id);

CREATE INDEX idx_procurement_allocations_procurement
  ON procurement_allocations (procurement_id);
