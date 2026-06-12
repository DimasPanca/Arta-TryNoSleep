# Panduan Setup Hyperledger Fabric — Arta

> Dokumen ini adalah kontrak teknis antara frontend Arta (Next.js) dan backend Hyperledger Fabric.
> Bagian yang ditandai **[HARUS MATCH]** tidak boleh diubah tanpa koordinasi dengan tim frontend.
> Bagian instalasi, tool, dan infrastruktur bebas disesuaikan dengan preferensi Winata.

---

## Gambaran Arsitektur

```
┌──────────────────────────────────────────────────────────────────┐
│  Next.js (Vercel)                                                │
│                                                                  │
│  src/lib/blockchain/client.ts                                    │
│    fabricPost('/transactions', payload)  ← tulis data            │
│    fabricPost('/evaluate', payload)      ← baca data             │
└────────────────────┬─────────────────────────────────────────────┘
                     │ HTTP
                     │ HYPERLEDGER_API_URL
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Fabric REST Gateway                                             │
│                                                                  │
│  POST /transactions  ← invoke chaincode (write, ubah ledger)    │
│  POST /evaluate      ← query chaincode (read-only)              │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│  Hyperledger Fabric Network                                      │
│  Channel: arta-channel                                        │
│                                                                  │
│  Chaincode 1: stock-trace      ← data sayuran, immutable         │
│  Chaincode 2: credit-history   ← pinjaman + multi-validator      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Topologi Multi-Tenant

Setiap koperasi yang bergabung adalah satu organisasi (MSP) di Fabric.
Semua bergabung ke channel yang sama (`arta-channel`) supaya data kredit
bisa dibaca lintas koperasi.

```
arta-channel
  ├── PadiwangiMSP      (Koperasi Padiwangi — simpan pinjam + beras)
  ├── MelatiJayaMSP     (Koperasi Melati Jaya — sayuran + cold storage)
  ├── SumberMakmurMSP   (Koperasi Sumber Makmur — pupuk + gerai)
  ├── TirtaBersamaMSP   (Koperasi Tirta Bersama — air bersih + simpan pinjam)
  ├── HarapanBaruMSP    (Koperasi Harapan Baru — ternak + pakan)
  └── DinasMSP          (Dinas Koperasi — validator akhir, peer node)
```

Koperasi baru yang bergabung cukup tambah MSP baru dan join ke channel yang sama.
Tidak perlu deploy ulang chaincode.

### Kenapa DinasMSP perlu ada?

Dinas Koperasi adalah validator ketiga dalam alur pinjaman.
Dengan punya MSP sendiri, tanda tangan mereka di transaksi Fabric
bisa diverifikasi secara kriptografis — bukan sekadar klik approve di UI.

---

## [HARUS MATCH] #1 — Nama Channel dan Chaincode

```
Channel ID         : arta-channel
Chaincode stock    : stock-trace
Chaincode kredit   : credit-history
```

Frontend mengirim nilai-nilai ini di setiap request body.
Jika berbeda satu karakter pun, semua API call akan gagal.

---

## [HARUS MATCH] #2 — Format Request dari Frontend

Semua request menggunakan format yang sama:

```json
{
  "channelid":   "arta-channel",
  "chaincodeid": "stock-trace",
  "function":    "NamaFungsi",
  "args":        ["arg1", "arg2"]
}
```

- `POST /transactions` → untuk write (invoke, mengubah state ledger)
- `POST /evaluate`     → untuk read (query, tidak mengubah state ledger)
- `args` selalu array of string
- Jika argumen adalah objek, dikirim sebagai `JSON.stringify(objek)` — parse dengan `JSON.parse` di dalam chaincode

---

## [HARUS MATCH] #3 — Fungsi Chaincode `stock-trace`

### `RecordStockEvent` — catat event sayuran

Dipanggil via: `POST /transactions`

```
args[0] = action   (string)
args[1] = record   (JSON string)
```

Nilai valid untuk `action`:
```
"batch_received"    ← sayuran masuk gudang
"batch_dispatched"  ← sayuran dikirim keluar
"quality_updated"   ← hasil scan kualitas diperbarui
"batch_expired"     ← batch dinyatakan kedaluwarsa
```

Struktur `record` (setelah JSON.parse di chaincode):
```json
{
  "batchId":      "uuid",
  "tenantId":     "uuid",
  "commodity":    "cabai",
  "quantityKg":   150.5,
  "grade":        "A",
  "qualityScore": 92,
  "receivedAt":   "2026-06-12T08:00:00Z",
  "operatorId":   "uuid",
  "farmerId":     "uuid"
}
```

`farmerId` opsional. Nilai valid `grade`: `"A"` `"B"` `"C"` `"D"` `"F"`

Response yang diharapkan:
```json
{
  "txId":      "abc123def456...",
  "status":    "committed",
  "timestamp": "2026-06-12T08:00:05Z"
}
```

`status` hanya boleh `"committed"` atau `"pending"`.

---

### `GetTraceHistory` — riwayat satu batch

Dipanggil via: `POST /evaluate`

```
args[0] = batchId  (UUID string)
```

Response:
```json
{
  "batchId": "uuid",
  "entries": [
    {
      "txId":      "abc123...",
      "timestamp": "2026-06-12T08:00:05Z",
      "tenantId":  "uuid",
      "action":    "batch_received",
      "data": {
        "batchId":      "uuid",
        "tenantId":     "uuid",
        "commodity":    "cabai",
        "quantityKg":   150.5,
        "grade":        "A",
        "qualityScore": 92,
        "receivedAt":   "2026-06-12T08:00:00Z",
        "operatorId":   "uuid"
      }
    }
  ]
}
```

`entries` diurutkan ascending (paling lama dulu).
Jika `batchId` tidak ada: `{ "batchId": "...", "entries": [] }` — bukan error.

---

### `GetBatchesByTenant` — semua batch milik satu koperasi

Dipanggil via: `POST /evaluate`

```
args[0] = tenantId  (UUID string)
```

Response: array dari `TraceHistoryResponse`. Jika kosong: `[]`

---

## [HARUS MATCH] #4 — Fungsi Chaincode `credit-history`

### Alur Pinjaman Multi-Validator

```
Anggota A mengajukan pinjaman ke Koperasi Padiwangi
          │
          ▼
