# Contributing Guide — Arta

Panduan ini menjelaskan cara berkontribusi ke project Arta,
termasuk workflow, standar kode, dan checklist sebelum commit.

--- 

## Sebelum Mulai Coding

Baca dua dokumen ini dulu — mereka adalah sumber kebenaran project:

- `ARCHITECTURE.md` — struktur folder, database schema, type definitions, API conventions
- `DESIGN-SYSTEM.md` — token warna, tipografi, component patterns, copy rules

Jangan membuat keputusan arsitektur atau visual yang bertentangan dengan kedua dokumen tersebut.

---

## Workflow

### Membuat fitur baru

1. Tentukan di layer mana fitur ini hidup:
   - Logic murni (query, kalkulasi, transformasi) → `/src/lib/`
   - HTTP endpoint → `/src/app/api/`
   - Komponen React → `/src/components/`
   - State management → `/src/hooks/`

2. Tulis tipe TypeScript-nya dulu di `/src/types/` sebelum implementasi.

3. Implementasi dimulai dari layer paling dalam (`/lib`) ke luar (`/components`).

4. Tidak ada business logic di dalam komponen React — komponen hanya render dan event handler.

### Urutan file yang dibuat untuk satu fitur

```
types/[feature].ts          ← definisi tipe
lib/[feature]/queries.ts    ← data access
lib/[feature]/[logic].ts    ← business logic
app/api/[feature]/route.ts  ← HTTP handler
components/[feature]/       ← UI components
app/(tenant)/[feature]/     ← halaman
```

---

## Standar Kode

### Komentar Kode

Komentar hanya ditulis kalau kode tidak bisa menjelaskan dirinya sendiri. Default-nya: tidak ada komentar.

**Kapan TIDAK perlu komentar** — mayoritas kode masuk kategori ini:
```typescript
// SALAH — komentar yang menjelaskan hal obvious
// Ambil data batch dari database
const batches = await getBatches(tenantId);

// Cek apakah user sudah login
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Loop semua batch
for (const batch of batches) { ... }
```

**Kapan BOLEH komentar** — hanya untuk alasan yang tidak bisa diungkapkan lewat kode:
```typescript
// Supabase RLS tidak cover cross-tenant query, jadi kita filter manual di sini
const filtered = batches.filter(b => b.tenantId === tenantId);

// Toleransi 2 detik karena kamera butuh warmup sebelum frame stabil
await delay(2000);

// Grade dihitung dari weighted average: freshness 60%, size 40%
// Lihat dokumentasi skema grading di notion/grading-formula
const grade = freshness * 0.6 + size * 0.4;
```

**Aturan komentar yang boleh ada:**
- Satu kalimat pendek, bukan paragraf
- Bahasa Indonesia
- Tidak mengulang nama fungsi atau variabel yang sudah jelas
- Tidak ada komentar "Step 1:", "Step 2:" yang mendokumentasikan alur obvious
- Tidak ada commented-out code — hapus saja kalau tidak dipakai

### TypeScript

```typescript
// BENAR — tipe eksplisit, no any
export async function getStockBatches(
  tenantId: string
): Promise<StockBatch[]> {
  // ...
}

// SALAH — jangan lakukan ini
export async function getStockBatches(tenantId) {
  // no return type, implicit any
}
```

```typescript
// BENAR — early return untuk guard
export async function processLoan(application: LoanApplication): Promise<void> {
  if (!application.applicantId) return;
  if (application.amount <= 0) throw new Error('Amount harus positif');

  // happy path di sini
}

// SALAH — nested if tanpa early return
export async function processLoan(application: LoanApplication): Promise<void> {
  if (application.applicantId) {
    if (application.amount > 0) {
      // logic bersarang dalam — susah dibaca
    }
  }
}
```

### Import order (diformat otomatis oleh ESLint)

