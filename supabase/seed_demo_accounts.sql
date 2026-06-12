-- ============================================================
-- Seed: Akun Demo per Role
-- Jalankan di Supabase SQL Editor (sekali; idempoten / aman diulang)
-- ============================================================
--
--  Semua akun memakai password yang sama:  arta12345
--  Login lewat halaman /login dengan EMAIL + password di bawah.
--  (Login email tidak butuh Twilio/Phone Auth.)
--
--  email                 role          nama
--  --------------------  ------------  -----------------
--  ketua@arta.test       ketua         Bapak Ketua
--  wakil@arta.test       wakil_ketua   Wakil Ketua
--  bendahara@arta.test   bendahara     Bu Bendahara
--  operator@arta.test    operator      Operator Lapangan
--  kasir@arta.test       kasir         Kasir Gudang
--  anggota@arta.test     anggota       Petani Anggota
--  mitra@arta.test       mitra         Mitra Pembiayaan
--  dinas@arta.test       dinas         Petugas Dinas
--
--  Semua tergabung di koperasi "Koperasi Demo Arta".
-- ============================================================


-- ── 1. Koperasi demo ────────────────────────────────────────
INSERT INTO tenants (id, name, type, description, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Koperasi Demo Arta',
  'sayuran',
  'Koperasi contoh untuk pengujian setiap peran',
  true
)
ON CONFLICT (id) DO NOTHING;


-- ── 2. User auth (email + password, sudah terkonfirmasi) ─────
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  v.email,
  crypt('arta12345', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', v.full_name),
  now(), now(), '', '', '', ''
FROM (VALUES
  ('ketua@arta.test',     'Bapak Ketua'),
  ('wakil@arta.test',     'Wakil Ketua'),
  ('bendahara@arta.test', 'Bu Bendahara'),
  ('operator@arta.test',  'Operator Lapangan'),
  ('kasir@arta.test',     'Kasir Gudang'),
  ('anggota@arta.test',   'Petani Anggota'),
  ('mitra@arta.test',     'Mitra Pembiayaan'),
  ('dinas@arta.test',     'Petugas Dinas')
) AS v(email, full_name)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = v.email
);


-- ── 3. Identitas email (dibutuhkan sebagian versi GoTrue) ────
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
SELECT
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(), now(), now()
FROM auth.users u
WHERE u.email IN (
  'ketua@arta.test','wakil@arta.test','bendahara@arta.test','operator@arta.test',
  'kasir@arta.test','anggota@arta.test','mitra@arta.test','dinas@arta.test'
)
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i
  WHERE i.user_id = u.id AND i.provider = 'email'
);


-- ── 4. Keanggotaan per role (status aktif) ───────────────────
INSERT INTO members (user_id, tenant_id, role, status, full_name, phone)
SELECT
  u.id,
  '11111111-1111-1111-1111-111111111111'::uuid,
  v.role,
  'active',
  v.full_name,
  v.phone
FROM (VALUES
  ('ketua@arta.test',     'ketua',       'Bapak Ketua',       '+628110000001'),
  ('wakil@arta.test',     'wakil_ketua', 'Wakil Ketua',       '+628110000002'),
  ('bendahara@arta.test', 'bendahara',   'Bu Bendahara',      '+628110000003'),
  ('operator@arta.test',  'operator',    'Operator Lapangan', '+628110000004'),
  ('kasir@arta.test',     'kasir',       'Kasir Gudang',      '+628110000005'),
  ('anggota@arta.test',   'anggota',     'Petani Anggota',    '+628110000006'),
  ('mitra@arta.test',     'mitra',       'Mitra Pembiayaan',  '+628110000007'),
  ('dinas@arta.test',     'dinas',       'Petugas Dinas',     '+628110000008')
) AS v(email, role, full_name, phone)
JOIN auth.users u ON u.email = v.email
ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET role      = EXCLUDED.role,
      status    = 'active',
      full_name = EXCLUDED.full_name,
      phone     = EXCLUDED.phone;


-- ============================================================
-- CARA HAPUS akun demo (jika perlu reset) — buang komentar:
-- ============================================================
-- DELETE FROM auth.users WHERE email IN (
--   'ketua@arta.test','wakil@arta.test','bendahara@arta.test','operator@arta.test',
--   'kasir@arta.test','anggota@arta.test','mitra@arta.test','dinas@arta.test'
-- );
-- DELETE FROM tenants WHERE id = '11111111-1111-1111-1111-111111111111';
-- (members & identities ikut terhapus via ON DELETE CASCADE)
