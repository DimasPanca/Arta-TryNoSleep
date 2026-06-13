# Arta — Architecture & Code Structure Guide

> Panduan internal untuk membangun sistem koperasi multi-tenant Arta.
> Framework: Next.js 15 (App Router) · Database: Supabase · Blockchain: Hyperledger Fabric
> Deploy target: Vercel · Vision AI: Claude API (Anthropic)

---

## 1. Project Structure

```
arta/
├── public/
│   └── lottie/                         # Lottie JSON animation files
│       ├── loading-scan.json
│       ├── success-grade.json
│       └── empty-state.json
│
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # Root layout + providers
│   │   ├── page.tsx                    # Landing / tenant selector
│   │   │
│   │   ├── (tenant)/                   # Route group: authenticated tenant pages
│   │   │   ├── layout.tsx              # Tenant-aware layout (sidebar, header)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx            # Ringkasan stok + alert
│   │   │   ├── stock/
│   │   │   │   ├── page.tsx            # List stok + filter kualitas
│   │   │   │   └── [id]/page.tsx       # Detail batch sayuran
│   │   │   ├── scan/
│   │   │   │   └── page.tsx            # Kamera scan kualitas
│   │   │   ├── finance/
│   │   │   │   ├── page.tsx            # Daftar pengajuan pembiayaan
│   │   │   │   └── [id]/page.tsx       # Detail + rekomendasi lintas tenant
│   │   │   ├── procurement/
│   │   │   │   └── page.tsx            # Pengadaan bersama (pupuk, dsb)
│   │   │   └── audit/
│   │   │       └── page.tsx            # Log transaksi + anomali kasir
│   │   │
│   │   └── api/                        # Vercel Serverless Functions
│   │       ├── scan/
│   │       │   └── route.ts            # POST — analisis kualitas via Claude API
│   │       ├── stock/
│   │       │   ├── route.ts            # GET list, POST create
│   │       │   └── [id]/route.ts       # GET, PATCH, DELETE by id
│   │       ├── finance/
│   │       │   ├── applications/
│   │       │   │   └── route.ts        # GET list, POST pengajuan baru
│   │       │   └── credit-check/
│   │       │       └── route.ts        # POST — cross-tenant credit scoring
│   │       ├── procurement/
│   │       │   └── route.ts            # GET, POST pengadaan bersama
│   │       ├── blockchain/
│   │       │   ├── record/route.ts     # POST — simpan ke Hyperledger
│   │       │   └── query/route.ts      # GET — query trace history
│   │       └── audit/
│   │           ├── route.ts            # GET logs + pattern detection
│   │           └── anomaly/route.ts    # POST — trigger anomaly check
│   │
│   ├── components/
│   │   ├── ui/                         # Reusable primitive components
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── StatusIndicator.tsx
│   │   │
│   │   ├── lottie/                     # Lottie animation wrappers
│   │   │   ├── LottiePlayer.tsx        # Generic Lottie wrapper
│   │   │   ├── ScanLoadingAnim.tsx
│   │   │   └── SuccessGradeAnim.tsx
│   │   │
│   │   ├── scan/
│   │   │   ├── CameraCapture.tsx       # Akses kamera device
│   │   │   ├── ScanResult.tsx          # Tampilkan grade + confidence
│   │   │   └── ScanHistory.tsx         # Riwayat scan batch
│   │   │
│   │   ├── stock/
│   │   │   ├── StockTable.tsx          # Tabel stok dengan filter
│   │   │   ├── StockCard.tsx           # Card per batch sayuran
│   │   │   ├── GradeBadge.tsx          # Badge grade A/B/C/D/F
│   │   │   └── ColdStorageStatus.tsx   # Status cold storage
│   │   │
│   │   ├── finance/
│   │   │   ├── ApplicationForm.tsx     # Form pengajuan pembiayaan
│   │   │   ├── CreditScoreCard.tsx     # Tampilan skor lintas tenant
│   │   │   └── ApprovalTimeline.tsx    # Timeline keputusan
│   │   │
│   │   ├── procurement/
│   │   │   ├── JointOrderForm.tsx      # Form pengadaan bersama
│   │   │   └── AllocationSummary.tsx   # Ringkasan alokasi per koperasi
│   │   │
│   │   └── audit/
│   │       ├── TransactionLog.tsx      # Tabel log transaksi
│   │       ├── AnomalyAlert.tsx        # Alert pola mencurigakan
│   │       └── InvestigationPanel.tsx  # Panel investigasi kasir
│   │
│   ├── lib/                            # Pure business logic — no React, no UI
│   │   ├── vision/
│   │   │   ├── client.ts               # Claude API wrapper (vision)
│   │   │   ├── consensus.ts            # Multi-pass voting (3x scan)
│   │   │   ├── cache.ts                # SHA-256 image hash cache
│   │   │   ├── gemini.ts               # Gemini fallback provider
│   │   │   └── prompts.ts              # System prompts untuk grading
│   │   │
│   │   ├── stock/
│   │   │   ├── queries.ts              # Supabase queries untuk stok
│   │   │   ├── cold-storage.ts         # Logika cold storage + jadwal
│   │   │   └── batch.ts                # Manajemen batch sayuran
│   │   │
│   │   ├── finance/
│   │   │   ├── credit.ts               # Cross-tenant credit scoring
│   │   │   ├── applications.ts         # CRUD pengajuan pembiayaan
│   │   │   └── recommendations.ts      # Rekomendasi keputusan otomatis
│   │   │
│   │   ├── procurement/
│   │   │   ├── joint-order.ts          # Logika pengadaan bersama
│   │   │   └── allocation.ts           # Kalkulasi alokasi per tenant
│   │   │
│   │   ├── blockchain/
│   │   │   ├── client.ts               # HTTP client ke Fabric REST API
│   │   │   ├── record.ts               # Fungsi simpan record
│   │   │   └── query.ts                # Fungsi query trace history
│   │   │
│   │   ├── audit/
│   │   │   ├── detector.ts             # Pattern detection anomali kasir
│   │   │   ├── notifications.ts        # Kirim notifikasi pengurus
│   │   │   └── queries.ts              # Query audit log dari Supabase
│   │   │
│   │   └── supabase/
│   │       ├── client.ts               # Supabase browser client
│   │       └── server.ts               # Supabase server client (SSR)
│   │
│   ├── hooks/                          # React custom hooks
│   │   ├── useCamera.ts                # Akses MediaDevices API
│   │   ├── useStock.ts                 # Data fetching + realtime stok
│   │   ├── useAuditLogs.ts             # Polling audit log
│   │   └── useTenant.ts                # Tenant context dari session
│   │
│   ├── types/
│   │   ├── tenant.ts                   # Tenant, TenantRole, KoperasiType
│   │   ├── stock.ts                    # StockBatch, QualityGrade, ColdStorage
│   │   ├── finance.ts                  # LoanApplication, CreditScore
│   │   ├── scan.ts                     # ScanResult, GradeLevel, VisionResponse
│   │   ├── procurement.ts              # JointOrder, Allocation
│   │   └── audit.ts                    # AuditLog, AnomalyPattern
│   │
│   └── constants/
│       ├── grades.ts                   # Grade thresholds A/B/C/D/F
│       ├── roles.ts                    # Permission matrix per role
│       └── cold-storage.ts             # Suhu, durasi, jenis sayuran
│
├── hyperledger/                        # Hyperledger Fabric (infrastruktur terpisah)
│   ├── chaincode/                      # Smart contract source
│   │   ├── credit-history/src/         # Chaincode pinjaman (7 fungsi)
│   │   └── stock-trace/src/            # Chaincode stok sayuran (3 fungsi)
│   ├── api/                            # REST API Gateway (Dockerized)
│   │   └── src/server.ts               # Express server: /transactions, /evaluate
│   └── network/                        # Fabric network config
│       ├── docker-compose.yml          # 6 peers, 3 orderers, CLI, CA
│       ├── configtx.yaml               # Channel genesis + anchor peers
│       ├── crypto-config.yaml          # MSP & certificate config
│       └── deploy-chaincode.sh         # Script packaging, install, approve, commit
│
├── supabase/
│   ├── migrations/                     # SQL migration files (version controlled)
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_audit_tables.sql
│   │   └── 004_finance_tables.sql
│   └── seed.sql                        # Data seed untuk development
│
├── .env.local                          # Jangan di-commit!
├── .env.example                        # Template env vars (di-commit)
├── .gitignore
├── HYPERLEDGER-GUIDE.md                # Kontrak teknis Hyperledger ↔ Frontend
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── vercel.json
└── README.md
```

