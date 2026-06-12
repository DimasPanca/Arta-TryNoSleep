-- ============================================================
-- Migration 002 — Row Level Security Policies
-- ============================================================
-- Prinsip:
--   • Setiap tenant hanya bisa akses datanya sendiri
--   • Cross-tenant read hanya untuk kredit scoring (loan_applications)
--     dan dilakukan oleh pengurus/admin
--   • Semua tabel wajib RLS enabled — tidak ada tabel tanpa policy
-- ============================================================

-- ============================================================
-- HELPER: cek apakah user adalah member aktif di tenant
-- ============================================================

CREATE OR REPLACE FUNCTION is_member_of(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE user_id   = auth.uid()
      AND tenant_id = p_tenant_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Cek apakah user punya role tertentu di tenant
CREATE OR REPLACE FUNCTION has_role_in(p_tenant_id UUID, VARIADIC p_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE user_id   = auth.uid()
      AND tenant_id = p_tenant_id
      AND role      = ANY(p_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS: tenants
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Semua member bisa baca daftar koperasi (dibutuhkan untuk cross-tenant display)
CREATE POLICY "tenants_select_authenticated"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

-- Hanya admin koperasi itu sendiri yang bisa update
CREATE POLICY "tenants_update_admin"
  ON tenants FOR UPDATE
  TO authenticated
  USING (has_role_in(id, 'admin'))
  WITH CHECK (has_role_in(id, 'admin'));

-- ============================================================
-- RLS: members
-- ============================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Member bisa lihat sesama member di koperasinya
CREATE POLICY "members_select_same_tenant"
  ON members FOR SELECT
  TO authenticated
  USING (is_member_of(tenant_id));

-- Hanya admin yang bisa tambah/hapus member
CREATE POLICY "members_insert_admin"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in(tenant_id, 'admin'));

CREATE POLICY "members_delete_admin"
  ON members FOR DELETE
  TO authenticated
  USING (has_role_in(tenant_id, 'admin'));

-- ============================================================
-- RLS: stock_batches
-- ============================================================

ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_batches_select_member"
  ON stock_batches FOR SELECT
  TO authenticated
  USING (is_member_of(tenant_id));

CREATE POLICY "stock_batches_insert_kasir_up"
  ON stock_batches FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in(tenant_id, 'admin', 'pengurus', 'kasir'));

CREATE POLICY "stock_batches_update_kasir_up"
  ON stock_batches FOR UPDATE
  TO authenticated
  USING  (has_role_in(tenant_id, 'admin', 'pengurus', 'kasir'))
  WITH CHECK (has_role_in(tenant_id, 'admin', 'pengurus', 'kasir'));

-- Hanya admin/pengurus yang bisa hapus batch
CREATE POLICY "stock_batches_delete_pengurus_up"
  ON stock_batches FOR DELETE
  TO authenticated
  USING (has_role_in(tenant_id, 'admin', 'pengurus'));

-- ============================================================
-- RLS: scan_records
-- ============================================================

ALTER TABLE scan_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scan_records_select_member"
  ON scan_records FOR SELECT
  TO authenticated
  USING (is_member_of(tenant_id));

-- Kasir ke atas boleh buat scan record
CREATE POLICY "scan_records_insert_kasir_up"
  ON scan_records FOR INSERT
  TO authenticated
  WITH CHECK (has_role_in(tenant_id, 'admin', 'pengurus', 'kasir'));

-- Scan record tidak pernah diupdate atau dihapus (immutable)
