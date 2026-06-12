import { NextResponse } from 'next/server';

const BASE_URL = process.env.HYPERLEDGER_API_URL;
const CHANNEL_ID = 'arta-channel';
const TIMEOUT_MS = 8000;

interface CheckResult {
  ok: boolean;
  latencyMs?: number;
  status?: number;
  body?: unknown;
  error?: string;
}

async function probe(
  path: string,
  init: RequestInit = {},
): Promise<CheckResult> {
  if (!BASE_URL) return { ok: false, error: 'HYPERLEDGER_API_URL tidak dikonfigurasi' };
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    let body: unknown;
    const ct = res.headers.get('content-type') ?? '';
    try {
      body = ct.includes('application/json') ? await res.json() : await res.text();
    } catch {
      body = `(tidak bisa di-parse)`;
    }

    return { ok: res.ok, latencyMs, status: res.status, body };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes('abort') || msg.includes('timeout');
    return {
      ok: false,
      latencyMs,
      error: isTimeout ? `Timeout setelah ${TIMEOUT_MS} ms` : msg,
    };
  }
}

/**
 * GET /api/blockchain/health
 * Jalankan serangkaian pemeriksaan terhadap Fabric REST API Gateway:
 *   1. Ping (GET /)
 *   2. Probe endpoint /transactions (POST kosong — harapkan 4xx bukan 5xx/timeout)
 *   3. Probe endpoint /evaluate (POST kosong — sama)
 *   4. Evaluate ringan: GetBatchesByTenant dengan tenant demo
 */
export async function GET(): Promise<NextResponse> {
  const configuredUrl = BASE_URL ?? '(tidak diset)';

  // 1 — ping root
  const ping = await probe('/');

  // 2 — apakah /transactions ada (terima 4xx; yang penting bukan network error)
  const txProbe = await probe('/transactions', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  // 3 — apakah /evaluate ada
  const evProbe = await probe('/evaluate', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  // 4 — query ringan: GetBatchesByTenant dengan tenant dummy
  const evalQuery = await probe('/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      channelid: CHANNEL_ID,
      chaincodeid: 'stock-trace',
      function: 'GetBatchesByTenant',
      args: ['00000000-0000-0000-0000-000000000000'],
    }),
  });

  // 5 — query credit history
  const creditQuery = await probe('/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      channelid: CHANNEL_ID,
      chaincodeid: 'credit-history',
      function: 'GetCreditHistory',
      args: ['00000000-0000-0000-0000-000000000000'],
    }),
  });

  const reachable =
    ping.ok ||
    (txProbe.status !== undefined && txProbe.status < 500) ||
    (evProbe.status !== undefined && evProbe.status < 500);

  const summary = reachable
    ? evalQuery.ok || creditQuery.ok
      ? '✅ Terhubung & chaincode merespons'
      : '⚠️  Node terjangkau tapi chaincode belum merespons normal (mungkin belum deploy atau channel salah)'
    : '❌ Node tidak terjangkau';

  return NextResponse.json({
    summary,
    configuredUrl,
    channel: CHANNEL_ID,
    checks: {
      ping: { path: 'GET /', ...ping },
      transactions_endpoint: { path: 'POST /transactions', ...txProbe },
      evaluate_endpoint: { path: 'POST /evaluate', ...evProbe },
      stock_chaincode: { path: 'POST /evaluate → stock-trace::GetBatchesByTenant', ...evalQuery },
      credit_chaincode: {
        path: 'POST /evaluate → credit-history::GetCreditHistory',
        ...creditQuery,
      },
    },
  });
}
