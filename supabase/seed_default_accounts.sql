-- ================================================================
-- SEED: Akun Default Arta Koperasi
-- Jalankan SEKALI di Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)
--
-- Setelah dijalankan:
--   Ketua  : ketua@melatijaya.id  / ArtaKetua2024!
--   Operator: operator@melatijaya.id / ArtaOps2024!
-- ================================================================


-- ----------------------------------------------------------------
-- STEP 1: Buat tenant Koperasi Melati Jaya
-- ----------------------------------------------------------------
INSERT INTO public.tenants (id, name, type, description, is_active)
VALUES (
  'a1a1a1a1-0000-0000-0000-000000000001'::uuid,
  'Koperasi Melati Jaya',
  'sayuran',
  'Koperasi sayuran dan cold storage Lembang',
  true
)
ON CONFLICT (id) DO UPDATE
  SET name      = EXCLUDED.name,
      is_active = true;


-- ----------------------------------------------------------------
-- STEP 2: Buat akun Ketua + hubungkan ke koperasi
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_uid   uuid := gen_random_uuid();
  v_tid   uuid := 'a1a1a1a1-0000-0000-0000-000000000001'::uuid;
  v_email text := 'ketua@melatijaya.id';
BEGIN
  -- Lewati jika email sudah ada
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE NOTICE 'User % sudah ada, dilewati.', v_email;
  ELSE
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin,
      confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_email,
      crypt('ArtaKetua2024!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Ketua Melati Jaya"}',
      false,
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(),
      v_uid,
      v_email,
      'email',
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );

    INSERT INTO public.members (user_id, tenant_id, role, status, full_name, phone)
    VALUES (v_uid, v_tid, 'ketua', 'active', 'Ketua Melati Jaya', '')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;

    RAISE NOTICE 'Akun ketua dibuat: % (id: %)', v_email, v_uid;
  END IF;
END $$;


-- ----------------------------------------------------------------
-- STEP 3: Buat akun Operator + hubungkan ke koperasi
-- ----------------------------------------------------------------
DO $$
DECLARE
  v_uid   uuid := gen_random_uuid();
  v_tid   uuid := 'a1a1a1a1-0000-0000-0000-000000000001'::uuid;
  v_email text := 'operator@melatijaya.id';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE NOTICE 'User % sudah ada, dilewati.', v_email;
  ELSE
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin,
      confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_email,
      crypt('ArtaOps2024!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Operator Melati Jaya"}',
      false,
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(),
      v_uid,
      v_email,
      'email',
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );

    INSERT INTO public.members (user_id, tenant_id, role, status, full_name, phone)
    VALUES (v_uid, v_tid, 'operator', 'active', 'Operator Melati Jaya', '')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;

    RAISE NOTICE 'Akun operator dibuat: % (id: %)', v_email, v_uid;
  END IF;
END $$;


-- ----------------------------------------------------------------
-- STEP 4 (OPSIONAL): Tambah akun untuk anggota tim Anda sendiri
-- Ganti email dan nama sesuai kebutuhan.
-- Role yang tersedia: ketua | wakil_ketua | bendahara | operator | kasir | mitra | dinas
-- ----------------------------------------------------------------

/*
DO $$
DECLARE
  v_uid   uuid := gen_random_uuid();
  v_tid   uuid := 'a1a1a1a1-0000-0000-0000-000000000001'::uuid;
  v_email text := 'email-anda@domain.com';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE NOTICE 'User % sudah ada, dilewati.', v_email;
  ELSE
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin,
      confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_email,
      crypt('PasswordAnda123!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', 'Nama Anda'),
      false,
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data, created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), v_uid, v_email, 'email',
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );

    INSERT INTO public.members (user_id, tenant_id, role, status, full_name, phone)
    VALUES (v_uid, v_tid, 'bendahara', 'active', 'Nama Anda', '+62...')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;

    RAISE NOTICE 'Akun dibuat: % (id: %)', v_email, v_uid;
  END IF;
END $$;
*/


-- ----------------------------------------------------------------
-- VERIFIKASI: Cek hasil setup
-- ----------------------------------------------------------------
SELECT
  m.role,
  m.status,
  m.full_name,
  u.email,
  t.name AS koperasi
FROM public.members m
JOIN auth.users    u ON u.id = m.user_id
JOIN public.tenants t ON t.id = m.tenant_id
ORDER BY
  CASE m.role
    WHEN 'ketua'       THEN 1
    WHEN 'wakil_ketua' THEN 2
    WHEN 'bendahara'   THEN 3
    WHEN 'operator'    THEN 4
    WHEN 'kasir'       THEN 5
    WHEN 'anggota'     THEN 6
    WHEN 'mitra'       THEN 7
    WHEN 'dinas'       THEN 8
  END;
