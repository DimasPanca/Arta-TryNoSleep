'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { CameraCapture } from '@/components/scan/CameraCapture';
import type { ScanResult } from '@/types/scan';
import type { QualityGrade } from '@/types/stock';

type Provider = 'claude' | 'gemini' | 'demo';
type Phase = 'capture' | 'analyzing' | 'result' | 'error';

interface AnalyzeResponse {
  ok: boolean;
  result: ScanResult;
  imageHash: string;
  provider: Provider;
  latencyMs: number;
  error?: string;
}

interface ScanStudioProps {
  canSave: boolean;
  preview: boolean;
  iotConfigured: boolean;
  ingestPath: string;
}

const GRADE_COLOR: Record<QualityGrade, string> = {
  A: 'var(--color-grade-a)',
  B: 'var(--color-grade-b)',
  C: 'var(--color-grade-c)',
  D: 'var(--color-grade-d)',
  F: 'var(--color-grade-f)',
};
const GRADE_LABEL: Record<QualityGrade, string> = {
  A: 'Premium', B: 'Baik', C: 'Olahan', D: 'Rendah', F: 'Tidak layak',
};
const RIPENESS_LABEL: Record<string, string> = {
  unripe: 'Mentah', semi_ripe: 'Setengah matang', ripe: 'Matang', overripe: 'Terlalu matang',
};
const SURFACE_LABEL: Record<string, string> = {
  clean: 'Mulus', minor_blemish: 'Bercak ringan', moderate_damage: 'Rusak sedang', severe_damage: 'Rusak berat',
};
const SIZE_LABEL: Record<string, string> = { small: 'Kecil', medium: 'Sedang', large: 'Besar' };
const CONF_LABEL: Record<string, string> = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
const PROVIDER_LABEL: Record<Provider, string> = {
  claude: 'Claude Vision · konsensus 3×',
  gemini: 'Google Gemini',
  demo: 'Mode demo (tanpa API)',
};

export function ScanStudio({ canSave, preview, iotConfigured, ingestPath }: ScanStudioProps): ReactNode {
  const [phase, setPhase] = useState<Phase>('capture');
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [meta, setMeta] = useState<{ provider: Provider; latencyMs: number; imageHash: string } | null>(null);
  const [error, setError] = useState('');

  async function handleCapture(dataUrl: string): Promise<void> {
    setImage(dataUrl);
    setPhase('analyzing');
    setError('');
    try {
      const res = await fetch('/api/scan/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, commodity: 'tomat' }),
      });
      const json = (await res.json()) as AnalyzeResponse;
      if (!res.ok || !json.ok) throw new Error(json.error || 'Analisis gagal.');
      setResult(json.result);
      setMeta({ provider: json.provider, latencyMs: json.latencyMs, imageHash: json.imageHash });
      setPhase('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga.');
      setPhase('error');
    }
  }

  function reset(): void {
    setPhase('capture');
    setImage(null);
    setResult(null);
    setMeta(null);
    setError('');
  }

  return (
    <div className="space-y-6">
      <header className="animate-arta-rise">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-brand-700)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-600)]" />
          AI Vision · Penilaian mutu
        </div>
        <h1 className="mt-1 font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
          Pindai kualitas Sayur
        </h1>
        <p className="mt-1 text-[15px] text-[var(--color-text-secondary)]">
          Arahkan kamera ke Sayuran, ambil foto, dan sistem menilai grade serta kondisinya secara otomatis.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom kiri: kamera / preview */}
        <div className="space-y-4 lg:col-span-6">
          {phase === 'capture' && <CameraCapture onCapture={handleCapture} />}

          {(phase === 'analyzing' || phase === 'result' || phase === 'error') && image && (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Foto tomat" className="aspect-[4/3] w-full object-cover" />
              {phase === 'analyzing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 backdrop-blur-[2px]">
                  <span className="h-9 w-9 animate-arta-spin rounded-full border-2 border-white/30 border-t-white" />
                  <AnalyzingText />
                </div>
              )}
              {phase === 'result' && result && (
                <div
                  className="absolute left-3 top-3 grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white shadow-lg"
                  style={{ backgroundColor: GRADE_COLOR[result.grade] }}
                >
                  {result.grade}
                </div>
              )}
            </div>
          )}

          {phase !== 'capture' && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface)] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
                <path d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 0 0-14-3M4 15a8 8 0 0 0 14 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Pindai ulang
            </button>
          )}
        </div>

        {/* Kolom kanan: hasil / panduan */}
        <div className="space-y-4 lg:col-span-6">
          {phase === 'capture' && <GuideCard />}
          {phase === 'analyzing' && <SkeletonResult />}
          {phase === 'error' && <ErrorCard message={error} onRetry={reset} />}
          {phase === 'result' && result && meta && (
            <ResultView
              result={result}
              meta={meta}
              canSave={canSave}
              preview={preview}
              onSaved={reset}
            />
          )}
        </div>
      </div>

      <IoTPanel configured={iotConfigured} ingestPath={ingestPath} />
    </div>
  );
}

