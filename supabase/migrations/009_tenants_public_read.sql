-- Izinkan pengguna publik (belum login) membaca daftar koperasi aktif.
-- Dibutuhkan oleh halaman /register agar dropdown koperasi bisa tampil.
CREATE POLICY "tenants_select_anon"
  ON tenants FOR SELECT
  TO anon
  USING (is_active = true);
