-- ============================================================
-- Migration 007 — Pembiayaan Berbasis Aset (Asset-Backed Financing)
-- ============================================================
-- Mekanisme: anggota mengajukan pembiayaan untuk membeli aset
-- pertanian (mis. traktor mini). Koperasi membeli aset; aset tetap
-- atas nama koperasi sampai cicilan lunas, lalu kepemilikan
-- diserahkan ke anggota.
--
-- Idempoten — aman dijalankan ulang.
-- ============================================================


-- ============================================================
-- STEP 1: Perbaiki sync_loan_status_after_decision
-- (006 mengubah enforce_validator_order tapi LUPA fungsi ini —
--  akibatnya persetujuan internal tidak pernah memindah status)
-- Model disederhanakan jadi satu tahap: persetujuan internal
-- (bendahara/ketua/wakil) langsung -> 'approved'.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_loan_status_after_decision()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verdict = 'rejected' THEN
    UPDATE loan_applications
    SET status = 'rejected', reviewed_by = NEW.validator_id, reviewed_at = NEW.decided_at
    WHERE id = NEW.application_id;

  ELSIF NEW.verdict = 'approved'
        AND NEW.validator_type IN ('bendahara','ketua','wakil_ketua','dinas') THEN
    UPDATE loan_applications
    SET status = 'approved', reviewed_by = NEW.validator_id, reviewed_at = NEW.decided_at
    WHERE id = NEW.application_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- STEP 2: Kolom aset & siklus hidup pada loan_applications
-- ============================================================

ALTER TABLE loan_applications
  ADD COLUMN IF NOT EXISTS financing_type       TEXT          NOT NULL DEFAULT 'asset'
    CHECK (financing_type IN ('asset','cash')),
  ADD COLUMN IF NOT EXISTS asset_name           TEXT,
  ADD COLUMN IF NOT EXISTS asset_category        TEXT,
  ADD COLUMN IF NOT EXISTS asset_price           DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS vendor_name           TEXT,
  ADD COLUMN IF NOT EXISTS down_payment          DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tenor_months          INTEGER       NOT NULL DEFAULT 12
    CHECK (tenor_months BETWEEN 1 AND 60),
  ADD COLUMN IF NOT EXISTS margin_pct            DECIMAL(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settled_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS asset_transferred_at  TIMESTAMPTZ;

-- Perluas status: tambah 'active' (cicilan berjalan) & 'settled' (lunas + aset diserahkan)
ALTER TABLE loan_applications DROP CONSTRAINT IF EXISTS loan_applications_status_check;
ALTER TABLE loan_applications ADD CONSTRAINT loan_applications_status_check
  CHECK (status IN (
    'pending','pending_pengurus','pending_dinas',
    'approved','rejected','disbursed','active','settled'
  ));


-- ============================================================
-- STEP 3: Tabel loan_installments (jadwal cicilan)
-- ============================================================

CREATE TABLE IF NOT EXISTS loan_installments (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID           NOT NULL REFERENCES loan_applications ON DELETE CASCADE,
  installment_no  INTEGER        NOT NULL CHECK (installment_no > 0),
  due_date        DATE           NOT NULL,
  amount          DECIMAL(15,2)  NOT NULL CHECK (amount >= 0),
  paid_amount     DECIMAL(15,2)  NOT NULL DEFAULT 0,
  status          TEXT           NOT NULL DEFAULT 'scheduled'
                                 CHECK (status IN ('scheduled','paid','overdue')),
  paid_at         TIMESTAMPTZ,
  blockchain_tx   TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  UNIQUE (application_id, installment_no)
);

CREATE INDEX IF NOT EXISTS idx_installments_application ON loan_installments(application_id);
CREATE INDEX IF NOT EXISTS idx_installments_due        ON loan_installments(due_date);


-- ============================================================
-- STEP 4: RLS untuk loan_installments
-- ============================================================

ALTER TABLE loan_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "installments_select" ON loan_installments;
DROP POLICY IF EXISTS "installments_insert_internal" ON loan_installments;
DROP POLICY IF EXISTS "installments_update_internal" ON loan_installments;

-- Pemohon lihat cicilannya sendiri; pengurus internal lihat cicilan koperasinya
CREATE POLICY "installments_select"
  ON loan_installments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM loan_applications la
    WHERE la.id = application_id
      AND (
        la.applicant_id = auth.uid()
        OR has_role_in(la.target_tenant_id, 'ketua','wakil_ketua','bendahara','operator')
      )
  ));

-- Hanya ketua/wakil/bendahara koperasi tujuan yang bisa membuat jadwal cicilan
CREATE POLICY "installments_insert_internal"
  ON loan_installments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM loan_applications la
    WHERE la.id = application_id
      AND has_role_in(la.target_tenant_id, 'ketua','wakil_ketua','bendahara')
  ));

-- Dan mencatat pembayaran cicilan
CREATE POLICY "installments_update_internal"
  ON loan_installments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM loan_applications la
    WHERE la.id = application_id
      AND has_role_in(la.target_tenant_id, 'ketua','wakil_ketua','bendahara')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM loan_applications la
    WHERE la.id = application_id
      AND has_role_in(la.target_tenant_id, 'ketua','wakil_ketua','bendahara')
  ));
