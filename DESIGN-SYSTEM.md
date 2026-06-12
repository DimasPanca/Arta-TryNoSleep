# Arta — Design System & UI Guidelines

> Dokumen ini digunakan oleh semua tooling (Claude Code, Codex) sebagai
> sumber kebenaran untuk keputusan visual dan komponen UI.
> Setiap keputusan di sini bersifat opinionated dan spesifik untuk Arta —
> bukan template default.

---

## 1. Design Identity

**Produk**: Platform digitalisasi koperasi untuk komunitas petani dan pedagang sayuran Indonesia.
**Audiens utama**: Pengurus koperasi, kasir, dan anggota — kebanyakan mengakses lewat mobile.
**Satu kalimat tentang produk ini**: Sistem yang membuat data koperasi dapat dipercaya dan mudah diakses oleh siapa saja, dari petani di gudang sampai pengurus di kantor.

**Signature visual**: Grid data yang padat tapi tetap terbaca — seperti papan informasi gudang, bukan dashboard startup Silicon Valley. Kerapatan informasi adalah fitur, bukan bug, karena pengguna butuh semua data tersedia sekaligus tanpa banyak klik.

---

## 2. Color Tokens

Semua warna didefinisikan sebagai CSS custom properties di `globals.css`.
**Tidak boleh ada hardcoded hex di komponen** — selalu pakai token.

```css
/* src/app/globals.css */
:root {
  /* Brand — hijau tanah, bukan hijau tech startup */
  --color-brand-50:  #f0f7f0;
  --color-brand-100: #d4e8d4;
  --color-brand-200: #a8d0a8;
  --color-brand-400: #5a9e5a;
  --color-brand-600: #3a7a3a;  /* primary action */
  --color-brand-800: #1e4a1e;  /* heading on light */
  --color-brand-900: #0f2a0f;

  /* Amber — untuk warning, stok menipis, grade C */
  --color-amber-400: #d97706;
  --color-amber-100: #fef3c7;

  /* Red — untuk alert, anomali, grade F */
  --color-danger-400: #dc2626;
  --color-danger-100: #fee2e2;

  /* Neutrals */
  --color-surface:      #fafaf8;   /* background halaman */
  --color-surface-card: #ffffff;
  --color-border:       #e5e5e2;
  --color-border-strong:#c5c5c0;
  --color-text-primary: #1a1a18;
  --color-text-secondary: #6b6b65;
  --color-text-muted:   #9b9b95;

  /* Grade badge colors */
  --color-grade-a: #16a34a;   /* hijau */
  --color-grade-b: #2563eb;   /* biru */
  --color-grade-c: #d97706;   /* amber */
  --color-grade-d: #ea580c;   /* oranye */
  --color-grade-f: #dc2626;   /* merah */
}

[data-theme="dark"] {
  --color-surface:      #141412;
  --color-surface-card: #1e1e1c;
  --color-border:       #2a2a28;
  --color-border-strong:#3a3a38;
  --color-text-primary: #f0f0ec;
  --color-text-secondary: #a0a09a;
  --color-text-muted:   #606058;
}
```

---

## 3. Typography

```css
/* Font loading di layout.tsx */
/* Display: Instrument Serif — untuk angka besar dan heading utama */
/* Body: Inter — untuk semua teks konten */
/* Mono: JetBrains Mono — untuk kode, ID transaksi, hash */

--font-display: 'Instrument Serif', Georgia, serif;
--font-body:    'Inter', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', 'Courier New', monospace;

/* Type scale */
--text-xs:   0.75rem;   /* 12px — label tabel, badge */
--text-sm:   0.875rem;  /* 14px — body sekunder, timestamp */
--text-base: 1rem;      /* 16px — body utama */
--text-lg:   1.125rem;  /* 18px — heading card */
--text-xl:   1.25rem;   /* 20px — heading section */
--text-2xl:  1.5rem;    /* 24px — heading halaman */
--text-4xl:  2.25rem;   /* 36px — angka besar (stok, total) */
```

