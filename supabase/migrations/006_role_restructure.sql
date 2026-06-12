-- ============================================================
-- Migration 006 — Role Restructure & Invite System
-- ============================================================
-- Role lama: 'admin' | 'pengurus' | 'kasir' | 'anggota'
-- Role baru: 'ketua' | 'wakil_ketua' | 'bendahara' | 'operator'
--           | 'kasir' | 'anggota' | 'mitra' | 'dinas'
-- ============================================================


-- ============================================================
-- STEP 1: Update members table
-- ============================================================

-- Drop constraint lama
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;

-- Tambah kolom baru
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS status    TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending')),
  ADD COLUMN IF NOT EXISTS phone     TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Migrasi data: role lama → role baru
UPDATE members SET role = 'ketua'    WHERE role = 'admin';
UPDATE members SET role = 'operator' WHERE role = 'pengurus';

-- Pasang constraint baru
ALTER TABLE members ADD CONSTRAINT members_role_check
  CHECK (role IN ('ketua','wakil_ketua','bendahara','operator','kasir','anggota','mitra','dinas'));


-- ============================================================
-- STEP 2: Buat tabel member_invites
-- ============================================================

CREATE TABLE IF NOT EXISTS member_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  tenant_id   UUID        NOT NULL REFERENCES tenants ON DELETE CASCADE,
  role        TEXT        NOT NULL
    CHECK (role IN ('ketua','wakil_ketua','bendahara','operator','kasir','mitra','dinas')),
  created_by  UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  note        TEXT,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  used_at     TIMESTAMPTZ,
  used_by     UUID        REFERENCES auth.users ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- STEP 3: Update fungsi helper
-- ============================================================

-- is_member_of: hanya member AKTIF yang lolos
CREATE OR REPLACE FUNCTION is_member_of(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE user_id   = auth.uid()
      AND tenant_id = p_tenant_id
      AND status    = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- has_role_in: tidak berubah (sudah pakai ANY), tetap berlaku


-- ============================================================
-- STEP 4: Update RLS — tenants
-- ============================================================

DROP POLICY IF EXISTS "tenants_update_admin" ON tenants;

CREATE POLICY "tenants_update_ketua"
  ON tenants FOR UPDATE
  TO authenticated
  USING     (has_role_in(id, 'ketua', 'wakil_ketua'))
  WITH CHECK (has_role_in(id, 'ketua', 'wakil_ketua'));


-- ============================================================
-- STEP 5: Update RLS — members
-- ============================================================

DROP POLICY IF EXISTS "members_insert_admin"  ON members;
DROP POLICY IF EXISTS "members_delete_admin"  ON members;

-- Insert: ketua/wakil/operator bisa tambah member via invite
--         anggota bisa daftarkan diri sendiri (status pending)
CREATE POLICY "members_insert_privileged"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role_in(tenant_id, 'ketua', 'wakil_ketua', 'operator')
    OR (role = 'anggota' AND status = 'pending' AND user_id = auth.uid())
  );

-- Update: ketua/wakil/operator bisa approve/nonaktifkan member
CREATE POLICY "members_update_privileged"
  ON members FOR UPDATE
  TO authenticated
  USING     (has_role_in(tenant_id, 'ketua', 'wakil_ketua', 'operator'))
  WITH CHECK (has_role_in(tenant_id, 'ketua', 'wakil_ketua', 'operator'));

-- Delete: hanya ketua/wakil
CREATE POLICY "members_delete_privileged"
  ON members FOR DELETE
  TO authenticated
  USING (has_role_in(tenant_id, 'ketua', 'wakil_ketua'));


-- ============================================================
-- STEP 6: Update RLS — stock_batches
-- ============================================================

DROP POLICY IF EXISTS "stock_batches_insert_kasir_up"       ON stock_batches;
DROP POLICY IF EXISTS "stock_batches_update_kasir_up"       ON stock_batches;
DROP POLICY IF EXISTS "stock_batches_delete_pengurus_up"    ON stock_batches;

CREATE POLICY "stock_batches_insert_kasir_up"
  ON stock_batches FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in(tenant_id, 'ketua','wakil_ketua','bendahara','operator','kasir'));

CREATE POLICY "stock_batches_update_kasir_up"
  ON stock_batches FOR UPDATE
  TO authenticated
  USING     (has_role_in(tenant_id, 'ketua','wakil_ketua','bendahara','operator','kasir'))
  WITH CHECK (has_role_in(tenant_id, 'ketua','wakil_ketua','bendahara','operator','kasir'));

CREATE POLICY "stock_batches_delete_privileged"
  ON stock_batches FOR DELETE
  TO authenticated
  USING (has_role_in(tenant_id, 'ketua','wakil_ketua','operator'));


-- ============================================================
-- STEP 7: Update RLS — scan_records
-- ============================================================

DROP POLICY IF EXISTS "scan_records_insert_kasir_up" ON scan_records;

CREATE POLICY "scan_records_insert_kasir_up"
  ON scan_records FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in(tenant_id, 'ketua','wakil_ketua','operator','kasir'));


-- ============================================================
-- STEP 8: Update RLS — loan_applications
-- ============================================================

DROP POLICY IF EXISTS "loan_applications_select_pengurus" ON loan_applications;
DROP POLICY IF EXISTS "loan_applications_update_pengurus" ON loan_applications;

