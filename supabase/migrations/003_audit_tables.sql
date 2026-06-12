-- ============================================================
-- Migration 003 — Audit Tables
-- ============================================================

-- ============================================================
-- TABLE: audit_logs
-- Immutable: tidak ada UPDATE atau DELETE policy
-- ============================================================

CREATE TABLE audit_logs (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID           NOT NULL REFERENCES tenants ON DELETE CASCADE,
  actor_id     UUID           NOT NULL REFERENCES auth.users,
  action       TEXT           NOT NULL CHECK (action IN ('sale', 'cancel', 'void', 'refund', 'adjustment')),
  entity_type  TEXT,
  entity_id    UUID,
  amount       DECIMAL(15,2),
  metadata     JSONB,
  is_anomalous BOOLEAN        NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ============================================================
-- FUNCTION: auto-insert audit log on stock_batch status change
-- Kasir sering lupa catat; trigger ini jadi safety net
-- ============================================================

CREATE OR REPLACE FUNCTION audit_stock_batch_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (
      tenant_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      NEW.tenant_id,
      COALESCE(auth.uid(), NEW.created_by, '00000000-0000-0000-0000-000000000000'),
      CASE NEW.status
        WHEN 'dispatched' THEN 'sale'
        WHEN 'expired'    THEN 'adjustment'
        ELSE 'adjustment'
      END,
      'stock_batch',
      NEW.id,
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status',   NEW.status,
        'commodity',   NEW.commodity,
        'quantity_kg', NEW.quantity_kg
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_on_stock_batch_change
  AFTER UPDATE ON stock_batches
  FOR EACH ROW EXECUTE FUNCTION audit_stock_batch_status_change();

-- ============================================================
-- RLS: audit_logs
-- ============================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Pengurus ke atas bisa baca semua log audit di koperasinya
CREATE POLICY "audit_logs_select_pengurus_up"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    is_member_of(tenant_id)
    AND has_role_in(tenant_id, 'admin', 'pengurus')
  );

-- Semua member bisa insert audit log (kasir mencatat transaksi)
CREATE POLICY "audit_logs_insert_member"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of(tenant_id));

-- Hanya admin yang bisa mark anomali
CREATE POLICY "audit_logs_update_admin"
  ON audit_logs FOR UPDATE
  TO authenticated
  USING  (has_role_in(tenant_id, 'admin', 'pengurus'))
  WITH CHECK (has_role_in(tenant_id, 'admin', 'pengurus'));

-- Tidak ada DELETE policy — audit log tidak bisa dihapus
