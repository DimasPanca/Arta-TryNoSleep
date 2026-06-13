-- ============================================================
-- SEED 001 — Data Demo Realistis Arta Koperasi
-- Tanggal referensi: 2026-06-13
-- Jalankan satu kali di Supabase SQL Editor
-- ============================================================
--
-- UUID PREFIX GUIDE (semua valid hex a-f, 0-9):
--   Tenants          : 11111111 / 22222222 / 33333333 / 44444444 / 55555555
--   Users staff MJ   : aaaaaaaa / bbbbbbbb / cccccccc / dddddddd / eeeeeeee
--   Users anggota MJ : f1000000-...-001 sampai 004
--   Users partner    : f2000000 / f3000000 / f4000000 / f9000000
--   Stock batches    : b0000001 sampai b0000017
--   Loan apps        : 0a000001 sampai 0a000005
--   Installments     : 0b010001-0b010018 (LA-001), 0b020001-0b020012 (LA-002)
--   Joint procure    : 0c000001 sampai 0c000004
--
-- Login demo setelah seed:
--   email   : 628112345001@arta.id
--   password: Demo@2026
--   (Ahmad Fadilah — ketua Koperasi Melati Jaya)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. AUTH USERS
-- ============================================================

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES

-- Melati Jaya — pengurus & staf
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628112345001@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '8 months',now()-INTERVAL '8 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Ahmad Fadilah"}'::jsonb,false),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628112345002@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '8 months',now()-INTERVAL '8 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Siti Rahayu"}'::jsonb,false),