/* ── Hasil analisis ─────────────────────────────────────────── */
function ResultView({
  result,
  meta,
  canSave,
  preview,
  onSaved,
}: {
  result: ScanResult;
  meta: { provider: Provider; latencyMs: number; imageHash: string };
  canSave: boolean;
  preview: boolean;
  onSaved: () => void;
}): ReactNode {
  return (
    <div className="animate-arta-rise space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
        <div className="flex items-center gap-4">
          <ScoreRing score={result.qualityScore} color={GRADE_COLOR[result.grade]} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="grid h-9 w-9 place-items-center rounded-lg text-base font-bold text-white"
                style={{ backgroundColor: GRADE_COLOR[result.grade] }}
              >
                {result.grade}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Grade {result.grade} · {GRADE_LABEL[result.grade]}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Keyakinan {CONF_LABEL[result.confidence] ?? result.confidence}
                  {result.consensusConfidence ? ` · konsensus ${CONF_LABEL[result.consensusConfidence]}` : ''}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip>{RIPENESS_LABEL[result.colorRipeness] ?? result.colorRipeness}</Chip>
              <Chip>{SURFACE_LABEL[result.surfaceCondition] ?? result.surfaceCondition}</Chip>
              <Chip>Ukuran {SIZE_LABEL[result.sizeEstimate] ?? result.sizeEstimate}</Chip>
            </div>
          </div>
        </div>

        {result.defects.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Cacat terdeteksi
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {result.defects.map((d, i) => (
                <li
                  key={i}
                  className="rounded-full bg-[var(--color-danger-100)] px-2.5 py-1 text-xs font-medium text-[var(--color-danger-400)]"
                >
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.reasoning && (
          <p className="mt-4 rounded-xl bg-[var(--color-surface)] p-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {result.reasoning}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${meta.provider === 'demo' ? 'bg-[var(--color-amber-400)]' : 'bg-[var(--color-brand-600)]'}`}
            />
            {PROVIDER_LABEL[meta.provider]}
          </span>
          <span>{(meta.latencyMs / 1000).toFixed(1)} dtk</span>
        </div>
      </div>

      <SaveForm result={result} imageHash={meta.imageHash} canSave={canSave} preview={preview} onSaved={onSaved} />
    </div>
  );
}

/* ── Form simpan ke stok ────────────────────────────────────── */
function SaveForm({
  result,
  imageHash,
  canSave,
  preview,
  onSaved,
}: {
  result: ScanResult;
  imageHash: string;
  canSave: boolean;
  preview: boolean;
  onSaved: () => void;
}): ReactNode {
  const [commodity, setCommodity] = useState('Tomat');
  const [quantity, setQuantity] = useState('');
  const [storage, setStorage] = useState<'ambient' | 'cold'>('ambient');
  const [createBatch, setCreateBatch] = useState(true);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function save(): Promise<void> {
    setStatus('saving');
    setMessage('');
    try {
      const res = await fetch('/api/scan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          imageHash,
          commodity,
          quantityKg: createBatch ? Number(quantity) : 0,
          storageType: storage,
          createBatch,
        }),
      });
      const json = (await res.json()) as { ok: boolean; batchId?: string | null; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || 'Gagal menyimpan.');
      setStatus('saved');
      setMessage(json.batchId ? 'Tersimpan & batch stok dibuat.' : 'Hasil scan tersimpan.');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan.');
    }
  }

  if (status === 'saved') {
    return (
      <div className="rounded-2xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-5 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--color-brand-600)] text-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
            <path d="m5 13 4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="mt-2 text-sm font-semibold text-[var(--color-brand-800)]">{message}</p>
        <button
          type="button"
          onClick={onSaved}
          className="mt-3 inline-flex rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
        >
          Pindai lagi
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Simpan ke stok</h2>

      {!canSave && (
        <p className="mt-2 rounded-lg bg-[var(--color-amber-100)] px-3 py-2 text-xs font-medium text-[var(--color-amber-400)]">
          {preview ? 'Masuk dengan akun koperasi untuk menyimpan hasil ke stok.' : 'Akun Anda belum tergabung di koperasi aktif.'}
        </p>
      )}

      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Komoditas</span>
          <input
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            disabled={!canSave}
            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-400)] disabled:opacity-60"
          />
        </label>

        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={createBatch}
            onChange={(e) => setCreateBatch(e.target.checked)}
            disabled={!canSave}
            className="h-4 w-4 accent-[var(--color-brand-600)]"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">Buat batch stok baru dari scan ini</span>
        </label>

        {createBatch && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Jumlah (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={!canSave}
                placeholder="0"
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-400)] disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Penyimpanan</span>
              <select
                value={storage}
                onChange={(e) => setStorage(e.target.value as 'ambient' | 'cold')}
                disabled={!canSave}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-400)] disabled:opacity-60"
              >
                <option value="ambient">Suhu ruang</option>
                <option value="cold">Pendingin</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {status === 'error' && (
        <p className="mt-3 text-xs font-medium text-[var(--color-danger-400)]">{message}</p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={!canSave || status === 'saving' || (createBatch && Number(quantity) <= 0)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {status === 'saving' ? (
          <>
            <span className="h-4 w-4 animate-arta-spin rounded-full border-2 border-white/40 border-t-white" />
            Menyimpan…
          </>
        ) : (
          'Simpan hasil'
        )}
      </button>
    </div>
  );
}

/* ── Cincin skor ────────────────────────────────────────────── */
function ScoreRing({ score, color }: { score: number; color: string }): ReactNode {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score]);
  const offset = circ - (Math.min(100, Math.max(0, shown)) / 100) * circ;

  return (
    <svg viewBox="0 0 128 128" className="h-28 w-28 flex-shrink-0">
      <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-surface)" strokeWidth="10" />
      <circle
        cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dashoffset 1s var(--ease-out)' }}
      />
      <text x="64" y="62" textAnchor="middle" style={{ fontSize: '30px', fontFamily: 'var(--font-display)', fill: 'var(--color-text-primary)' }}>
        {Math.round(shown)}
      </text>
      <text x="64" y="82" textAnchor="middle" style={{ fontSize: '11px', fill: 'var(--color-text-muted)' }}>
        / 100
      </text>
    </svg>
  );
}