---

## 2. Database Schema (Supabase)

### Tabel utama

```sql
-- Koperasi / tenant
CREATE TABLE tenants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('sayuran', 'simpan_pinjam', 'pupuk', 'umum')),
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Anggota koperasi (bisa di banyak tenant)
CREATE TABLE members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users ON DELETE CASCADE,
  tenant_id    UUID REFERENCES tenants ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('admin', 'pengurus', 'kasir', 'anggota')),
  joined_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

-- Batch sayuran di gudang / cold storage
CREATE TABLE stock_batches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants NOT NULL,
  commodity     TEXT NOT NULL,            -- e.g. 'cabai', 'bayam', 'tomat'
  quantity_kg   DECIMAL(10,2) NOT NULL,
  grade         TEXT CHECK (grade IN ('A','B','C','D','F')),
  quality_score INTEGER,
  storage_type  TEXT CHECK (storage_type IN ('ambient', 'cold')),
  status        TEXT DEFAULT 'available' CHECK (status IN ('available','reserved','dispatched','expired')),
  farmer_id     UUID,                     -- opsional, jika tercatat
  received_at   TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  notes         TEXT,
  blockchain_tx TEXT                      -- tx ID dari Hyperledger
);

-- Hasil scan kualitas (setiap scan tersimpan)
CREATE TABLE scan_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         UUID REFERENCES stock_batches,
  tenant_id        UUID REFERENCES tenants NOT NULL,
  grade            TEXT NOT NULL,
  quality_score    INTEGER NOT NULL,
  defects          JSONB,
  color_ripeness   TEXT,
  surface_condition TEXT,
  confidence       TEXT,
  reasoning        TEXT,
  image_hash       TEXT,
  consensus_data   JSONB,               -- hasil 3x voting
  scanned_by       UUID REFERENCES auth.users,
  scanned_at       TIMESTAMPTZ DEFAULT now()
);

-- Pengajuan pembiayaan
CREATE TABLE loan_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id      UUID REFERENCES auth.users NOT NULL,
  target_tenant_id  UUID REFERENCES tenants NOT NULL,  -- koperasi yang dituju
  amount            DECIMAL(15,2) NOT NULL,
  purpose           TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','disbursed')),
  credit_score      INTEGER,
  cross_tenant_data JSONB,             -- riwayat dari tenant lain
  reviewed_by       UUID REFERENCES auth.users,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Pengadaan bersama antar koperasi
CREATE TABLE joint_procurements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity        TEXT NOT NULL,
  total_quantity   DECIMAL(10,2) NOT NULL,
  unit_price       DECIMAL(10,2),
  status           TEXT DEFAULT 'planning' CHECK (status IN ('planning','confirmed','delivered','closed')),
  initiated_by     UUID REFERENCES tenants NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE procurement_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_id  UUID REFERENCES joint_procurements ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants NOT NULL,
  quantity_kg     DECIMAL(10,2) NOT NULL,
  payment_status  TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  confirmed_at    TIMESTAMPTZ
);

-- Audit log semua transaksi kasir
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants NOT NULL,
  actor_id     UUID REFERENCES auth.users NOT NULL,
  action       TEXT NOT NULL,           -- e.g. 'sale', 'cancel', 'void', 'refund'
  entity_type  TEXT,                    -- e.g. 'transaction', 'stock_batch'
  entity_id    UUID,
  amount       DECIMAL(15,2),
  metadata     JSONB,
  is_anomalous BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS)

```sql
-- Setiap tenant hanya bisa lihat data mereka sendiri
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON stock_batches
  USING (tenant_id IN (
    SELECT tenant_id FROM members WHERE user_id = auth.uid()
  ));