```typescript
// 1. Node built-ins
import crypto from 'crypto';

// 2. External packages
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// 3. Internal — pakai @/ alias, tidak boleh ../..
import { createServerClient } from '@/lib/supabase/server';
import type { StockBatch } from '@/types/stock';
```

### Penamaan

```typescript
// File: kebab-case
// cold-storage.ts, grain-quality.ts

// Komponen React: PascalCase
// StockTable.tsx, GradeBadge.tsx

// Variabel & fungsi: camelCase
const qualityScore = 85;
async function analyzeVegetable() {}

// Tipe & Interface: PascalCase, tanpa prefix I
interface StockBatch {}  // bukan IStockBatch
type QualityGrade = 'A' | 'B';

// Konstanta: SCREAMING_SNAKE_CASE
const MAX_CONSENSUS_ATTEMPTS = 3;
const COLD_STORAGE_TEMP_C = 4;
```

---

## API Routes — Pola Wajib

Semua file di `/src/app/api/` harus mengikuti struktur ini:

```typescript
import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Step 1: Auth check
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Step 2: Parse dan validasi body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Request body tidak valid' },
      { status: 400 }
    );
  }

  // Step 3: Type guard / validasi field
  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: 'Field yang dibutuhkan tidak lengkap' },
      { status: 400 }
    );
  }

  // Step 4: Business logic — delegasi ke /lib
  try {
    const result = await someLibFunction(body);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('[api/route] Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal' },
      { status: 500 }
    );
  }
}
```

**Yang tidak boleh ada di API routes**:
- Business logic langsung (query Supabase, kalkulasi) — taruh di `/lib`
- `console.log` — hanya `console.error` untuk error

---

## Komponen React — Pola Wajib

```tsx
import type { JSX } from 'react';

import { GradeBadge } from '@/components/ui/GradeBadge';
import type { StockBatch } from '@/types/stock';

interface StockCardProps {
  batch: StockBatch;
  onSelect?: (id: string) => void;
}

// Named export, bukan default export — lebih mudah di-refactor
export function StockCard({ batch, onSelect }: StockCardProps): JSX.Element {
  const handleClick = (): void => {
    onSelect?.(batch.id);
  };

  return (
    <div className="stock-card" onClick={handleClick}>
      <p className="stock-commodity">{batch.commodity}</p>
      {batch.grade && <GradeBadge grade={batch.grade} score={batch.qualityScore} />}
      <span className="stock-quantity">{batch.quantityKg} kg</span>
    </div>
  );
}
```

**Yang tidak boleh ada di komponen**:
- Fetch langsung ke Supabase atau external API — pakai custom hook atau SWR
- `console.log`
- Hardcoded hex color atau pixel value — pakai CSS token
- Kondisi lebih dari 3 level dalam — ekstrak ke variabel atau komponen

---

## Checklist Sebelum Commit

- [ ] `npm run lint` tidak ada error
- [ ] `npm run build` sukses (tidak ada TypeScript error)
- [ ] Tidak ada `any` baru yang ditambahkan
- [ ] Tidak ada `console.log` yang tertinggal
- [ ] Import menggunakan `@/` path alias
- [ ] Komponen baru punya tipe props eksplisit
- [ ] Fungsi di `/lib` punya return type eksplisit
- [ ] Token warna dari DESIGN-SYSTEM.md dipakai (tidak hardcode)
- [ ] Empty state dan loading state dihandle
- [ ] Tidak ada komentar obvious yang menjelaskan kode yang sudah jelas
- [ ] Tidak ada commented-out code yang tertinggal
- [ ] Tidak ada em dash (`—`) atau simbol dekoratif di teks UI

---

## Commit Message Format

```
feat: tambah cross-tenant credit scoring
fix: perbaiki race condition di consensus scan
chore: update dependency supabase-js
docs: perbarui API contract blockchain
refactor: pisahkan cold storage dari batch logic
style: perbaiki alignment grade badge di mobile
```

Format: `<type>: <deskripsi singkat>`

Type yang valid: `feat` `fix` `chore` `docs` `refactor` `style` `test`
