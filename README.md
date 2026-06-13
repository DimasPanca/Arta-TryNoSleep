# Arta — Platform Digitalisasi Koperasi Multi-Tenant

> **Platform koperasi masa depan untuk komunitas petani dan pedagang sayuran Indonesia.**
> Sistem yang membuat data koperasi dapat dipercaya dan mudah diakses, dari petani di gudang sampai pengurus di kantor.

Arta dibangun khusus untuk menyelesaikan tantangan transparansi dan manajemen data di koperasi melalui **Vision AI (Claude)** untuk penilaian kualitas otomatis dan **Blockchain (Hyperledger Fabric)** untuk rekam jejak yang tak bisa dimanipulasi (*immutable*).

---

## Akun Demo Juri

Untuk memudahkan pengujian tanpa perlu registrasi, silakan gunakan kredensial berikut. Akun ini terhubung ke *database staging* dan aman untuk diutak-atik.

- **Email:** `ketua@arta.test`
- **Password:** `Demo@2026`

> **Catatan:** Akun ini memberikan akses *cross-tenant* dan hak akses penuh untuk mendemonstrasikan keseluruhan fitur.

---

## Skenario Pengujian Utama (Untuk Juri)

Arta memiliki pilar fungsional utama yang bisa Anda uji langsung. Berikut adalah panduan skenario pengujiannya:

### 1. Manajemen Stok & Scan Kualitas (Vision AI)
*Mengurangi bias penilaian kualitas sayuran secara manual saat masuk gudang.*

- **Langkah:** Masuk ke menu **Scan** atau **Stok**.
- **Aksi:** Lakukan pemindaian kualitas sayuran (contoh: cabai/bayam) menggunakan antarmuka kamera simulasi atau gambar sayuran.
- **Behind the Scenes:** Aplikasi akan memanggil **Claude Vision AI** untuk melakukan penilaian otomatis (multi-pass consensus voting) yang akan mengeluarkan Grade (A/B/C/D/F), kondisi permukaan, warna kematangan, hingga *confidence level*.
- **Fitur Tambahan:** Status penyimpanan sayuran (*Cold Storage* vs *Ambient*) untuk mendeteksi potensi pembusukan dan estimasi masa kedaluwarsa. Data rekam jejak dari batch ini juga dicatat ke Hyperledger Fabric.

### 2. Simpan Pinjam & Credit Scoring Lintas Koperasi (Blockchain)
*Mencegah gagal bayar dari anggota yang memiliki riwayat kredit buruk di koperasi lain.*

- **Langkah:** Masuk ke menu **Keuangan** (Finance).
- **Aksi:** Lihat daftar pengajuan pembiayaan, atau buat pengajuan baru.
- **Behind the Scenes:** Saat dievaluasi, sistem akan menjalankan **Cross-tenant Credit Scoring**. Data riwayat kredit anggota akan ditarik dari *ledger* **Hyperledger Fabric** yang mencakup riwayat (total pinjaman, tunggakan aktif) dari *seluruh* koperasi di jaringan (contoh: bisa melihat riwayat dari Koperasi Padiwangi atau Koperasi Melati Jaya).
- **Validasi Bertingkat:** Keputusan pengurus koperasi akan diteruskan ke validator akhir (Dinas Koperasi) secara *on-chain*, memastikan setiap pengajuan yang disetujui terverifikasi secara kriptografis tanpa bisa ditembus langsung ke status "approved" tanpa verifikasi Dinas.

### 3. Keamanan, Transparansi & Audit (Pattern Detection)
*Mencegah fraud atau manipulasi transaksi oleh kasir/operator.*

- **Langkah:** Masuk ke menu **Audit**.
- **Aksi:** Cek Log Transaksi dan Panel Investigasi Kasir.
- **Behind the Scenes:** Fitur ini secara aktif mencari anomali dari seluruh log transaksi kasir (contoh: *after-hours cancel*, *high cancel rate*, *unusual void sequence*). Anomali akan dideteksi dan memberikan *alert* investigasi langsung kepada pengurus koperasi.

---

## 🛠 Tech Stack & Arsitektur

Arta mengadopsi arsitektur modern untuk memastikan performa yang cepat, aman, dan data yang terdesentralisasi:

- **Frontend / Framework:** Next.js 15 (App Router) + React 19, dideploy di **Vercel**
- **Database / Backend:** Supabase (PostgreSQL + Row Level Security)
- **AI & Computer Vision:** Claude API (Anthropic) dengan *multi-pass voting consensus*
- **Blockchain / Ledger:** Hyperledger Fabric (Channel: `arta-channel` untuk *immutable stock-trace* dan *credit-history*) dengan Fabric REST Gateway.
- **Styling & UI:** Tailwind CSS, Shadcn UI, Framer Motion, Lottie Animations

### Arsitektur Singkat
Sistem ini menggunakan arsitektur **Multi-Tenant**. Satu *instance* aplikasi melayani banyak entitas koperasi (contoh: Koperasi Sayur, Koperasi Simpan Pinjam, Koperasi Pupuk) secara terisolasi di sisi UI & Supabase (via RLS), namun terhubung di *backend* blockchain agar antar koperasi bisa saling memverifikasi rekam jejak (*credit scoring*) tanpa mengungkap data privat yang tidak relevan.

---

## Panduan Instalasi Lokal (Opsional untuk Juri Teknis)

Jika Anda ingin menjalankan Arta di lingkungan lokal untuk mengintip arsitekturnya, ikuti langkah berikut:

### Persyaratan
- Node.js v18+ atau v22+
- Akses ke Supabase project lokal / cloud
- Kunci API Anthropic (Claude API Key)
- Docker & Docker Compose (untuk menjalankan jaringan Hyperledger Fabric secara lokal)

### Setup Frontend
1. Clone repositori ini:
   ```bash
   git clone <repo-url>
   cd Arta-TryNoSleep/
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Salin file environment:
   ```bash
   cp .env.example .env.local
   ```
   *(Isi variabel `.env.local` seperti `ANTHROPIC_API_KEY`, kredensial `SUPABASE`, dan `HYPERLEDGER_API_URL`.)*
4. Jalankan *development server*:
   ```bash
   npm run dev
   ```
5. Akses aplikasi di `http://localhost:3000`.

### Setup Blockchain (Hyperledger Fabric)
*Pastikan Anda berada di direktori `hyperledger/`.*
1. Masuk ke direktori jaringan dan deploy *chaincode*:
   ```bash
   cd hyperledger/network
   ./deploy-chaincode.sh
   ```
2. Jalankan API Gateway Fabric (Serverless/Express):
   ```bash
   npm run dev:fabric
   ```
   *Gateway akan berjalan di port `4000` (atau sesuai konfigurasi di `.env`).*

---