-- Pengurus bisa lihat credit check lintas tenant (read-only)
CREATE POLICY "cross_tenant_credit_read" ON loan_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid()
        AND tenant_id = loan_applications.target_tenant_id
        AND role IN ('admin', 'pengurus')
    )
  );
```

---

## 3. TypeScript Types

```typescript
// src/types/tenant.ts
export type TenantRole = 'admin' | 'pengurus' | 'kasir' | 'anggota';
export type KoperasiType = 'sayuran' | 'simpan_pinjam' | 'pupuk' | 'umum';

export interface Tenant {
  id: string;
  name: string;
  type: KoperasiType;
  description?: string;
}

export interface Member {
  id: string;
  userId: string;
  tenantId: string;
  role: TenantRole;
}

// src/types/stock.ts
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type StorageType = 'ambient' | 'cold';
export type BatchStatus = 'available' | 'reserved' | 'dispatched' | 'expired';

export interface StockBatch {
  id: string;
  tenantId: string;
  commodity: string;
  quantityKg: number;
  grade?: QualityGrade;
  qualityScore?: number;
  storageType: StorageType;
  status: BatchStatus;
  receivedAt: string;
  expiresAt?: string;
  blockchainTx?: string;
}

// src/types/scan.ts
export type RipenessLevel = 'unripe' | 'semi_ripe' | 'ripe' | 'overripe';
export type SurfaceCondition = 'clean' | 'minor_blemish' | 'moderate_damage' | 'severe_damage';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ScanResult {
  grade: QualityGrade;
  qualityScore: number;
  defects: string[];
  colorRipeness: RipenessLevel;
  surfaceCondition: SurfaceCondition;
  sizeEstimate: 'small' | 'medium' | 'large';
  confidence: ConfidenceLevel;
  reasoning: string;
  consensusConfidence?: 'high' | 'medium';
  source?: 'cache' | 'fresh_scan';
}

