-- ============================================================
-- Migration 004 — Finance Tables
-- Meliputi: loan_applications, loan_validator_decisions
-- ============================================================

-- ============================================================
-- TABLE: loan_applications
-- Status flow:
--   pending → (auto evaluate) →
--     rejected (auto)
--     pending_pengurus → approved/rejected (pengurus)
--       pending_dinas   → approved/rejected (dinas)
--         disbursed (manual setelah approved)
-- ============================================================

CREATE TABLE loan_applications (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id      UUID           NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  target_tenant_id  UUID           NOT NULL REFERENCES tenants    ON DELETE CASCADE,
  amount            DECIMAL(15,2)  NOT NULL CHECK (amount > 0),
  purpose           TEXT,
  status            TEXT           NOT NULL DEFAULT 'pending'
                                   CHECK (status IN (
                                     'pending',
                                     'pending_pengurus',
                                     'pending_dinas',
                                     'approved',
                                     'rejected',
                                     'disbursed'
                                   )),
  credit_score      INTEGER        CHECK (credit_score BETWEEN 0 AND 100),
  cross_tenant_data JSONB,
  auto_eval_result  JSONB,
  reviewed_by       UUID           REFERENCES auth.users,
  reviewed_at       TIMESTAMPTZ,
  blockchain_tx     TEXT,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TRIGGER set_loan_applications_updated_at
  BEFORE UPDATE ON loan_applications
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLE: loan_validator_decisions
-- Setiap keputusan validator tersimpan permanen
-- Urutan dijaga di level application: dinas hanya bisa
-- setelah status = 'pending_dinas' (dikontrol di chaincode)
-- ============================================================

CREATE TABLE loan_validator_decisions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID        NOT NULL REFERENCES loan_applications ON DELETE CASCADE,
  validator_id    UUID        NOT NULL REFERENCES auth.users,
  validator_type  TEXT        NOT NULL CHECK (validator_type IN ('pengurus', 'dinas')),
  tenant_id       UUID        NOT NULL REFERENCES tenants,
  verdict         TEXT        NOT NULL CHECK (verdict IN ('approved', 'rejected')),
  reason          TEXT,
  blockchain_tx   TEXT,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: joint_procurements
-- Pengadaan bersama antar koperasi
-- ============================================================

CREATE TABLE joint_procurements (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity      TEXT           NOT NULL,
  total_quantity DECIMAL(10,2)  NOT NULL CHECK (total_quantity > 0),
  unit_price     DECIMAL(10,2)  CHECK (unit_price >= 0),
  status         TEXT           NOT NULL DEFAULT 'planning'
                                CHECK (status IN ('planning', 'confirmed', 'delivered', 'closed')),
  initiated_by   UUID           NOT NULL REFERENCES tenants ON DELETE CASCADE,
  notes          TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TRIGGER set_joint_procurements_updated_at
  BEFORE UPDATE ON joint_procurements
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLE: procurement_allocations
-- Bug fix dari ARCHITECTURE.md: CHECK pakai payment_status,
-- bukan status (kolom yang tidak ada)
-- ============================================================

CREATE TABLE procurement_allocations (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_id  UUID           NOT NULL REFERENCES joint_procurements ON DELETE CASCADE,
  tenant_id       UUID           NOT NULL REFERENCES tenants            ON DELETE CASCADE,
  quantity_kg     DECIMAL(10,2)  NOT NULL CHECK (quantity_kg > 0),
  payment_status  TEXT           NOT NULL DEFAULT 'pending'
                                 CHECK (payment_status IN ('pending', 'paid')),
  confirmed_at    TIMESTAMPTZ,
  UNIQUE (procurement_id, tenant_id)
);

-- ============================================================
-- FUNCTION: enforce validator decision order
-- Pengurus harus approve sebelum dinas bisa memutuskan
-- ============================================================

CREATE OR REPLACE FUNCTION enforce_validator_order()
RETURNS TRIGGER AS $$
DECLARE
  app_status TEXT;
BEGIN
  SELECT status INTO app_status
  FROM loan_applications
  WHERE id = NEW.application_id;

  IF NEW.validator_type = 'dinas' AND app_status <> 'pending_dinas' THEN
    RAISE EXCEPTION 'Validator dinas hanya bisa memutuskan saat status pengajuan adalah pending_dinas. Status saat ini: %', app_status;
  END IF;

  IF NEW.validator_type = 'pengurus' AND app_status NOT IN ('pending', 'pending_pengurus') THEN
    RAISE EXCEPTION 'Validator pengurus hanya bisa memutuskan saat status pending atau pending_pengurus. Status saat ini: %', app_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_validator_order
  BEFORE INSERT ON loan_validator_decisions
  FOR EACH ROW EXECUTE FUNCTION enforce_validator_order();

-- ============================================================
-- FUNCTION: auto-update loan status setelah validator memutuskan
-- ============================================================

CREATE OR REPLACE FUNCTION sync_loan_status_after_decision()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verdict = 'rejected' THEN
    UPDATE loan_applications
    SET status      = 'rejected',
        reviewed_by = NEW.validator_id,
        reviewed_at = NEW.decided_at
    WHERE id = NEW.application_id;

  ELSIF NEW.verdict = 'approved' AND NEW.validator_type = 'pengurus' THEN
    UPDATE loan_applications
    SET status      = 'pending_dinas',
        reviewed_by = NEW.validator_id,
        reviewed_at = NEW.decided_at
    WHERE id = NEW.application_id;

  ELSIF NEW.verdict = 'approved' AND NEW.validator_type = 'dinas' THEN
    UPDATE loan_applications
    SET status      = 'approved',
        reviewed_by = NEW.validator_id,
        reviewed_at = NEW.decided_at
    WHERE id = NEW.application_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loan_status_on_decision
  AFTER INSERT ON loan_validator_decisions
  FOR EACH ROW EXECUTE FUNCTION sync_loan_status_after_decision();

-- ============================================================
-- RLS: loan_applications
-- ============================================================

ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- Pemohon bisa lihat pengajuannya sendiri
CREATE POLICY "loan_applications_select_applicant"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (applicant_id = auth.uid());

-- Pengurus/admin koperasi tujuan bisa lihat semua pengajuan ke koperasinya
CREATE POLICY "loan_applications_select_pengurus"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (has_role_in(target_tenant_id, 'admin', 'pengurus'));

-- Semua authenticated user bisa mengajukan pinjaman
CREATE POLICY "loan_applications_insert_authenticated"
  ON loan_applications FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id = auth.uid());

-- Pengurus/admin koperasi tujuan bisa update status
CREATE POLICY "loan_applications_update_pengurus"
  ON loan_applications FOR UPDATE
  TO authenticated
  USING  (has_role_in(target_tenant_id, 'admin', 'pengurus'))
  WITH CHECK (has_role_in(target_tenant_id, 'admin', 'pengurus'));

-- ============================================================
-- RLS: loan_validator_decisions
-- ============================================================

ALTER TABLE loan_validator_decisions ENABLE ROW LEVEL SECURITY;

-- Pemohon bisa lihat keputusan atas pengajuannya
CREATE POLICY "validator_decisions_select_applicant"
  ON loan_validator_decisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loan_applications la
      WHERE la.id = application_id
        AND la.applicant_id = auth.uid()
    )
  );

