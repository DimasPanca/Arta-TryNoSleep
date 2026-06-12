-- ============================================================
-- 008_joint_procurement.sql
-- Perkaya pengadaan bersama lintas koperasi:
--   - tambah tahap status 'open' & 'purchasing'
--   - kolom satuan, supplier, target, tier harga, jejak blockchain
--   - kolom kebutuhan-diminta & tipe peserta (internal/external)
-- Idempoten & aman dijalankan setelah 004 + 006.
-- ============================================================

-- ── joint_procurements: status baru ─────────────────────────
ALTER TABLE joint_procurements DROP CONSTRAINT IF EXISTS joint_procurements_status_check;
ALTER TABLE joint_procurements
  ADD CONSTRAINT joint_procurements_status_check
  CHECK (status IN ('planning', 'open', 'confirmed', 'purchasing', 'delivered', 'closed'));

-- ── joint_procurements: kolom tambahan ──────────────────────
ALTER TABLE joint_procurements ADD COLUMN IF NOT EXISTS unit          TEXT;
ALTER TABLE joint_procurements ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE joint_procurements ADD COLUMN IF NOT EXISTS target_date   TIMESTAMPTZ;
ALTER TABLE joint_procurements ADD COLUMN IF NOT EXISTS blockchain_tx TEXT;
-- Tier harga volume supplier: [{ "minQty": n, "unitPrice": n, "label": "" }, ...]
ALTER TABLE joint_procurements ADD COLUMN IF NOT EXISTS pricing_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ── procurement_allocations: kolom tambahan ─────────────────
-- requested_kg: kebutuhan yang diminta (alokasi final = quantity_kg, bisa < requested saat over-subscribed)
ALTER TABLE procurement_allocations ADD COLUMN IF NOT EXISTS requested_kg DECIMAL(10,2);

-- participant_type: 'internal' (punya akun di sistem) | 'external' (konfirmasi/bayar manual)
ALTER TABLE procurement_allocations DROP CONSTRAINT IF EXISTS procurement_allocations_participant_type_check;
ALTER TABLE procurement_allocations
  ADD COLUMN IF NOT EXISTS participant_type TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE procurement_allocations
  ADD CONSTRAINT procurement_allocations_participant_type_check
  CHECK (participant_type IN ('internal', 'external'));

-- Backfill requested_kg = quantity_kg untuk baris lama
UPDATE procurement_allocations SET requested_kg = quantity_kg WHERE requested_kg IS NULL;

-- ── Indeks bantu ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_joint_procurements_status   ON joint_procurements (status);
CREATE INDEX IF NOT EXISTS idx_joint_procurements_initiator ON joint_procurements (initiated_by);
