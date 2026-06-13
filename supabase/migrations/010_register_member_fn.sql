-- Fungsi untuk mendaftarkan member baru (self-register, pending).
-- SECURITY DEFINER = berjalan sebagai postgres, bypass RLS + GRANT sepenuhnya.
CREATE OR REPLACE FUNCTION register_pending_member(
  p_user_id   UUID,
  p_tenant_id UUID,
  p_full_name TEXT,
  p_phone     TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO members (user_id, tenant_id, role, status, full_name, phone)
  VALUES (p_user_id, p_tenant_id, 'anggota', 'pending', p_full_name, p_phone);
END;
$$;

-- Fungsi untuk mengaktifkan member via undangan.
CREATE OR REPLACE FUNCTION activate_invited_member(
  p_user_id    UUID,
  p_tenant_id  UUID,
  p_role       TEXT,
  p_full_name  TEXT,
  p_phone      TEXT,
  p_invite_token TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO members (user_id, tenant_id, role, status, full_name, phone)
  VALUES (p_user_id, p_tenant_id, p_role, 'active', p_full_name, p_phone);

  UPDATE member_invites
  SET used_at = now(), used_by = p_user_id
  WHERE token = p_invite_token;
END;
$$;

-- Izinkan anon & authenticated memanggil kedua fungsi ini
GRANT EXECUTE ON FUNCTION register_pending_member(UUID, UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_invited_member(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