-- Ketua/wakil/bendahara/operator bisa lihat semua pengajuan ke koperasinya
CREATE POLICY "loan_applications_select_internal"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (has_role_in(target_tenant_id, 'ketua','wakil_ketua','bendahara','operator'));

-- Hanya ketua/wakil/bendahara yang bisa ubah status pengajuan
CREATE POLICY "loan_applications_update_internal"
  ON loan_applications FOR UPDATE
  TO authenticated
  USING     (has_role_in(target_tenant_id, 'ketua','wakil_ketua','bendahara'))
  WITH CHECK (has_role_in(target_tenant_id, 'ketua','wakil_ketua','bendahara'));


-- ============================================================
-- STEP 9: Update loan_validator_decisions
-- ============================================================

ALTER TABLE loan_validator_decisions
  DROP CONSTRAINT IF EXISTS loan_validator_decisions_validator_type_check;

ALTER TABLE loan_validator_decisions
  ADD CONSTRAINT loan_validator_decisions_validator_type_check
  CHECK (validator_type IN ('bendahara','ketua','wakil_ketua','dinas'));

-- Update enforce_validator_order untuk role baru
CREATE OR REPLACE FUNCTION enforce_validator_order()
RETURNS TRIGGER AS $$
DECLARE
  app_status TEXT;
BEGIN
  SELECT status INTO app_status
  FROM loan_applications WHERE id = NEW.application_id;

  IF NEW.validator_type = 'dinas'
     AND app_status <> 'pending_dinas' THEN
    RAISE EXCEPTION
      'Validator dinas hanya bisa memutuskan saat status pending_dinas. Status saat ini: %',
      app_status;
  END IF;

  IF NEW.validator_type IN ('bendahara','ketua','wakil_ketua')
     AND app_status NOT IN ('pending','pending_pengurus') THEN
    RAISE EXCEPTION
      'Validator internal hanya bisa memutuskan saat status pending/pending_pengurus. Status saat ini: %',
      app_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop policies lama
DROP POLICY IF EXISTS "validator_decisions_select_pengurus" ON loan_validator_decisions;
DROP POLICY IF EXISTS "validator_decisions_insert_pengurus" ON loan_validator_decisions;

CREATE POLICY "validator_decisions_select_internal"
  ON loan_validator_decisions FOR SELECT
  TO authenticated
  USING (has_role_in(tenant_id, 'ketua','wakil_ketua','bendahara','dinas'));

CREATE POLICY "validator_decisions_insert_internal"
  ON loan_validator_decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    validator_id = auth.uid()
    AND (
      (validator_type IN ('bendahara','ketua','wakil_ketua')
       AND has_role_in(tenant_id, 'ketua','wakil_ketua','bendahara'))
      OR
      (validator_type = 'dinas'
       AND has_role_in(tenant_id, 'dinas'))
    )
  );


-- ============================================================
-- STEP 10: Update RLS — procurement
-- ============================================================

DROP POLICY IF EXISTS "joint_procurements_insert_pengurus"        ON joint_procurements;
DROP POLICY IF EXISTS "joint_procurements_update_pengurus"        ON joint_procurements;
DROP POLICY IF EXISTS "procurement_allocations_insert_pengurus"   ON procurement_allocations;
DROP POLICY IF EXISTS "procurement_allocations_update_pengurus"   ON procurement_allocations;

CREATE POLICY "joint_procurements_insert_privileged"
  ON joint_procurements FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in(initiated_by, 'ketua','wakil_ketua','operator'));

CREATE POLICY "joint_procurements_update_privileged"
  ON joint_procurements FOR UPDATE
  TO authenticated
  USING     (has_role_in(initiated_by, 'ketua','wakil_ketua','operator'))
  WITH CHECK (has_role_in(initiated_by, 'ketua','wakil_ketua','operator'));

CREATE POLICY "procurement_allocations_insert_privileged"
  ON procurement_allocations FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in(tenant_id, 'ketua','wakil_ketua','operator'));

CREATE POLICY "procurement_allocations_update_privileged"
  ON procurement_allocations FOR UPDATE
  TO authenticated
  USING     (has_role_in(tenant_id, 'ketua','wakil_ketua','operator'))
  WITH CHECK (has_role_in(tenant_id, 'ketua','wakil_ketua','operator'));


-- ============================================================
-- STEP 11: RLS untuk member_invites
-- ============================================================

ALTER TABLE member_invites ENABLE ROW LEVEL SECURITY;

-- Ketua/wakil/operator bisa lihat daftar invite koperasinya
CREATE POLICY "member_invites_select"
  ON member_invites FOR SELECT
  TO authenticated
  USING (has_role_in(tenant_id, 'ketua','wakil_ketua','operator'));

-- Ketua/wakil bisa invite semua role
-- Operator hanya bisa invite kasir, mitra, dinas
CREATE POLICY "member_invites_insert"
  ON member_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      has_role_in(tenant_id, 'ketua','wakil_ketua')
      OR (
        has_role_in(tenant_id, 'operator')
        AND role IN ('kasir','mitra','dinas')
      )
    )
  );

-- Ketua/wakil bisa hapus invite yang belum dipakai
CREATE POLICY "member_invites_delete"
  ON member_invites FOR DELETE
  TO authenticated
  USING (
    has_role_in(tenant_id, 'ketua','wakil_ketua')
    AND used_at IS NULL
  );