('cccccccc-cccc-cccc-cccc-cccccccccccc','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628112345003@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '8 months',now()-INTERVAL '8 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Budi Santoso"}'::jsonb,false),

('dddddddd-dddd-dddd-dddd-dddddddddddd','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628112345004@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '6 months',now()-INTERVAL '6 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Rina Lestari"}'::jsonb,false),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628112345005@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '6 months',now()-INTERVAL '6 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Deni Hermawan"}'::jsonb,false),

-- Melati Jaya — anggota / petani
('f1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628221100001@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '5 months',now()-INTERVAL '5 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Tatang Supriatna"}'::jsonb,false),

('f1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628221100002@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '4 months',now()-INTERVAL '4 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Neni Mulyani"}'::jsonb,false),

('f1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628221100003@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '3 months',now()-INTERVAL '3 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Asep Wahyudi"}'::jsonb,false),

('f1000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628221100004@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '2 weeks',now()-INTERVAL '2 weeks',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Yuliana Dewi"}'::jsonb,false),

-- Partner koperasi — pengurus
('f2000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628331100001@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '1 year',now()-INTERVAL '1 year',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Hendra Gunawan"}'::jsonb,false),

('f2000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628331100002@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '11 months',now()-INTERVAL '11 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Wati Kusumawati"}'::jsonb,false),

('f3000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628441100001@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '1 year',now()-INTERVAL '1 year',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Yudi Permana"}'::jsonb,false),

('f4000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628551100001@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '10 months',now()-INTERVAL '10 months',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Joko Purnomo"}'::jsonb,false),

-- Dinas Koperasi
('f9000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 '628991100001@arta.id',crypt('Demo@2026',gen_salt('bf')),
 now()-INTERVAL '2 years',now()-INTERVAL '2 years',now(),
 '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Dr. Rini Puspita"}'::jsonb,false)

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 2. TENANTS
-- ============================================================

INSERT INTO tenants (id, name, type, description, address, phone, is_active) VALUES
('11111111-1111-1111-1111-111111111111',
 'Koperasi Melati Jaya','sayuran',
 'Koperasi sayuran & cold storage, pusat jejaring pengadaan bersama wilayah Lembang.',
 'Jl. Raya Lembang No.45, Lembang, Bandung Barat 40391','022-2786300',true),

('22222222-2222-2222-2222-222222222222',
 'Koperasi Padiwangi','simpan_pinjam',
 'Koperasi simpan pinjam dan perdagangan beras di Ciwidey.',
 'Jl. Raya Ciwidey No.12, Ciwidey, Bandung 40973','022-5921412',true),

('33333333-3333-3333-3333-333333333333',
 'Koperasi Sumber Makmur','pupuk',
 'Koperasi toko gerai pupuk dan sarana pertanian, mitra pengadaan aktif.',
 'Jl. Pangalengan Raya No.88, Pangalengan, Bandung 40378','022-5977101',true),

('44444444-4444-4444-4444-444444444444',
 'Koperasi Tirta Bersama','umum',
 'Koperasi air bersih dan simpan pinjam masyarakat Cimenyan.',
 'Jl. Cimenyan No.3, Cimenyan, Bandung 40198','022-7802234',true),

('55555555-5555-5555-5555-555555555555',
 'Koperasi Harapan Baru','umum',
 'Koperasi ternak dan pakan di daerah terpencil Kertasari. Sinyal terbatas.',
 'Kp. Kertasari RT.02/01, Kertasari, Bandung 40386','082112345678',true)

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 3. MEMBERS
-- ============================================================

INSERT INTO members (user_id, tenant_id, role, status, full_name, phone) VALUES
-- Melati Jaya
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','ketua',      'active','Ahmad Fadilah',   '+628112345001'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','11111111-1111-1111-1111-111111111111','wakil_ketua','active','Siti Rahayu',     '+628112345002'),
('cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111','bendahara',  'active','Budi Santoso',    '+628112345003'),
('dddddddd-dddd-dddd-dddd-dddddddddddd','11111111-1111-1111-1111-111111111111','operator',   'active','Rina Lestari',    '+628112345004'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','11111111-1111-1111-1111-111111111111','kasir',      'active','Deni Hermawan',   '+628112345005'),
('f1000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','anggota',    'active','Tatang Supriatna','+628221100001'),
('f1000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','anggota',    'active','Neni Mulyani',    '+628221100002'),
('f1000000-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','anggota',    'active','Asep Wahyudi',    '+628221100003'),
('f1000000-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','anggota',    'pending','Yuliana Dewi',   '+628221100004'),
('f9000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','dinas',      'active','Dr. Rini Puspita','+628991100001'),
-- Padiwangi
('f2000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','ketua',      'active','Hendra Gunawan',  '+628331100001'),
('f2000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','bendahara',  'active','Wati Kusumawati', '+628331100002'),
-- Sumber Makmur
('f3000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','ketua',      'active','Yudi Permana',    '+628441100001'),
-- Tirta Bersama
('f4000000-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444444','ketua',      'active','Joko Purnomo',    '+628551100001')

ON CONFLICT (user_id, tenant_id) DO NOTHING;


-- ============================================================
-- 4. STOCK BATCHES
-- Referensi: 2026-06-13
-- ============================================================

INSERT INTO stock_batches (
  id, tenant_id, commodity, quantity_kg, grade, quality_score,
  storage_type, status, received_at, expires_at, blockchain_tx, created_by
) VALUES

-- ── AVAILABLE ────────────────────────────────────────────────

-- Tomat grade A, masuk 4 hari lalu, habis ~7 hari ke depan
('b0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
 'tomat',87.50,'A',88,'ambient','available',
 now()-INTERVAL '4 days',now()+INTERVAL '7 days',
 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

-- Tomat grade B, masuk 5 hari lalu, sisa ~3 hari (MONITOR)
('b0000002-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',
 'tomat',62.00,'B',72,'ambient','available',
 now()-INTERVAL '5 days',now()+INTERVAL '3 days',
 '2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d',
 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

-- Bayam grade A, cold storage, masuk kemarin, habis 4 hari
('b0000003-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111',
 'bayam',38.50,'A',91,'cold','available',
 now()-INTERVAL '1 day',now()+INTERVAL '4 days',
 '3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e',
 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

-- Bayam grade C, ambient, masuk 3 hari lalu, KRITIS — 1 hari lagi
('b0000004-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111',
 'bayam',22.00,'C',55,'ambient','available',
 now()-INTERVAL '3 days',now()+INTERVAL '1 day',
 NULL,
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

-- Wortel grade A, masuk 6 hari lalu, habis 15 hari
('b0000005-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111',
 'wortel',145.00,'A',85,'ambient','available',
 now()-INTERVAL '6 days',now()+INTERVAL '15 days',
 '4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

-- Brokoli grade B, cold storage, habis 8 hari
('b0000006-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111',
 'brokoli',55.00,'B',78,'cold','available',
 now()-INTERVAL '3 days',now()+INTERVAL '8 days',
 '5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a',
 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

-- Cabai grade A, masuk 2 hari lalu, habis 10 hari
('b0000007-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111',
 'cabai',28.00,'A',90,'ambient','available',
 now()-INTERVAL '2 days',now()+INTERVAL '10 days',
 '6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

-- Kentang grade B, masuk 12 hari lalu, tahan lama
('b0000008-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111',
 'kentang',210.00,'B',76,'ambient','available',
 now()-INTERVAL '12 days',now()+INTERVAL '25 days',
 '7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

-- Bawang merah grade A, masuk 8 hari lalu
('b0000009-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111',
 'bawang_merah',180.00,'A',87,'ambient','available',
 now()-INTERVAL '8 days',now()+INTERVAL '35 days',
 '8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d',
 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

-- Selada grade A, cold storage, baru masuk hari ini
('b0000010-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111',
 'selada',18.50,'A',93,'cold','available',
 now(),now()+INTERVAL '5 days',
 '9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

-- Brokoli grade C, ambient, URGENT — 2 hari lagi, ada bercak
('b0000011-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111',
 'brokoli',14.00,'C',52,'ambient','available',
 now()-INTERVAL '7 days',now()+INTERVAL '2 days',
 NULL,
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

-- ── DISPATCHED ────────────────────────────────────────────────

('b0000012-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111',
 'tomat',100.00,'A',89,'ambient','dispatched',
 now()-INTERVAL '18 days',now()-INTERVAL '10 days',
 'a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

('b0000013-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111',
 'wortel',80.00,'B',74,'ambient','dispatched',
 now()-INTERVAL '16 days',now()-INTERVAL '7 days',
 'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

('b0000014-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111',
 'cabai',35.00,'B',71,'ambient','dispatched',
 now()-INTERVAL '22 days',now()-INTERVAL '14 days',
 'c2d3e4f5a6b7c2d3e4f5a6b7c2d3e4f5a6b7c2d3',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

('b0000015-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111',
 'bayam',41.00,'A',86,'cold','dispatched',
 now()-INTERVAL '5 days',now()-INTERVAL '3 days',
 'd3e4f5a6b7c8d3e4f5a6b7c8d3e4f5a6b7c8d3e4',
 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

-- ── EXPIRED ───────────────────────────────────────────────────

('b0000016-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111',
 'bayam',12.00,'D',38,'ambient','expired',
 now()-INTERVAL '10 days',now()-INTERVAL '4 days',
 NULL,
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),

('b0000017-0000-0000-0000-000000000017','11111111-1111-1111-1111-111111111111',
 'selada',8.50,'C',47,'ambient','expired',
 now()-INTERVAL '12 days',now()-INTERVAL '6 days',
 NULL,
 'dddddddd-dddd-dddd-dddd-dddddddddddd');


-- ============================================================
-- 5. SCAN RECORDS
-- ============================================================

INSERT INTO scan_records (
  id, batch_id, tenant_id, grade, quality_score, defects,
  color_ripeness, surface_condition, size_estimate, confidence,
  reasoning, scanned_by, scanned_at
) VALUES

('0e000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001',
 '11111111-1111-1111-1111-111111111111',
 'A',88,'[]'::jsonb,'ripe','clean','large','high',
 'Tomat merah merata, kulit mulus, aroma segar. Grade A layak jual premium.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '4 days'+INTERVAL '2 hours'),

('0e000002-0000-0000-0000-000000000002','b0000002-0000-0000-0000-000000000002',
 '11111111-1111-1111-1111-111111111111',
 'B',77,'[{"type":"minor_bruise","location":"permukaan"}]'::jsonb,
 'semi_ripe','minor_blemish','medium','high',
 'Beberapa tomat mulai menunjukkan titik lunak, warna belum seragam.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '5 days'+INTERVAL '3 hours'),

-- Rescan tomat B — kondisi memburuk
('0e000003-0000-0000-0000-000000000003','b0000002-0000-0000-0000-000000000002',
 '11111111-1111-1111-1111-111111111111',
 'B',72,'[{"type":"minor_bruise","location":"permukaan"},{"type":"soft_spot","count":3}]'::jsonb,
 'ripe','minor_blemish','medium','medium',
 'Rescan: kondisi sedikit menurun, ada 3 titik lunak baru. Prioritas jual segera.',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 now()-INTERVAL '2 days'+INTERVAL '9 hours'),

('0e000004-0000-0000-0000-000000000004','b0000003-0000-0000-0000-000000000003',
 '11111111-1111-1111-1111-111111111111',
 'A',91,'[]'::jsonb,'semi_ripe','clean','medium','high',
 'Daun hijau segar, tidak ada busuk, disimpan di cold storage. Grade A prima.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '1 day'+INTERVAL '7 hours'),

('0e000005-0000-0000-0000-000000000005','b0000004-0000-0000-0000-000000000004',
 '11111111-1111-1111-1111-111111111111',
 'C',58,'[{"type":"yellowing","coverage":"30%"},{"type":"wilting"}]'::jsonb,
 'overripe','minor_blemish','small','medium',
 'Daun mulai menguning 30%, layu. Perlu dijual hari ini atau besok.',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 now()-INTERVAL '3 days'+INTERVAL '8 hours'),

-- Rescan bayam C — memburuk drastis
('0e000006-0000-0000-0000-000000000006','b0000004-0000-0000-0000-000000000004',
 '11111111-1111-1111-1111-111111111111',
 'C',55,'[{"type":"yellowing","coverage":"45%"},{"type":"wilting"},{"type":"slime_start"}]'::jsonb,
 'overripe','moderate_damage','small','high',
 'Kondisi memburuk signifikan. Lendir mulai muncul di beberapa daun. Jual atau buang hari ini.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '1 day'+INTERVAL '15 hours'),

('0e000007-0000-0000-0000-000000000007','b0000005-0000-0000-0000-000000000005',
 '11111111-1111-1111-1111-111111111111',
 'A',85,'[]'::jsonb,'unripe','clean','large','high',
 'Wortel ukuran besar, warna oranye seragam, keras. Grade A sangat baik.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '6 days'+INTERVAL '10 hours'),

('0e000008-0000-0000-0000-000000000008','b0000006-0000-0000-0000-000000000006',
 '11111111-1111-1111-1111-111111111111',
 'B',78,'[{"type":"minor_yellowing","coverage":"5%"}]'::jsonb,
 'semi_ripe','minor_blemish','large','high',
 'Brokoli hijau, sedikit kuning di tepi kuntum 5%. Cold storage memperlambat proses.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '3 days'+INTERVAL '11 hours'),

('0e000009-0000-0000-0000-000000000009','b0000007-0000-0000-0000-000000000007',
 '11111111-1111-1111-1111-111111111111',
 'A',90,'[]'::jsonb,'semi_ripe','clean','medium','high',
 'Cabai merah muda seragam, segar, tidak ada cacat. Grade A premium.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '2 days'+INTERVAL '8 hours'),

('0e00000a-0000-0000-0000-000000000010','b0000008-0000-0000-0000-000000000008',
 '11111111-1111-1111-1111-111111111111',
 'B',76,'[{"type":"minor_skin_blemish","count":4}]'::jsonb,
 'unripe','minor_blemish','large','high',
 'Kentang ukuran besar, 4 bintik kulit tapi tidak busuk. Grade B standar pasar.',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 now()-INTERVAL '12 days'+INTERVAL '9 hours'),

('0e00000b-0000-0000-0000-000000000011','b0000009-0000-0000-0000-000000000009',
 '11111111-1111-1111-1111-111111111111',
 'A',87,'[]'::jsonb,'unripe','clean','medium','high',
 'Bawang merah kering merata, kulit lapisan luar baik, aroma tajam segar.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '8 days'+INTERVAL '7 hours'),

('0e00000c-0000-0000-0000-000000000012','b0000010-0000-0000-0000-000000000010',
 '11111111-1111-1111-1111-111111111111',
 'A',93,'[]'::jsonb,'semi_ripe','clean','large','high',
 'Selada hijau segar, renyah, tanpa cacat. Cold storage optimal. Grade A terbaik.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '30 minutes'),

('0e00000d-0000-0000-0000-000000000013','b0000011-0000-0000-0000-000000000011',
 '11111111-1111-1111-1111-111111111111',
 'C',52,'[{"type":"yellowing","coverage":"40%"},{"type":"wilting"},{"type":"odor"}]'::jsonb,
 'overripe','moderate_damage','medium','high',
 'Brokoli 40% kuning, layu, bau mulai muncul. Tidak disimpan di cold. Prioritas jual SEGERA.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '1 day'+INTERVAL '8 hours'),

-- Scan historis untuk batch dispatched
('0e00000e-0000-0000-0000-000000000014','b0000012-0000-0000-0000-000000000012',
 '11111111-1111-1111-1111-111111111111',
 'A',89,'[]'::jsonb,'ripe','clean','large','high',
 'Tomat grade A sempurna, 100 kg ke Pasar Induk Lembang.',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 now()-INTERVAL '18 days'+INTERVAL '8 hours'),

('0e00000f-0000-0000-0000-000000000015','b0000013-0000-0000-0000-000000000013',
 '11111111-1111-1111-1111-111111111111',
 'B',74,'[{"type":"minor_bruise","count":2}]'::jsonb,
 'semi_ripe','minor_blemish','medium','high',
 'Wortel grade B layak jual ke pasar grosir.',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 now()-INTERVAL '16 days'+INTERVAL '9 hours'),

-- Scan batch expired
('0e000010-0000-0000-0000-000000000016','b0000016-0000-0000-0000-000000000016',
 '11111111-1111-1111-1111-111111111111',
 'D',38,'[{"type":"severe_decay","coverage":"60%"},{"type":"mold"},{"type":"odor"}]'::jsonb,
 'overripe','severe_damage','small','high',
 'Bayam 60% busuk, ada jamur. Tidak bisa dijual. Harus dibuang.',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 now()-INTERVAL '9 days'+INTERVAL '8 hours');


-- ============================================================
-- 6. LOAN APPLICATIONS
-- Alur: INSERT (pending) → INSERT validator decision (trigger
--       auto-update ke approved) → UPDATE ke status akhir
-- ============================================================

-- ── LA-001: Traktor mini (ACTIVE, cicilan berjalan) ──────────

INSERT INTO loan_applications (
  id, applicant_id, target_tenant_id,
  financing_type, asset_name, asset_category, asset_price, vendor_name,
  amount, down_payment, tenor_months, margin_pct,
  purpose, status, credit_score, blockchain_tx, created_at, updated_at
) VALUES (
  '0a000001-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'asset','Traktor Mini Yanmar TF105','alat_pertanian',28500000,'UD Mesin Tani Lembang',
  22800000,5700000,18,5.50,
  'Traktor mini untuk membajak lahan 2 hektar kebun tomat dan wortel milik sendiri.',
  'pending',82,
  'e1f2a3b4c5d6e1f2a3b4c5d6e1f2a3b4c5d6e1f2',
  now()-INTERVAL '7 months',now()-INTERVAL '7 months'
);

INSERT INTO loan_validator_decisions (
  id, application_id, validator_id, validator_type, tenant_id,
  verdict, reason, blockchain_tx, decided_at
) VALUES (
  gen_random_uuid(),
  '0a000001-0000-0000-0000-000000000001',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bendahara','11111111-1111-1111-1111-111111111111',
  'approved',
  'Credit score 82 melampaui threshold 75. Tatang anggota aktif, rekam jejak setor baik. Aset produktif untuk 2 ha lahan sendiri. Tenor 18 bulan proporsional.',
  'f2a3b4c5d6e7f2a3b4c5d6e7f2a3b4c5d6e7f2a3',
  now()-INTERVAL '7 months'+INTERVAL '2 days'
);

UPDATE loan_applications SET
  status='disbursed',
  disbursed_at=now()-INTERVAL '7 months'+INTERVAL '5 days',
  updated_at  =now()-INTERVAL '7 months'+INTERVAL '5 days'
WHERE id='0a000001-0000-0000-0000-000000000001';

UPDATE loan_applications SET
  status='active',
  updated_at=now()-INTERVAL '7 months'+INTERVAL '5 days'
WHERE id='0a000001-0000-0000-0000-000000000001';

-- 18 cicilan — pokok 22.800.000, margin 5,5% flat/th → ~Rp 1.380.000/bulan

INSERT INTO loan_installments (
  id, application_id, installment_no, due_date, amount,
  paid_amount, status, paid_at, blockchain_tx
) VALUES
('0b010001-0000-0000-0000-000000000001','0a000001-0000-0000-0000-000000000001', 1,'2025-12-05',1380000,1380000,'paid',now()-INTERVAL '6 months 10 days','tx_la1_ins_01'),
('0b010002-0000-0000-0000-000000000002','0a000001-0000-0000-0000-000000000001', 2,'2026-01-05',1380000,1380000,'paid',now()-INTERVAL '5 months 10 days','tx_la1_ins_02'),
('0b010003-0000-0000-0000-000000000003','0a000001-0000-0000-0000-000000000001', 3,'2026-02-05',1380000,1380000,'paid',now()-INTERVAL '4 months 10 days','tx_la1_ins_03'),
('0b010004-0000-0000-0000-000000000004','0a000001-0000-0000-0000-000000000001', 4,'2026-03-05',1380000,1380000,'paid',now()-INTERVAL '3 months 10 days','tx_la1_ins_04'),
('0b010005-0000-0000-0000-000000000005','0a000001-0000-0000-0000-000000000001', 5,'2026-04-05',1380000,1380000,'paid',now()-INTERVAL '2 months 10 days','tx_la1_ins_05'),
('0b010006-0000-0000-0000-000000000006','0a000001-0000-0000-0000-000000000001', 6,'2026-05-05',1380000,1380000,'paid',now()-INTERVAL '1 month 10 days', 'tx_la1_ins_06'),
('0b010007-0000-0000-0000-000000000007','0a000001-0000-0000-0000-000000000001', 7,'2026-06-05',1380000,1380000,'paid',now()-INTERVAL '8 days',            'tx_la1_ins_07'),
('0b010008-0000-0000-0000-000000000008','0a000001-0000-0000-0000-000000000001', 8,'2026-07-05',1380000,0,'scheduled',NULL,NULL),
('0b010009-0000-0000-0000-000000000009','0a000001-0000-0000-0000-000000000001', 9,'2026-08-05',1380000,0,'scheduled',NULL,NULL),
('0b01000a-0000-0000-0000-000000000010','0a000001-0000-0000-0000-000000000001',10,'2026-09-05',1380000,0,'scheduled',NULL,NULL),
('0b01000b-0000-0000-0000-000000000011','0a000001-0000-0000-0000-000000000001',11,'2026-10-05',1380000,0,'scheduled',NULL,NULL),
('0b01000c-0000-0000-0000-000000000012','0a000001-0000-0000-0000-000000000001',12,'2026-11-05',1380000,0,'scheduled',NULL,NULL),
('0b01000d-0000-0000-0000-000000000013','0a000001-0000-0000-0000-000000000001',13,'2026-12-05',1380000,0,'scheduled',NULL,NULL),
('0b01000e-0000-0000-0000-000000000014','0a000001-0000-0000-0000-000000000001',14,'2027-01-05',1380000,0,'scheduled',NULL,NULL),
('0b01000f-0000-0000-0000-000000000015','0a000001-0000-0000-0000-000000000001',15,'2027-02-05',1380000,0,'scheduled',NULL,NULL),
('0b010010-0000-0000-0000-000000000016','0a000001-0000-0000-0000-000000000001',16,'2027-03-05',1380000,0,'scheduled',NULL,NULL),
('0b010011-0000-0000-0000-000000000017','0a000001-0000-0000-0000-000000000001',17,'2027-04-05',1380000,0,'scheduled',NULL,NULL),
('0b010012-0000-0000-0000-000000000018','0a000001-0000-0000-0000-000000000001',18,'2027-05-05',1254000,0,'scheduled',NULL,NULL);


-- ── LA-002: Pompa air solar (SETTLED / LUNAS) ────────────────

INSERT INTO loan_applications (
  id, applicant_id, target_tenant_id,
  financing_type, asset_name, asset_category, asset_price, vendor_name,
  amount, down_payment, tenor_months, margin_pct,
  purpose, status, credit_score, created_at, updated_at
) VALUES (
  '0a000002-0000-0000-0000-000000000002',
  'f1000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'asset','Pompa Air Solar Grundfos SP3A-23','irigasi',11200000,'CV Irigasi Makmur Bandung',
  8960000,2240000,12,4.00,
  'Pompa solar untuk irigasi lahan bayam dan selada 0,5 hektar. Hemat tenaga manusia.',
  'pending',78,
  now()-INTERVAL '18 months',now()-INTERVAL '18 months'
);

INSERT INTO loan_validator_decisions (
  id, application_id, validator_id, validator_type, tenant_id,
  verdict, reason, decided_at
) VALUES (
  gen_random_uuid(),
  '0a000002-0000-0000-0000-000000000002',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bendahara','11111111-1111-1111-1111-111111111111',
  'approved',
  'Neni anggota aktif, rekam jejak setor sayuran konsisten. Pompa irigasi menunjang produktivitas langsung. Score 78. Disetujui.',
  now()-INTERVAL '18 months'+INTERVAL '3 days'
);

UPDATE loan_applications SET
  status='disbursed',
  disbursed_at=now()-INTERVAL '18 months'+INTERVAL '7 days',
  updated_at  =now()-INTERVAL '18 months'+INTERVAL '7 days'
WHERE id='0a000002-0000-0000-0000-000000000002';

UPDATE loan_applications SET
  status='settled',
  settled_at           =now()-INTERVAL '5 months',
  asset_transferred_at =now()-INTERVAL '5 months',
  updated_at           =now()-INTERVAL '5 months'
WHERE id='0a000002-0000-0000-0000-000000000002';

-- 12 cicilan — semua lunas

INSERT INTO loan_installments (
  id, application_id, installment_no, due_date, amount,
  paid_amount, status, paid_at
) VALUES
('0b020001-0000-0000-0000-000000000001','0a000002-0000-0000-0000-000000000002', 1,'2025-01-10',776000,776000,'paid',now()-INTERVAL '17 months'),
('0b020002-0000-0000-0000-000000000002','0a000002-0000-0000-0000-000000000002', 2,'2025-02-10',776000,776000,'paid',now()-INTERVAL '16 months'),
('0b020003-0000-0000-0000-000000000003','0a000002-0000-0000-0000-000000000002', 3,'2025-03-10',776000,776000,'paid',now()-INTERVAL '15 months'),
('0b020004-0000-0000-0000-000000000004','0a000002-0000-0000-0000-000000000002', 4,'2025-04-10',776000,776000,'paid',now()-INTERVAL '14 months'),
('0b020005-0000-0000-0000-000000000005','0a000002-0000-0000-0000-000000000002', 5,'2025-05-10',776000,776000,'paid',now()-INTERVAL '13 months'),
('0b020006-0000-0000-0000-000000000006','0a000002-0000-0000-0000-000000000002', 6,'2025-06-10',776000,776000,'paid',now()-INTERVAL '12 months'),
('0b020007-0000-0000-0000-000000000007','0a000002-0000-0000-0000-000000000002', 7,'2025-07-10',776000,776000,'paid',now()-INTERVAL '11 months'),
('0b020008-0000-0000-0000-000000000008','0a000002-0000-0000-0000-000000000002', 8,'2025-08-10',776000,776000,'paid',now()-INTERVAL '10 months'),
('0b020009-0000-0000-0000-000000000009','0a000002-0000-0000-0000-000000000002', 9,'2025-09-10',776000,776000,'paid',now()-INTERVAL '9 months'),
('0b02000a-0000-0000-0000-000000000010','0a000002-0000-0000-0000-000000000002',10,'2025-10-10',776000,776000,'paid',now()-INTERVAL '8 months'),
('0b02000b-0000-0000-0000-000000000011','0a000002-0000-0000-0000-000000000002',11,'2025-11-10',776000,776000,'paid',now()-INTERVAL '7 months'),
('0b02000c-0000-0000-0000-000000000012','0a000002-0000-0000-0000-000000000002',12,'2025-12-10',776000,776000,'paid',now()-INTERVAL '6 months');


-- ── LA-003: Mesin sortir (APPROVED, belum dicairkan) ─────────

INSERT INTO loan_applications (
  id, applicant_id, target_tenant_id,
  financing_type, asset_name, asset_category, asset_price, vendor_name,
  amount, down_payment, tenor_months, margin_pct,
  purpose, status, credit_score, created_at, updated_at
) VALUES (
  '0a000003-0000-0000-0000-000000000003',
  'f1000000-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'asset','Mesin Sortir Sayuran Semi-Otomatis','pasca_panen',42000000,'PT Agro Mesin Indonesia',
  33600000,8400000,24,5.00,
  'Mesin sortir grade A/B/C otomatis, kapasitas 500 kg/jam. Efisiensi tenaga kerja 60%.',
  'pending',79,
  now()-INTERVAL '3 weeks',now()-INTERVAL '3 weeks'
);

INSERT INTO loan_validator_decisions (
  id, application_id, validator_id, validator_type, tenant_id,
  verdict, reason, decided_at
) VALUES (
  gen_random_uuid(),
  '0a000003-0000-0000-0000-000000000003',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bendahara','11111111-1111-1111-1111-111111111111',
  'approved',
  'Mesin sortir strategis untuk peningkatan mutu koperasi. Asep memiliki 1,5 ha lahan aktif. Score 79. ROI proyeksi 18 bulan. Tenor 24 bulan wajar.',
  now()-INTERVAL '2 weeks'
);
-- Status tetap 'approved' — menunggu Asep konfirmasi dan ambil aset ke vendor.


-- ── LA-004: Gudang mini (PENDING, baru diajukan) ─────────────

INSERT INTO loan_applications (
  id, applicant_id, target_tenant_id,
  financing_type, asset_name, asset_category, asset_price, vendor_name,
  amount, down_payment, tenor_months, margin_pct,
  purpose, status, credit_score, created_at, updated_at
) VALUES (
  '0a000004-0000-0000-0000-000000000004',
  'f1000000-0000-0000-0000-000000000001',  -- Tatang, pengajuan ke-2
  '11111111-1111-1111-1111-111111111111',
  'asset','Gudang Penyimpanan Sayuran Mini 6x4m','infrastruktur',22000000,'CV Bangunan Tani Jaya',
  17600000,4400000,24,4.50,
  'Gudang kecil di lahan sendiri untuk penyimpanan sementara sebelum kirim ke koperasi. Mengurangi risiko busuk di jalan.',
  'pending',85,
  now()-INTERVAL '3 days',now()-INTERVAL '3 days'
);
-- Belum ada keputusan validator.


-- ── LA-005: Mobil pick-up (REJECTED) ─────────────────────────

INSERT INTO loan_applications (
  id, applicant_id, target_tenant_id,
  financing_type, asset_name, asset_category, asset_price, vendor_name,
  amount, down_payment, tenor_months, margin_pct,
  purpose, status, credit_score, created_at, updated_at
) VALUES (
  '0a000005-0000-0000-0000-000000000005',
  'f1000000-0000-0000-0000-000000000004',  -- Yuliana (masih pending member)
  '11111111-1111-1111-1111-111111111111',
  'asset','Mobil Pick-Up Mitsubishi L300','kendaraan',95000000,'Dealer Mitsubishi Bandung',
  76000000,19000000,36,6.00,
  'Kendaraan angkut untuk distribusi sayuran ke pasar.',
  'pending',48,
  now()-INTERVAL '5 days',now()-INTERVAL '5 days'
);

INSERT INTO loan_validator_decisions (
  id, application_id, validator_id, validator_type, tenant_id,
  verdict, reason, decided_at
) VALUES (
  gen_random_uuid(),
  '0a000005-0000-0000-0000-000000000005',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bendahara','11111111-1111-1111-1111-111111111111',
  'rejected',
  'Credit score 48, di bawah minimum 65. Pemohon belum anggota aktif (status pending). Nilai Rp 95 juta terlalu besar untuk anggota baru. Aset kendaraan bukan aset produktif langsung. Ditolak.',
  now()-INTERVAL '4 days'
);


-- ============================================================
-- 7. JOINT PROCUREMENTS (kolom migration 008 sudah disertakan)
-- ============================================================

INSERT INTO joint_procurements (
  id, commodity, total_quantity, unit_price, status, initiated_by,
  unit, supplier_name, target_date, blockchain_tx, pricing_tiers, notes
) VALUES

-- Pupuk Urea — DELIVERED, on-chain, inisiator Sumber Makmur
('0c000001-0000-0000-0000-000000000001',
 'Pupuk Urea Bersubsidi',205.00,118000,'delivered',
 '33333333-3333-3333-3333-333333333333',
 'sak (50 kg)','PT Pupuk Kujang (Distributor Wilayah)',
 now()-INTERVAL '3 weeks',
 'c4f8a1d6b9e2705c3a8f41d7e6b093a2519c7e4d',
 '[{"minQty":0,"unitPrice":130000,"label":"Eceran (beli sendiri)"},
   {"minQty":50,"unitPrice":118000,"label":"Volume 50+ sak"},
   {"minQty":100,"unitPrice":108000,"label":"Volume 100+ sak"},
   {"minQty":200,"unitPrice":98000,"label":"Volume 200+ sak"}]'::jsonb,
 'Pengadaan pupuk urea musim tanam Juni. Gabungan 4 koperasi on-system + Harapan Baru (manual).'),

-- Benih sayuran — OPEN, belum on-chain, inisiator Melati Jaya
('0c000002-0000-0000-0000-000000000002',
 'Benih Sayuran (Cabai & Tomat)',54.00,262000,'open',
 '11111111-1111-1111-1111-111111111111',
 'kg','CV Tani Benih Unggul',
 now()+INTERVAL '11 days',NULL,
 '[{"minQty":0,"unitPrice":285000,"label":"Eceran (beli sendiri)"},
   {"minQty":20,"unitPrice":262000,"label":"Volume 20+ kg"},
   {"minQty":50,"unitPrice":240000,"label":"Volume 50+ kg"}]'::jsonb,
 'Persiapan musim tanam Juli-Agustus. Tirta Bersama belum konfirmasi kuota.'),

-- Kapur dolomit — PLANNING, inisiator Padiwangi
('0c000003-0000-0000-0000-000000000003',
 'Kapur Dolomit (Pengatur pH Tanah)',90.00,54000,'planning',
 '22222222-2222-2222-2222-222222222222',
 'sak (25 kg)','UD Mineral Tani Pangalengan',
 now()+INTERVAL '15 days',NULL,
 '[{"minQty":0,"unitPrice":62000,"label":"Eceran (beli sendiri)"},
   {"minQty":60,"unitPrice":54000,"label":"Volume 60+ sak"},
   {"minQty":150,"unitPrice":47000,"label":"Volume 150+ sak"}]'::jsonb,
 'Pengapuran lahan sebelum musim hujan. Padiwangi dan Melati Jaya masih kalkulasi kebutuhan.'),

-- Pakan ternak — CONFIRMED, on-chain, inisiator Melati Jaya
('0c000004-0000-0000-0000-000000000004',
 'Pakan Ternak Konsentrat',100.00,228000,'confirmed',
 '11111111-1111-1111-1111-111111111111',
 'sak (40 kg)','Poultry Feed Nusantara',
 now()+INTERVAL '5 days',
 'a91e7c5d2f8b4063e1a7d94c8b5f201e6d3a9c74',
 '[{"minQty":0,"unitPrice":245000,"label":"Eceran (beli sendiri)"},
   {"minQty":40,"unitPrice":228000,"label":"Volume 40+ sak"},
   {"minQty":90,"unitPrice":212000,"label":"Volume 90+ sak"}]'::jsonb,
 'Harapan Baru paling banyak minta. Konfirmasi via telepon (tidak ada sistem). Alokasi sudah sepakat.');


-- ============================================================
-- 8. PROCUREMENT ALLOCATIONS (kolom migration 008 disertakan)
-- ============================================================

INSERT INTO procurement_allocations (
  id, procurement_id, tenant_id, quantity_kg, payment_status,
  requested_kg, participant_type, confirmed_at
) VALUES

-- Pupuk Urea (0c000001)
(gen_random_uuid(),'0c000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333', 80.00,'paid', 80.00,'internal',now()-INTERVAL '4 weeks'),
(gen_random_uuid(),'0c000001-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222', 60.00,'paid', 60.00,'internal',now()-INTERVAL '4 weeks'),
(gen_random_uuid(),'0c000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111', 35.00,'paid', 35.00,'internal',now()-INTERVAL '4 weeks'),
(gen_random_uuid(),'0c000001-0000-0000-0000-000000000001','55555555-5555-5555-5555-555555555555', 30.00,'pending',30.00,'external',now()-INTERVAL '4 weeks'),

-- Benih sayuran (0c000002)
(gen_random_uuid(),'0c000002-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111', 22.00,'pending',22.00,'internal',now()-INTERVAL '3 days'),
(gen_random_uuid(),'0c000002-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222', 18.00,'pending',18.00,'internal',now()-INTERVAL '3 days'),
(gen_random_uuid(),'0c000002-0000-0000-0000-000000000002','44444444-4444-4444-4444-444444444444', 14.00,'pending',14.00,'internal',NULL),

-- Kapur dolomit (0c000003)
(gen_random_uuid(),'0c000003-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222', 50.00,'pending',50.00,'internal',now()-INTERVAL '1 day'),
(gen_random_uuid(),'0c000003-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111', 40.00,'pending',40.00,'internal',NULL),

-- Pakan ternak (0c000004) — alokasi dipotong proporsional (oversubscribed)
(gen_random_uuid(),'0c000004-0000-0000-0000-000000000004','55555555-5555-5555-5555-555555555555', 66.00,'pending',70.00,'external',now()-INTERVAL '2 days'),
(gen_random_uuid(),'0c000004-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111', 17.00,'pending',18.00,'internal',now()-INTERVAL '2 days'),
(gen_random_uuid(),'0c000004-0000-0000-0000-000000000004','44444444-4444-4444-4444-444444444444', 11.00,'pending',12.00,'internal',now()-INTERVAL '2 days');


-- ============================================================
-- 9. AUDIT LOGS
-- Immutable. Mencakup: penjualan stok, pembiayaan, penyesuaian.
-- ============================================================

INSERT INTO audit_logs (
  id, tenant_id, actor_id, action, entity_type, entity_id,
  amount, metadata, is_anomalous, created_at
) VALUES

-- ── Penjualan stok (batch dispatched) ────────────────────────

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'sale','stock_batch','b0000012-0000-0000-0000-000000000012',
 3450000,
 '{"commodity":"tomat","grade":"A","quantity_kg":100,"price_per_kg":34500,
   "buyer":"Pasar Induk Lembang","from_status":"available","to_status":"dispatched"}'::jsonb,
 false, now()-INTERVAL '10 days'+INTERVAL '10 hours'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'sale','stock_batch','b0000013-0000-0000-0000-000000000013',
 1680000,
 '{"commodity":"wortel","grade":"B","quantity_kg":80,"price_per_kg":21000,
   "buyer":"Distributor Grosir Bandung","from_status":"available","to_status":"dispatched"}'::jsonb,
 false, now()-INTERVAL '7 days'+INTERVAL '11 hours'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'sale','stock_batch','b0000014-0000-0000-0000-000000000014',
 1260000,
 '{"commodity":"cabai","grade":"B","quantity_kg":35,"price_per_kg":36000,
   "buyer":"Warung Sayur Cibodas","from_status":"available","to_status":"dispatched"}'::jsonb,
 false, now()-INTERVAL '14 days'+INTERVAL '9 hours'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'sale','stock_batch','b0000015-0000-0000-0000-000000000015',
 738000,
 '{"commodity":"bayam","grade":"A","quantity_kg":41,"price_per_kg":18000,
   "buyer":"Rumah Makan Sunda Pak Dadang","from_status":"available","to_status":"dispatched"}'::jsonb,
 false, now()-INTERVAL '3 days'+INTERVAL '14 hours'),

-- ── Penyesuaian stok (expired) ───────────────────────────────

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'adjustment','stock_batch','b0000016-0000-0000-0000-000000000016',
 NULL,
 '{"commodity":"bayam","grade":"D","quantity_kg":12,"reason":"busuk_mold",
   "from_status":"available","to_status":"expired",
   "notes":"60% busuk ada jamur. Dibuang ke kompos."}'::jsonb,
 false, now()-INTERVAL '4 days'+INTERVAL '8 hours'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'adjustment','stock_batch','b0000017-0000-0000-0000-000000000017',
 NULL,
 '{"commodity":"selada","grade":"C","quantity_kg":8.5,"reason":"lewat_masa_simpan",
   "from_status":"available","to_status":"expired",
   "notes":"Tidak sempat terjual, layu total. Buang."}'::jsonb,
 false, now()-INTERVAL '6 days'+INTERVAL '16 hours'),

-- ── Pembiayaan — pencairan ────────────────────────────────────

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'cccccccc-cccc-cccc-cccc-cccccccccccc',
 'adjustment','loan_application','0a000001-0000-0000-0000-000000000001',
 22800000,
 '{"event":"disbursement","asset":"Traktor Mini Yanmar TF105",
   "applicant":"Tatang Supriatna","tenor_months":18,"margin_pct":5.50}'::jsonb,
 false, now()-INTERVAL '7 months'+INTERVAL '5 days'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'cccccccc-cccc-cccc-cccc-cccccccccccc',
 'adjustment','loan_application','0a000002-0000-0000-0000-000000000002',
 8960000,
 '{"event":"disbursement","asset":"Pompa Air Solar Grundfos SP3A-23",
   "applicant":"Neni Mulyani","tenor_months":12,"margin_pct":4.00}'::jsonb,
 false, now()-INTERVAL '18 months'+INTERVAL '7 days'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'cccccccc-cccc-cccc-cccc-cccccccccccc',
 'adjustment','loan_application','0a000002-0000-0000-0000-000000000002',
 8960000,
 '{"event":"settled","asset":"Pompa Air Solar Grundfos SP3A-23",
   "applicant":"Neni Mulyani",
   "notes":"Semua 12 cicilan lunas. Kepemilikan pompa diserahkan ke anggota."}'::jsonb,
 false, now()-INTERVAL '5 months'),

-- ── Penerimaan angsuran LA-001 (bulan 1–7) ───────────────────

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc',
 'sale','loan_installment','0b010001-0000-0000-0000-000000000001',
 1380000,'{"installment_no":1,"applicant":"Tatang Supriatna","asset":"Traktor Mini Yanmar TF105"}'::jsonb,
 false, now()-INTERVAL '6 months 10 days'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc',
 'sale','loan_installment','0b010002-0000-0000-0000-000000000002',
 1380000,'{"installment_no":2,"applicant":"Tatang Supriatna","asset":"Traktor Mini Yanmar TF105"}'::jsonb,
 false, now()-INTERVAL '5 months 10 days'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc',
 'sale','loan_installment','0b010003-0000-0000-0000-000000000003',
 1380000,'{"installment_no":3,"applicant":"Tatang Supriatna","asset":"Traktor Mini Yanmar TF105"}'::jsonb,
 false, now()-INTERVAL '4 months 10 days'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc',
 'sale','loan_installment','0b010004-0000-0000-0000-000000000004',
 1380000,'{"installment_no":4,"applicant":"Tatang Supriatna","asset":"Traktor Mini Yanmar TF105"}'::jsonb,
 false, now()-INTERVAL '3 months 10 days'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc',
 'sale','loan_installment','0b010005-0000-0000-0000-000000000005',
 1380000,'{"installment_no":5,"applicant":"Tatang Supriatna","asset":"Traktor Mini Yanmar TF105"}'::jsonb,
 false, now()-INTERVAL '2 months 10 days'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc',
 'sale','loan_installment','0b010006-0000-0000-0000-000000000006',
 1380000,'{"installment_no":6,"applicant":"Tatang Supriatna","asset":"Traktor Mini Yanmar TF105"}'::jsonb,
 false, now()-INTERVAL '1 month 10 days'),

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc',
 'sale','loan_installment','0b010007-0000-0000-0000-000000000007',
 1380000,'{"installment_no":7,"applicant":"Tatang Supriatna","asset":"Traktor Mini Yanmar TF105"}'::jsonb,
 false, now()-INTERVAL '8 days'),

-- ── Pengajuan pembiayaan ditolak ─────────────────────────────

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'cccccccc-cccc-cccc-cccc-cccccccccccc',
 'adjustment','loan_application','0a000005-0000-0000-0000-000000000005',
 NULL,
 '{"event":"rejected","asset":"Mobil Pick-Up Mitsubishi L300",
   "applicant":"Yuliana Dewi","credit_score":48,
   "reason":"Score di bawah minimum, anggota belum aktif, nilai terlalu besar"}'::jsonb,
 false, now()-INTERVAL '4 days'),

-- ── Anomali scan bayam C ─────────────────────────────────────

(gen_random_uuid(),'11111111-1111-1111-1111-111111111111',
 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'adjustment','stock_batch','b0000004-0000-0000-0000-000000000004',
 NULL,
 '{"event":"rescan_anomaly","commodity":"bayam","quality_before":58,"quality_after":55,
   "delta":-3,"notes":"Kondisi memburuk dalam 2 hari. Lendir muncul. Tandai kritis dan jual hari ini."}'::jsonb,
 true,  -- IS ANOMALOUS
 now()-INTERVAL '1 day'+INTERVAL '15 hours');


COMMIT;

-- ============================================================
-- RINGKASAN
-- ============================================================
-- Tenants      : 5 koperasi (Melati Jaya + 4 jejaring)
-- Auth users   : 14 akun (password semua: Demo@2026)
-- Members      : 14 (10 Melati Jaya termasuk 1 pending, 4 partner)
-- Stock batches: 17 (11 available, 4 dispatched, 2 expired)
-- Scan records : 16 scan (multiple per batch untuk kondisi berubah)
-- Loan apps    : 5 (1 active, 1 settled, 1 approved, 1 pending, 1 rejected)
-- Installments : 30 (18 LA-001 + 12 LA-002)
-- Validator    : 4 keputusan (3 approved, 1 rejected)
-- Procurements : 4 pengadaan bersama lintas koperasi
-- Allocations  : 12 alokasi
-- Audit logs   : 21 entri (penjualan, penyesuaian, pembiayaan, anomali)
-- ============================================================
-- Login utama: 628112345001@arta.id / Demo@2026
--              (Ahmad Fadilah — ketua Koperasi Melati Jaya)
-- ============================================================