-- Pengurus/admin bisa lihat keputusan di koperasinya
CREATE POLICY "validator_decisions_select_pengurus"
  ON loan_validator_decisions FOR SELECT
  TO authenticated
  USING (has_role_in(tenant_id, 'admin', 'pengurus'));

-- Hanya pengurus/admin yang bisa insert keputusan
CREATE POLICY "validator_decisions_insert_pengurus"
  ON loan_validator_decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role_in(tenant_id, 'admin', 'pengurus')
    AND validator_id = auth.uid()
  );

-- Keputusan tidak bisa diubah atau dihapus (immutable)

-- ============================================================
-- RLS: joint_procurements
-- ============================================================

ALTER TABLE joint_procurements ENABLE ROW LEVEL SECURITY;

-- Semua member bisa lihat pengadaan bersama
CREATE POLICY "joint_procurements_select_member"
  ON joint_procurements FOR SELECT
  TO authenticated
  USING (
    is_member_of(initiated_by)
    OR EXISTS (
      SELECT 1 FROM procurement_allocations pa
      WHERE pa.procurement_id = id
        AND is_member_of(pa.tenant_id)
    )
  );

-- Pengurus/admin yang menginisiasi bisa create
CREATE POLICY "joint_procurements_insert_pengurus"
  ON joint_procurements FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in(initiated_by, 'admin', 'pengurus'));

-- Pengurus/admin inisiator bisa update status
CREATE POLICY "joint_procurements_update_pengurus"
  ON joint_procurements FOR UPDATE
  TO authenticated
  USING  (has_role_in(initiated_by, 'admin', 'pengurus'))
  WITH CHECK (has_role_in(initiated_by, 'admin', 'pengurus'));

-- ============================================================
-- RLS: procurement_allocations
-- ============================================================

ALTER TABLE procurement_allocations ENABLE ROW LEVEL SECURITY;

-- Tenant yang dialokasikan bisa lihat alokasi mereka
CREATE POLICY "procurement_allocations_select_member"
  ON procurement_allocations FOR SELECT
  TO authenticated
  USING (is_member_of(tenant_id));

-- Pengurus/admin bisa insert alokasi
CREATE POLICY "procurement_allocations_insert_pengurus"
  ON procurement_allocations FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in(tenant_id, 'admin', 'pengurus'));

-- Pengurus bisa update status pembayaran
CREATE POLICY "procurement_allocations_update_pengurus"
  ON procurement_allocations FOR UPDATE
  TO authenticated
  USING  (has_role_in(tenant_id, 'admin', 'pengurus'))
  WITH CHECK (has_role_in(tenant_id, 'admin', 'pengurus'));
