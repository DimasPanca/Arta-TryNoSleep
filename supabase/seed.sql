-- ============================================================
-- Seed Data — Development Only
-- Jalankan SETELAH semua migration
-- Jangan jalankan di production
-- ============================================================

-- ============================================================
-- Tenants — 5 Koperasi Studi Kasus Arta
  -- ID tetap (dipakai di relasi bawah):
  --   0001 = Padiwangi      (simpan_pinjam)
--   0002 = Melati Jaya    (sayuran)
--   0003 = Sumber Makmur  (pupuk)
--   0004 = Tirta Bersama  (simpan_pinjam)
--   0005 = Harapan Baru   (umum / ternak)
-- ============================================================

INSERT INTO tenants (id, name, type, description, address, phone) VALUES
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Koperasi Padiwangi',
    'simpan_pinjam',
    'Koperasi simpan pinjam dan distribusi beras. Pencatatan pengurus masih manual di Excel.',
    'Jl. Raya Padalarang No. 12, Bandung Barat',
    '022-60123456'
  ),
  (
    'a1b2c3d4-0002-0002-0002-000000000002',
    'Koperasi Melati Jaya',
    'sayuran',
    'Koperasi sayuran dengan fasilitas cold storage. Stok sering tidak tercatat atau data hilang.',
    'Jl. Raya Lembang No. 45, Bandung Barat',
    '022-12345678'
  ),
  (
    'a1b2c3d4-0003-0003-0003-000000000003',
    'Koperasi Sumber Makmur',
    'pupuk',
    'Koperasi pupuk dan toko gerai pertanian. Harga supplier tidak transparan ke pengurus.',
    'Jl. Pasar Cipanas No. 8, Cianjur',
    '0263-87654321'
  ),
  (
    'a1b2c3d4-0004-0004-0004-000000000004',
    'Koperasi Tirta Bersama',
    'simpan_pinjam',
    'Koperasi air bersih dan simpan pinjam. Data pengurus tidak lengkap dan ada ketidakakuratan.',
    'Jl. Sumber Air No. 3, Sumedang',
    '0261-77889900'
  ),
  (
    'a1b2c3d4-0005-0005-0005-000000000005',
    'Koperasi Harapan Baru',
    'umum',
    'Koperasi ternak dan pakan. Lokasi jauh dari jaringan, sering terlambat kirim laporan.',
    'Jl. Peternakan No. 17, Garut',
    '0262-55443322'
  );

-- ============================================================
-- Sample Stock Batches
-- Melati Jaya (0002) — sayuran + cold storage
-- Harapan Baru (0005) — pakan ternak
-- ============================================================

INSERT INTO stock_batches (
  id, tenant_id, commodity, quantity_kg, grade, quality_score,
  storage_type, status, received_at, expires_at
) VALUES
  -- Melati Jaya: cabai grade A di cold storage
  (
    'b1c2d3e4-0001-0001-0001-000000000001',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'cabai',
    250.00, 'A', 94,
    'cold', 'available',
    now() - INTERVAL '2 days',
    now() + INTERVAL '12 days'
  ),
  -- Melati Jaya: tomat grade B di cold storage
  (
    'b1c2d3e4-0002-0002-0002-000000000002',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'tomat',
    180.50, 'B', 82,
    'cold', 'available',
    now() - INTERVAL '1 day',
    now() + INTERVAL '20 days'
  ),
  -- Melati Jaya: bayam grade C ambient (contoh stok mendekati masalah)
  (
    'b1c2d3e4-0003-0003-0003-000000000003',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'bayam',
    95.00, 'C', 67,
    'ambient', 'available',
    now() - INTERVAL '3 days',
    now() + INTERVAL '4 days'
  ),
  -- Melati Jaya: cabai grade D hampir expired (menggambarkan masalah pencatatan stok)
  (
    'b1c2d3e4-0004-0004-0004-000000000004',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'cabai',
    320.00, 'D', 48,
    'ambient', 'available',
    now() - INTERVAL '5 days',
    now() + INTERVAL '2 days'
  ),
  -- Harapan Baru: pakan ternak grade A
  (
    'b1c2d3e4-0005-0005-0005-000000000005',
    'a1b2c3d4-0005-0005-0005-000000000005',
    'pakan ternak',
    600.00, 'A', 91,
    'ambient', 'available',
    now() - INTERVAL '1 day',
    now() + INTERVAL '60 days'
  );

-- ============================================================
-- Sample Joint Procurement
-- Sumber Makmur menginisiasi pengadaan pupuk bersama
-- Diikuti Melati Jaya, Harapan Baru, dan Padiwangi
-- (menggambarkan masalah transparansi harga supplier)
-- ============================================================

INSERT INTO joint_procurements (
  id, commodity, total_quantity, unit_price, status, initiated_by, notes
) VALUES
  (
    'c1d2e3f4-0001-0001-0001-000000000001',
    'pupuk urea',
    5000.00,
    2500.00,
    'planning',
    'a1b2c3d4-0003-0003-0003-000000000003',
    'Pengadaan bersama untuk mendapat harga volume dari supplier. Inisiasi Sumber Makmur.'
  );

INSERT INTO procurement_allocations (
  procurement_id, tenant_id, quantity_kg, payment_status
) VALUES
  (
    'c1d2e3f4-0001-0001-0001-000000000001',
    'a1b2c3d4-0003-0003-0003-000000000003',   -- Sumber Makmur (inisiator)
    2000.00,
    'pending'
  ),
  (
    'c1d2e3f4-0001-0001-0001-000000000001',
    'a1b2c3d4-0002-0002-0002-000000000002',   -- Melati Jaya
    1500.00,
    'pending'
  ),
  (
    'c1d2e3f4-0001-0001-0001-000000000001',
    'a1b2c3d4-0005-0005-0005-000000000005',   -- Harapan Baru
    1000.00,
    'pending'
  ),
  (
    'c1d2e3f4-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',   -- Padiwangi
    500.00,
    'pending'
  );