**Aturan tipografi**:
- Angka besar di dashboard (total stok, jumlah anggota) pakai `font-display` — efek gudang/laporan
- Semua label UI pakai `font-body`
- ID transaksi, hash blockchain, kode batch pakai `font-mono`
- Tidak ada heading yang pakai uppercase penuh
- Line-height untuk tabel: `1.4` (padat tapi terbaca)

---

## 4. Component Patterns

### Grade Badge

```tsx
// components/ui/GradeBadge.tsx
// Warna otomatis berdasarkan grade, tidak perlu props warna

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

const gradeConfig: Record<Grade, { label: string; className: string }> = {
  A: { label: 'Grade A', className: 'badge-grade-a' },
  B: { label: 'Grade B', className: 'badge-grade-b' },
  C: { label: 'Grade C', className: 'badge-grade-c' },
  D: { label: 'Grade D', className: 'badge-grade-d' },
  F: { label: 'Grade F', className: 'badge-grade-f' },
};

interface GradeBadgeProps {
  grade: Grade;
  score?: number;
  size?: 'sm' | 'md';
}

export function GradeBadge({ grade, score, size = 'md' }: GradeBadgeProps): JSX.Element {
  const config = gradeConfig[grade];
  return (
    <span className={`badge ${config.className} badge-${size}`}>
      {config.label}
      {score !== undefined && <span className="badge-score">{score}</span>}
    </span>
  );
}
```

### Stat Card (angka besar)

```tsx
// Pola untuk angka di dashboard — pakai font display untuk impact
interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

// Struktur HTML yang diharapkan:
// <div class="stat-card">
//   <p class="stat-label">Total stok tersedia</p>
//   <div class="stat-value-row">
//     <span class="stat-number">8.4</span>  ← font-display
//     <span class="stat-unit">ton</span>
//   </div>
//   <p class="stat-trend">↑ 12% dari minggu lalu</p>
// </div>
```

### Data Table

```tsx
// Tabel harus selalu:
// 1. Punya sticky header saat scroll
// 2. Punya empty state yang actionable (bukan "Tidak ada data")
// 3. Baris alternatif dengan warna subtle (bukan border antar baris)
// 4. Angka di kolom rata kanan (text-align: right; font-variant-numeric: tabular-nums)
// 5. Timestamp selalu format: "12 Jun, 14:32" — bukan ISO string

// Pola loading state: gunakan skeleton rows, bukan spinner di tengah
```

---

## 5. Lottie Animation Rules

```tsx
// components/lottie/LottiePlayer.tsx — wrapper utama
// Semua animasi Lottie harus lewat komponen ini

import dynamic from 'next/dynamic';

// Lottie hanya di-render di client (tidak di SSR)
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface LottiePlayerProps {
  src: string;          // path ke JSON di /public/lottie/
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  onComplete?: () => void;
}

// Kapan pakai animasi:
// - Loading scan kamera → loading-scan.json (loop: true)
// - Hasil scan sukses → success-grade.json (loop: false, autoplay: true)
// - Empty state stok → empty-state.json (loop: true)
// - JANGAN pakai animasi untuk loading tabel/list — pakai skeleton
```

---

## 6. Layout System

### Sidebar layout (desktop)

```
┌─────────────────────────────────────────────────────┐
│  Header: [Logo Arta]  [Nama Koperasi ▼]  [User]  │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  Sidebar     │  Main content                        │
│  240px       │  flex-1, max-w-screen-xl             │
│              │  padding: 24px                       │
│  - Dashboard │                                      │
│  - Stok      │                                      │
│  - Scan      │                                      │
│  - Keuangan  │                                      │
│  - Pengadaan │                                      │
│  - Audit     │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

### Mobile layout

```
┌─────────────────────────┐
│  [≡]  Arta  [🔔] [👤] │  header: 56px
├─────────────────────────┤
│                         │
│  Main content           │
│  padding: 16px          │
│  (full width)           │
│                         │
├─────────────────────────┤
│  [📊] [📦] [📷] [💰] [⚙]│  bottom nav: 64px
└─────────────────────────┘
```

**Breakpoints**:
- Mobile: `< 768px` — bottom navigation bar
- Tablet: `768px – 1024px` — collapsed sidebar (icon only)
- Desktop: `> 1024px` — full sidebar

---

## 7. Motion & Animation

**Prinsip**: Gunakan animasi untuk memberi feedback, bukan dekorasi.

```css
/* Durasi standar */
--duration-fast:   150ms;  /* hover states, badge color change */
--duration-normal: 250ms;  /* modal open, drawer slide */
--duration-slow:   400ms;  /* page transition, large element */