[1] SubmitLoanApplication
    → Fabric tulis pengajuan ke ledger
          │
          ▼
[2] AutoEvaluate (otomatis dipanggil setelah submit)
    → GetCreditHistory(applicantId)
      Baca riwayat kredit A dari SEMUA koperasi di channel
          │
     ┌────┴──────────────────────┐
     │                           │
 Tunggakan berat            Riwayat bersih
 (rasio > 50% DAN           atau tunggak ringan
  total tunggak > 2)
     │                           │
     ▼                           ▼
 AUTO REJECT               Lanjut ke Validator 2
 Status: rejected           Status: pending_pengurus
                                  │
                                  ▼
                       [3] Pengurus Koperasi review di UI
                           ValidatorDecision({
                             validatorType: "pengurus",
                             verdict: "approved" atau "rejected"
                           })
                                  │
                        ┌─────────┴──────────┐
                        │                    │
                    Ditolak              Disetujui
                        │                    │
                        ▼                    ▼
                   Status:             Status: pending_dinas
                   rejected                  │
                                             ▼
                                  [4] Dinas Koperasi review
                                      ValidatorDecision({
                                        validatorType: "dinas",
                                        verdict: "approved" atau "rejected"
                                      })
                                             │
                                  ┌──────────┴──────────┐
                                  │                     │
                              Ditolak               FINAL APPROVE
                                  │                     │
                                  ▼                     ▼
                            Status:             Status: approved
                            rejected            → Koperasi cairkan dana
```

---

### `SubmitLoanApplication`

Dipanggil via: `POST /transactions`

```
args[0] = application  (JSON string)
```

Struktur `application`:
```json
{
  "applicationId":   "uuid",
  "applicantId":     "uuid",
  "targetTenantId":  "uuid",
  "amount":          5000000.00,
  "purpose":         "modal usaha tani",
  "submittedAt":     "2026-06-12T09:00:00Z"
}
```

Response:
```json
{
  "txId":      "...",
  "status":    "committed",
  "timestamp": "..."
}
```

---

### `AutoEvaluate`

Dipanggil via: `POST /evaluate`

```
args[0] = applicationId  (UUID string)
```

Logika yang harus diimplementasi di chaincode:

```
Ambil semua riwayat kredit applicantId dari ledger

rasioTunggakan = jumlah pinjaman 'overdue' / total pinjaman

