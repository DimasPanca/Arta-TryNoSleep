-- ============================================================
-- Migration 001 — Initial Schema
-- Arta: Platform Digitalisasi Koperasi Multi-Tenant
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- HELPER: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: tenants
-- Satu baris = satu koperasi
-- ============================================================

CREATE TABLE tenants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('sayuran', 'simpan_pinjam', 'pupuk', 'umum')),
  description TEXT,
  address     TEXT,
  phone       TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLE: members
-- Anggota koperasi; satu user bisa di banyak koperasi
-- ============================================================

CREATE TABLE members (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  tenant_id UUID        NOT NULL REFERENCES tenants    ON DELETE CASCADE,
  role      TEXT        NOT NULL CHECK (role IN ('admin', 'pengurus', 'kasir', 'anggota')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

-- ============================================================
-- TABLE: stock_batches
-- Satu baris = satu batch sayuran masuk gudang
-- ============================================================

CREATE TABLE stock_batches (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID           NOT NULL REFERENCES tenants     ON DELETE CASCADE,
  commodity     TEXT           NOT NULL,
  quantity_kg   DECIMAL(10,2)  NOT NULL CHECK (quantity_kg > 0),
  grade         TEXT           CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  quality_score INTEGER        CHECK (quality_score BETWEEN 0 AND 100),
  storage_type  TEXT           NOT NULL DEFAULT 'ambient'
                               CHECK (storage_type IN ('ambient', 'cold')),
  status        TEXT           NOT NULL DEFAULT 'available'
                               CHECK (status IN ('available', 'reserved', 'dispatched', 'expired')),
  farmer_id     UUID,
  received_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  notes         TEXT,
  blockchain_tx TEXT,
  created_by    UUID           REFERENCES auth.users,
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TRIGGER set_stock_batches_updated_at
  BEFORE UPDATE ON stock_batches
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLE: scan_records
-- Setiap scan kualitas tersimpan permanen (tidak pernah dihapus)
-- ============================================================

CREATE TABLE scan_records (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID        REFERENCES stock_batches ON DELETE SET NULL,
  tenant_id         UUID        NOT NULL REFERENCES tenants ON DELETE CASCADE,
  grade             TEXT        NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  quality_score     INTEGER     NOT NULL CHECK (quality_score BETWEEN 0 AND 100),
  defects           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  color_ripeness    TEXT        NOT NULL CHECK (color_ripeness IN ('unripe', 'semi_ripe', 'ripe', 'overripe')),
  surface_condition TEXT        NOT NULL CHECK (surface_condition IN ('clean', 'minor_blemish', 'moderate_damage', 'severe_damage')),
  size_estimate     TEXT        NOT NULL CHECK (size_estimate IN ('small', 'medium', 'large')),
  confidence        TEXT        NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  reasoning         TEXT,
  image_hash        TEXT,
  consensus_data    JSONB,
  scanned_by        UUID        REFERENCES auth.users,
  scanned_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
