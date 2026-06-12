AGENTS.md

Purpose
-------
This file is a short, internal-facing cheat-sheet for autonomous agents and developer assistants working in this repository. It lists the single most important commands, repo layout, verification steps, and gotchas an agent would otherwise miss.

Language
--------
Primary: English. Indonesian summary at the end.

Quick facts (what matters most)
--------------------------------
- Project purpose: Multi-tenant supply chain traceability and credit history system (Arta) using Next.js, Claude Vision API, and Hyperledger Fabric. 
- Repo structure: This is a full monorepo containing both the Next.js frontend (`src/`) and the Hyperledger Fabric backend (`hyperledger/`).
- Shared Types: The Hyperledger chaincodes (TypeScript) and API Gateway share type definitions directly with the frontend via `src/types/blockchain.ts`.
- Large data: `raw/` contains image datasets. Do not move or commit large files. Reference local paths directly for experiments.

Hyperledger Fabric Strict Contract
----------------------------------
When working on the frontend to blockchain integration, you MUST adhere to `docs/HYPERLEDGER-GUIDE.md`:
- **API Endpoints:** Use `POST /transactions` for writes (invoke) and `POST /evaluate` for reads (query).
- **Payload Format:** `{"channelid": "arta-channel", "chaincodeid": "stock-trace" | "credit-history", "function": "...", "args": ["..."]}`.
- **Arguments:** The `args` array MUST contain only strings. Object arguments must be passed as `JSON.stringify(obj)`.
- **Error Handling:** Blockchain errors return non-2xx HTTP status codes with a JSON `{ "error": "message" }`.
- **Environment:** `HYPERLEDGER_API_URL` must NOT have a trailing slash.

Essential commands (internal team)
----------------------------------
- `npm run dev`         # starts Next.js dev server
- `npm run dev:fabric`  # starts the Hyperledger Fabric REST API Gateway locally (port 4000)
- `npx tsc --noEmit`    # (inside hyperledger/api or chaincode dirs) checks TS errors sharing types with frontend

What an agent must never assume
--------------------------------
- API keys are never committed. Use `.env.local` for `HYPERLEDGER_API_URL` and `ANTHROPIC_API_KEY`.
- Do not upload or re-commit `raw/` images or `docs/` to remote git remotes; they are protected by `.gitignore`.

Verification checklist for changes
----------------------------------
Before marking any task completed, an agent should verify:
- Imports in `hyperledger/` mapping to `@/types/*` are strictly resolving to `../../src/types/*` (no relative escaping drift).
- If code is added that requires secrets, include `.env.example` and update `.gitignore` to include `.env.local`.

Common gotchas
--------------
- The system involves 6 tenants (e.g. PadiwangiMSP, MelatiJayaMSP, DinasMSP). `BatchID` connects the supply chain across tenants.
- Use **Ngrok** for quick Fabric REST exposure when testing integrations between the Next.js app and the Fabric backend externally.

Where to look next
-------------------
- `ARCHITECTURE.md` — The ultimate source of truth for coding standards, file naming (kebab-case), and Next.js structure.
- `docs/HYPERLEDGER-GUIDE.md` — Strict API contract for Hyperledger Fabric.

Indonesian summary (ringkasan singkat)
-------------------------------------
Repo ini adalah monorepo penuh (Next.js di `src/` & Hyperledger di `hyperledger/`). Chaincode dan API Fabric ditulis menggunakan TypeScript dan berbagi struktur data dari `src/types/blockchain.ts`. Channel yang digunakan adalah `arta-channel`. Jangan commit file di `raw/` atau `docs/`. Jalankan `npm run dev:fabric` di root untuk menyalakan API gateway Fabric. Ikuti penamaan kebab-case untuk file seperti di `ARCHITECTURE.md`.