JIKA rasioTunggakan > 0.5 DAN jumlah 'overdue' > 2:
  verdict = "rejected"
  reason  = "auto_reject_high_default"

JIKA 0 < rasioTunggakan <= 0.5:
  verdict = "pending_pengurus"
  reason  = "minor_arrears_detected"

JIKA tidak ada riwayat atau riwayat bersih:
  verdict = "pending_pengurus"
  reason  = "clean_history"
```

Response:
```json
{
  "applicationId": "uuid",
  "verdict":       "rejected",
  "reason":        "auto_reject_high_default",
  "evaluatedAt":   "ISO8601"
}
```

`verdict` hanya boleh: `"rejected"` atau `"pending_pengurus"`

---

### `GetCreditHistory`

Dipanggil via: `POST /evaluate`

```
args[0] = applicantId  (UUID string)
```

Response:
```json
{
  "applicantId": "uuid",
  "entries": [
    {
      "tenantId":      "uuid",
      "tenantName":    "Koperasi Padiwangi",
      "totalLoans":    3,
      "settledLoans":  2,
      "activeArrears": 1,
      "lastUpdated":   "ISO8601"
    }
  ]
}
```

Ini adalah data lintas koperasi — semua entri dari semua koperasi di channel
dikumpulkan dalam satu response. Inilah fitur utama multi-tenant:
Koperasi Padiwangi bisa lihat riwayat si A di Koperasi Melati Jaya sebelum approve.

---

### `ValidatorDecision`

Dipanggil via: `POST /transactions`

```
args[0] = applicationId  (UUID string)
args[1] = decision       (JSON string)
```

Struktur `decision`:
```json
{
  "validatorId":   "uuid",
  "validatorType": "pengurus",
  "verdict":       "approved",
  "reason":        "riwayat baik, aset cukup"
}
```

`validatorType` hanya boleh: `"pengurus"` atau `"dinas"`
`verdict` hanya boleh: `"approved"` atau `"rejected"`

Chaincode harus enforce urutan:
- `validatorType: "dinas"` hanya bisa dipanggil setelah pengurus sudah `"approved"`
- Jika urutannya salah, kembalikan error

---

## [HARUS MATCH] #5 — Portofolio Terenkripsi

Koperasi bisa mencetak portofolio yang datanya bersumber dari Hyperledger
(bukan Supabase), ditandatangani MSP koperasi, dan bisa diverifikasi mitra pembiayaan.

### `GetPortfolioData`

Dipanggil via: `POST /evaluate`, chaincode: `credit-history`

```
args[0] = tenantId     (UUID string)
args[1] = periodStart  (ISO8601 date string, contoh: "2026-01-01")
args[2] = periodEnd    (ISO8601 date string, contoh: "2026-12-31")
```

Response:
```json
{
  "tenantId":   "uuid",
  "tenantName": "Koperasi Padiwangi",
  "period": {
    "start": "2026-01-01",
    "end":   "2026-12-31"
  },
  "stockSummary": {
    "totalBatchesReceived": 120,
    "totalWeightKg":        18500.0,
    "gradeDistribution":    { "A": 45, "B": 38, "C": 25, "D": 8, "F": 4 },
    "commodities":          ["cabai", "tomat", "bayam"]
  },
  "loanSummary": {
    "totalApplications": 42,
    "approved":          35,
    "rejected":          7,
    "defaultRate":       0.057
  },
  "signature":   "base64-encoded-msp-signature",
  "signedAt":    "2026-06-12T10:00:00Z",
  "blockHeight": 1847
}
```

Field `signature` diisi dengan tanda tangan MSP koperasi menggunakan private key-nya.
Mitra pembiayaan bisa verifikasi dengan public certificate koperasi yang bisa diunduh dari CA.
Field `blockHeight` menunjukkan di block berapa data ini di-snapshot — bukti tidak ada manipulasi.

---

## [HARUS MATCH] #6 — Error Handling

Jika terjadi error, gateway harus mengembalikan HTTP status non-2xx.
Frontend mengecek `response.ok` — jika false, request dianggap gagal.

Jangan kembalikan HTTP 200 dengan body `{"error": "..."}` — frontend tidak mendeteksinya sebagai error.

Contoh yang benar:
```
HTTP 500
{"error": "chaincode execution failed: batchId not found"}
```

---

## [HARUS MATCH] #7 — Environment Variable

```bash
# .env.local di sisi Next.js
HYPERLEDGER_API_URL=https://your-fabric-gateway.example.com
```

Tidak ada trailing slash. Frontend menggabungkan langsung:
```
https://your-fabric-gateway.example.com/transactions
https://your-fabric-gateway.example.com/evaluate
```

---

## Konteks untuk AI Assistant

Tempel ini ke AI assistant saat coding chaincode:

```
Saya membangun chaincode Hyperledger Fabric untuk platform koperasi multi-tenant
bernama Arta. Berikut spesifikasi yang harus diimplementasi:

NETWORK
Channel: arta-channel
Chaincode 1: stock-trace
Chaincode 2: credit-history

Setiap koperasi adalah satu MSP (PadiwangiMSP, MelatiJayaMSP, SumberMakmurMSP, TirtaBersamaMSP, HarapanBaruMSP).
Dinas Koperasi juga punya MSP sendiri (DinasMSP) sebagai validator akhir pinjaman.

REST GATEWAY
POST /transactions → invoke (write)
POST /evaluate     → query (read-only)
Request body: { channelid, chaincodeid, function, args: string[] }
args selalu array of string; objek dikirim sebagai JSON.stringify

CHAINCODE stock-trace — 3 fungsi:
1. RecordStockEvent(action, recordJSON)
   action: "batch_received"|"batch_dispatched"|"quality_updated"|"batch_expired"
   recordJSON: { batchId, tenantId, commodity, quantityKg, grade, qualityScore, receivedAt, operatorId, farmerId? }
   Response: { txId, status, timestamp }

2. GetTraceHistory(batchId)
   Response: { batchId, entries: [{ txId, timestamp, tenantId, action, data }] }

3. GetBatchesByTenant(tenantId)
   Response: TraceHistoryResponse[]

CHAINCODE credit-history — 5 fungsi:
1. SubmitLoanApplication(applicationJSON)
   applicationJSON: { applicationId, applicantId, targetTenantId, amount, purpose, submittedAt }
   Response: { txId, status, timestamp }

2. AutoEvaluate(applicationId)
   Baca riwayat kredit dari semua koperasi di channel.
   Jika rasio tunggakan > 50% DAN jumlah tunggak > 2: verdict = "rejected"
   Selain itu: verdict = "pending_pengurus"
   Response: { applicationId, verdict, reason, evaluatedAt }

3. GetCreditHistory(applicantId)
   Ambil riwayat kredit lintas koperasi.
   Response: { applicantId, entries: [{ tenantId, tenantName, totalLoans, settledLoans, activeArrears, lastUpdated }] }

4. ValidatorDecision(applicationId, decisionJSON)
   decisionJSON: { validatorId, validatorType: "pengurus"|"dinas", verdict: "approved"|"rejected", reason }
   Enforce urutan: dinas hanya bisa setelah pengurus approved.
   Response: { txId, status, timestamp }

5. GetPortfolioData(tenantId, periodStart, periodEnd)
   Data stok + pinjaman dari ledger, ditandatangani MSP koperasi.
   Response: { tenantId, tenantName, period, stockSummary, loanSummary, signature, signedAt, blockHeight }
```

---

## Checklist Sebelum Serah Terima ke Frontend

- [ ] Channel `arta-channel` aktif, semua koperasi sudah join
- [ ] Chaincode `stock-trace` di-deploy dan ter-commit
- [ ] Chaincode `credit-history` di-deploy dan ter-commit
- [ ] `RecordStockEvent` bisa dipanggil dan mengembalikan `{ txId, status, timestamp }`
- [ ] `GetTraceHistory` mengembalikan `{ batchId, entries: [...] }`
- [ ] `GetCreditHistory` mengembalikan data lintas koperasi
- [ ] `AutoEvaluate` mengembalikan `verdict: "rejected"` atau `"pending_pengurus"`
- [ ] `ValidatorDecision` enforce urutan pengurus sebelum dinas
- [ ] `GetPortfolioData` mengembalikan data dengan field `signature` dan `blockHeight`
- [ ] Semua error dikembalikan sebagai HTTP non-2xx
- [ ] URL gateway sudah dikirim ke tim frontend untuk diisi ke `HYPERLEDGER_API_URL`
- [ ] Gateway bisa diakses dari environment Vercel (bukan hanya localhost)
