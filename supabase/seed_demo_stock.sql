-- ============================================================
-- Seed: Data stok demo untuk "Koperasi Demo Arta"
-- Jalankan di Supabase SQL Editor (idempoten — aman diulang).
-- Memberi data agar halaman /stock tampil kaya saat login demo.
-- ============================================================
--
--  Tenant: 11111111-1111-1111-1111-111111111111
--  Penanda: notes = 'seed-demo' (dipakai untuk reset)
-- ============================================================

-- Hapus seed lama agar tidak menumpuk saat dijalankan ulang.
DELETE FROM stock_batches
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
  AND notes = 'seed-demo';

INSERT INTO stock_batches
  (tenant_id, commodity, quantity_kg, grade, quality_score, storage_type, status, received_at, expires_at, notes)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  v.commodity,
  v.qty,
  v.grade,
  v.score,
  v.storage,
  v.status,
  now() - (v.recv_days || ' days')::interval,
  CASE WHEN v.exp_days IS NULL THEN NULL
       ELSE now() + (v.exp_days || ' days')::interval END,
  'seed-demo'
FROM (VALUES
  -- commodity,         qty,  grade, score, storage,   status,       recv_days, exp_days
  ('Tomat merah',        320,  'A',   91,   'cold',    'available',   1,   5),
  ('Cabai merah keriting',145, 'A',   88,   'cold',    'available',   2,   3),
  ('Cabai rawit',         58,  'C',   61,   'ambient', 'available',   6,   1),
  ('Bayam hijau',         60,  'B',   76,   'ambient', 'available',   1,   2),
  ('Kangkung',            48,  'B',   79,   'ambient', 'reserved',    3,   1),
  ('Wortel',             210,  'A',   90,   'cold',    'available',   5,  11),
  ('Kubis',              175,  'C',   64,   'ambient', 'available',   4,   0),
  ('Selada keriting',     35,  'D',   48,   'cold',    'expired',     9,  -2),
  ('Terong ungu',         92,  'B',   81,   'ambient', 'dispatched',  8,  NULL),
  ('Timun',              130,  'A',   86,   'cold',    'available',   2,   7),
  ('Brokoli',             64,  'B',   78,   'cold',    'available',   3,   4),
  ('Sawi hijau',          40,  'C',   59,   'ambient', 'available',   5,  -1),
  ('Kentang granola',    260,  'A',   89,   'ambient', 'available',   7,  20),
  ('Bawang merah',       180,  'B',   74,   'ambient', 'reserved',    6,  14),
  ('Buncis',              52,  'C',   63,   'ambient', 'available',   4,   2),
  ('Jagung manis',       120,  'A',   85,   'cold',    'dispatched', 10,  NULL)
) AS v(commodity, qty, grade, score, storage, status, recv_days, exp_days);

-- Ringkasan hasil seed
SELECT status, count(*) AS jumlah_batch, sum(quantity_kg) AS total_kg
FROM stock_batches
WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND notes = 'seed-demo'
GROUP BY status
ORDER BY status;

-- ============================================================
-- RESET (buang komentar untuk menghapus seed):
-- DELETE FROM stock_batches
-- WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND notes = 'seed-demo';
-- ============================================================
