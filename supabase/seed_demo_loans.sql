-- ============================================================
-- Seed: Pengajuan pembiayaan demo untuk "Koperasi Demo Arta"
-- Jalankan SETELAH 007_asset_financing.sql & seed_demo_accounts.sql
-- Idempoten (hapus-lalu-isi berdasarkan nama aset).
-- ============================================================
--
--  Memberi pengurus (bendahara/ketua/wakil) data pengajuan nyata
--  lengkap dengan riwayat kredit lintas koperasi, agar alur
--  "tinjau → setujui → cairkan → cicil" bisa langsung dicoba.
-- ============================================================

DELETE FROM loan_applications
WHERE target_tenant_id = '11111111-1111-1111-1111-111111111111'
  AND asset_name IN (
    'Traktor mini Quick G1000',
    'Pompa air Honda WB30',
    'Power thresher Saprotan ST-80'
  );

INSERT INTO loan_applications
  (applicant_id, target_tenant_id, amount, purpose, status, credit_score, cross_tenant_data,
   financing_type, asset_name, asset_category, asset_price, vendor_name, down_payment, tenor_months, margin_pct)
SELECT
  u.id,
  '11111111-1111-1111-1111-111111111111'::uuid,
  v.amount, v.purpose, v.status, v.score, v.cross_data::jsonb,
  'asset', v.asset_name, v.category, v.price, v.vendor, v.down, v.tenor, 0
FROM (VALUES
  ('anggota@arta.test',  28000000, 'Traktor mini untuk olah lahan 2 ha',      'pending',  58,
    '[{"tenantId":"PadiwangiMSP","tenantName":"Koperasi Padiwangi","totalLoans":3,"settledLoans":2,"activeArrears":1,"lastUpdated":"2026-06-12T17:24:20.000Z"}]',
    'Traktor mini Quick G1000', 'Alat olah tanah', 32000000, 'CV Tani Jaya Mesin', 4000000, 24),
  ('kasir@arta.test',     9500000, 'Pompa air irigasi sawah',                 'pending',  92,
    '[{"tenantId":"MargaMulyaMSP","tenantName":"Koperasi Marga Mulya","totalLoans":2,"settledLoans":2,"activeArrears":0,"lastUpdated":"2026-05-30T08:00:00.000Z"}]',
    'Pompa air Honda WB30', 'Pompa air', 9500000, 'Toko Mesin Subur', 0, 12),
  ('operator@arta.test', 15000000, 'Alat panen padi (power thresher)',        'approved', 84,
    '[{"tenantId":"MargaMulyaMSP","tenantName":"Koperasi Marga Mulya","totalLoans":2,"settledLoans":2,"activeArrears":0,"lastUpdated":"2026-05-30T08:00:00.000Z"}]',
    'Power thresher Saprotan ST-80', 'Alat panen', 15000000, 'CV Agro Mandiri', 0, 18)
) AS v(email, amount, purpose, status, score, cross_data, asset_name, category, price, vendor, down, tenor)
JOIN auth.users u ON u.email = v.email;

-- Ringkasan
SELECT status, count(*) AS jumlah, sum(amount) AS total_rp
FROM loan_applications
WHERE target_tenant_id = '11111111-1111-1111-1111-111111111111'
GROUP BY status ORDER BY status;