/* Easing */
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
```

```tsx
// Pola page transition di layout.tsx
// Gunakan framer-motion hanya untuk:
// 1. Scan result card muncul setelah proses selesai
// 2. Alert anomali slide in dari sisi kanan
// 3. Modal overlay
// Jangan pakai framer-motion untuk transisi navigasi — terlalu heavy
```

**Reduced motion**: Semua animasi harus wrap dengan `@media (prefers-reduced-motion: reduce)` dan fallback ke `transition: none`.

---

## 8. Copy & Microcopy Rules

*(prinsip microcopy untuk konteks koperasi Indonesia — UI/UX Pro Max)*

- Semua label tombol: **kata kerja aktif** ("Simpan batch", bukan "Submit")
- Konfirmasi aksi: ulangi kata kerjanya ("Batch disimpan", bukan "Berhasil")
- Error state: **jelaskan apa yang salah + cara fix** ("Gambar terlalu gelap: coba di tempat lebih terang")
- Empty state: **ajakan bertindak** ("Belum ada stok: tambah batch pertama")
- Loading: hindari "Mohon tunggu..." — pakai deskripsi aksi ("Menganalisis kualitas sayuran...")
- Jangan pakai kata "Sukses", "Error", "Failed" tanpa konteks
- Bahasa: Indonesia untuk semua label UI yang menghadap pengguna
- Tidak boleh ada em dash (`—`) di teks UI yang ditampilkan ke pengguna. Pakai tanda titik dua atau susun ulang kalimatnya. "Gambar terlalu gelap: coba di tempat lebih terang" bukan "Gambar terlalu gelap — coba di tempat lebih terang"
- Tidak ada simbol dekoratif seperti `→`, `•`, `✓` sebagai teks inline di UI. Gunakan komponen ikon dari library yang sudah disetujui

---

## 9. Accessibility Floor

Ini bukan optional — harus pass sebelum PR merge:

- Semua tombol punya `aria-label` jika tidak ada teks visible
- Semua form input punya `<label>` yang terasosiasi
- Focus ring visible di semua interactive element (tidak dihapus dengan `outline: none` tanpa pengganti)
- Color contrast minimum 4.5:1 untuk teks body, 3:1 untuk teks besar
- Semua gambar punya `alt` — scan result photo: `alt="Foto cabai batch #[id]"`
- Grade badge tidak boleh mengandalkan warna saja — harus ada teks ("Grade A", bukan hanya dot hijau)

---

## 10. Cara Claude Code & Codex Harus Menggunakan Dokumen Ini

Saat diminta membuat komponen UI baru:

1. Cek apakah pattern-nya sudah ada di bagian 4 (Component Patterns)
2. Gunakan token dari bagian 2 (Color Tokens) — tidak boleh hardcode hex
3. Ikuti aturan tipografi dari bagian 3
4. Jika ada angka penting → pakai `font-display`
5. Jika ada loading state → skeleton, bukan spinner (kecuali scan)
6. Cek accessibility floor (bagian 9) sebelum selesai
7. Copy mengikuti aturan bagian 8

Saat diminta membuat halaman baru:

1. Ikuti layout system di bagian 6
2. Tentukan breakpoint yang relevan
3. Animasi hanya jika ada di daftar boleh di bagian 7