function Chip({ children }: { children: ReactNode }): ReactNode {
  return (
    <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
      {children}
    </span>
  );
}

/* ── Panel-panel pendukung ──────────────────────────────────── */
function GuideCard(): ReactNode {
  const tips = [
    'Foto satu jenis Sayur dengan latar polos.',
    'Pastikan pencahayaan cukup dan merata.',
    'Isi bingkai dengan objek, hindari bayangan.',
  ];
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Tips hasil terbaik</h2>
      <ul className="mt-3 space-y-2.5">
        {tips.map((t, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-text-secondary)]">
            <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-[var(--color-brand-50)] text-xs font-bold text-[var(--color-brand-700)]">
              {i + 1}
            </span>
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-xl bg-[var(--color-surface)] p-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
        Penilaian memakai AI Vision (Claude / Gemini). Hasil meninjau warna kematangan, kondisi permukaan, ukuran, dan cacat untuk menentukan grade A–F.
      </div>
    </div>
  );
}

function SkeletonResult(): ReactNode {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
      <div className="flex items-center gap-4">
        <div className="h-28 w-28 animate-pulse rounded-full bg-[var(--color-surface)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-surface)]" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-surface)]" />
          <div className="h-6 w-full animate-pulse rounded bg-[var(--color-surface)]" />
        </div>
      </div>
      <div className="mt-4 h-16 w-full animate-pulse rounded-xl bg-[var(--color-surface)]" />
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }): ReactNode {
  return (
    <div className="rounded-2xl border border-[var(--color-danger-100)] bg-[var(--color-danger-100)]/40 p-5">
      <p className="text-sm font-semibold text-[var(--color-danger-400)]">Analisis gagal</p>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
      >
        Coba lagi
      </button>
    </div>
  );
}

function AnalyzingText(): ReactNode {
  const steps = ['Mendeteksi objek…', 'Menilai warna & kematangan…', 'Memeriksa permukaan & cacat…', 'Menyusun grade…'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % steps.length), 900);
    return () => clearInterval(id);
  }, [steps.length]);
  return <p className="text-sm font-medium text-white">{steps[i]}</p>;
}

/* ── Integrasi IoT ──────────────────────────────────────────── */
function IoTPanel({ configured, ingestPath }: { configured: boolean; ingestPath: string }): ReactNode {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const endpoint = `${origin}${ingestPath}`;

  const curl = `curl -X POST ${endpoint} \\
  -H "x-device-key: <KUNCI_PERANGKAT>" \\
  -H "Content-Type: application/json" \\
  -d '{"deviceId":"konveyor-01","image":"<BASE64_JPEG>","save":true}'`;

  function copy(): void {
    navigator.clipboard?.writeText(curl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => undefined,
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M6 9V7a6 6 0 0 1 12 0v2m-9 12h6m-7-9h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Integrasi IoT</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Kamera konveyor / ESP32-CAM dapat mengirim foto ke endpoint ini untuk penilaian otomatis.
            </p>
          </div>
        </div>
        <span
          className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            configured
              ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
              : 'bg-[var(--color-amber-100)] text-[var(--color-amber-400)]'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-[var(--color-brand-600)]' : 'bg-[var(--color-amber-400)]'}`} />
          {configured ? 'Aktif' : 'Belum dikonfigurasi'}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-brand-900)]">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-[var(--font-mono)] text-xs text-white/60">POST {ingestPath}</span>
          <button
            type="button"
            onClick={copy}
            className="rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20 cursor-pointer"
          >
            {copied ? 'Tersalin' : 'Salin contoh'}
          </button>
        </div>
        <pre className="overflow-x-auto px-3 pb-3 font-[var(--font-mono)] text-xs leading-relaxed text-[var(--color-brand-200)]">
{curl}
        </pre>
      </div>

      {!configured && (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Setel <code className="font-[var(--font-mono)]">IOT_DEVICE_KEY</code> (dan opsional{' '}
          <code className="font-[var(--font-mono)]">IOT_TENANT_ID</code> untuk simpan otomatis) di environment untuk mengaktifkan.
        </p>
      )}
    </section>
  );
}