// src/types/finance.ts
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'disbursed';

export interface CreditHistoryEntry {
  tenantId: string;
  tenantName: string;
  totalLoans: number;
  settledLoans: number;
  activeArrears: number;
  lastUpdated: string;
}

export interface LoanApplication {
  id: string;
  applicantId: string;
  targetTenantId: string;
  amount: number;
  purpose?: string;
  status: ApplicationStatus;
  creditScore?: number;
  crossTenantData?: CreditHistoryEntry[];
  createdAt: string;
}

// src/types/audit.ts
export type AuditAction = 'sale' | 'cancel' | 'void' | 'refund' | 'adjustment';

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  isAnomalous: boolean;
  createdAt: string;
}

export interface AnomalyPattern {
  actorId: string;
  patternType: 'after_hours_cancel' | 'high_cancel_rate' | 'unusual_void_sequence';
  count: number;
  firstSeen: string;
  lastSeen: string;
  riskLevel: 'low' | 'medium' | 'high';
}
```

---

## 4. Service Layer Contracts

Setiap file di `/src/lib` hanya mengekspos fungsi pure dengan tipe eksplisit.
Tidak ada side effect tersembunyi. Tidak ada `console.log` di production.

```typescript
// src/lib/vision/client.ts — contoh signature
export async function analyzeVegetableQuality(
  base64Image: string,
  commodity: string
): Promise<ScanResult>

// src/lib/vision/consensus.ts
export async function scanWithConsensus(
  base64Image: string,
  commodity: string
): Promise<ScanResult & { individualResults: ScanResult[] }>

// src/lib/stock/queries.ts
export async function getStockBatches(
  tenantId: string,
  filters?: { status?: BatchStatus; grade?: QualityGrade }
): Promise<StockBatch[]>

export async function createStockBatch(
  tenantId: string,
  data: Omit<StockBatch, 'id' | 'tenantId'>
): Promise<StockBatch>

// src/lib/finance/credit.ts
export async function getCrossTenantCreditScore(
  userId: string,
  requestingTenantId: string
): Promise<{ score: number; history: CreditHistoryEntry[]; recommendation: 'approve' | 'review' | 'reject' }>

// src/lib/audit/detector.ts
export async function detectAnomalies(
  tenantId: string,
  actorId: string,
  lookbackDays?: number
): Promise<AnomalyPattern[]>
```

---

## 5. API Route Conventions

Semua route di `/src/app/api` mengikuti pola yang sama:

```typescript
// Template API route
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  if (!body.requiredField) {
    return NextResponse.json({ error: 'Missing required field' }, { status: 400 });
  }

  // ...

  return NextResponse.json({ data: result }, { status: 200 });
}
```

---

## 6. Environment Variables

```bash
# .env.example — template, aman di-commit

# Anthropic Claude API
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Hyperledger Fabric REST API
# Akses publik (ngrok): https://unburned-crying-scurvy.ngrok-free.dev
# Akses lokal:          http://172.16.2.205:4000
HYPERLEDGER_API_URL=

# App
NEXT_PUBLIC_APP_URL=https://arta.vercel.app
```

---

## 7. Feature Coverage — Use Cases Hackathon

| Case | Koperasi | Module yang dipakai | Status target |
|------|----------|---------------------|---------------|
| A — Simpan pinjam + digitalisasi pencatatan | Padiwangi | `lib/finance/` · `api/finance/` · `components/finance/` | Ganti Excel manual dengan sistem digital + credit scoring |
| B — Stok sayuran + cold storage | Melati Jaya | `lib/stock/` · `lib/vision/` · `api/stock` · `api/scan` | Scan kualitas + grade + inventory real-time + blockchain |
| C — Pengadaan pupuk bersama + transparansi harga | Sumber Makmur | `lib/procurement/` · `api/procurement` · `components/procurement/` | Kalkulasi alokasi + harga transparan ke semua pengurus |
| D — Air bersih + simpan pinjam, akurasi data | Tirta Bersama | `lib/finance/` · `lib/audit/` · `components/finance/` | Validasi data pengurus + audit log pencatatan |
| E — Ternak + pakan, laporan offline-first | Harapan Baru | `lib/stock/` · `api/stock` · `components/stock/` | Sync laporan saat ada koneksi + blockchain immutable log |
| F — Anomali kasir lintas koperasi | Semua | `lib/audit/detector.ts` · `api/audit/anomaly` · `components/audit/` | Pattern detection + notifikasi pengurus otomatis |

---

## 8. Code Quality Rules

Ini adalah **source of truth** untuk standar kode di project ini.
Claude Code dan Codex harus mengikuti seluruh rules di bawah.

### Naming
- File: `kebab-case.ts` untuk semua file
- Komponen React: `PascalCase` untuk file dan function
- Variabel dan fungsi: `camelCase`
- Tipe/Interface: `PascalCase`, tidak ada prefix `I`
- Konstanta: `SCREAMING_SNAKE_CASE`

### TypeScript
- Gunakan `interface` untuk object shapes, `type` untuk unions/aliases
- Tidak ada `any` — gunakan `unknown` dan narrow type-nya
- Semua fungsi async harus memiliki return type eksplisit
- Semua props komponen React harus memiliki tipe eksplisit

### Functions
- Satu fungsi = satu tanggung jawab
- Maksimal 40 baris per fungsi — jika lebih, pecah
- Early return untuk guard clauses
- Tidak ada nested ternary lebih dari satu level

### Imports
- Path alias `@/` untuk imports internal (sudah dikonfigurasi di tsconfig)
- Urutkan: Node built-ins → external packages → internal `@/`
- Tidak ada circular imports

### Error handling
- Gunakan `try/catch` di semua async operations
- Log error di server, jangan di client
- Return error yang deskriptif ke frontend (bukan stack trace)

### Comments
- Hanya untuk menjelaskan **kenapa**, bukan **apa**
- Kode yang jelas tidak butuh komentar
- JSDoc hanya untuk fungsi di `/lib` yang punya behaviour non-obvious — bukan semua fungsi yang diekspor. Kalau signature TypeScript sudah cukup menjelaskan, tidak perlu JSDoc

---

## 9. Git Commit Convention

```
feat: tambah cross-tenant credit scoring
fix: perbaiki race condition di consensus scan
chore: update supabase types
docs: tambah penjelasan allocation logic
refactor: pisahkan cold storage logic dari batch queries
```

Format: `<type>: <deskripsi singkat dalam bahasa Indonesia/Inggris>`

---

## 10. Vercel Config

```json
// vercel.json
{
  "functions": {
    "src/app/api/scan/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/blockchain/**": {
      "maxDuration": 15
    }
  }
}
```

> Scan butuh timeout lebih panjang karena 3x consensus call ke Claude API.
