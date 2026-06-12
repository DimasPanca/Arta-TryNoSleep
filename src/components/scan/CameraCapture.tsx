'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';

type CamState = 'idle' | 'starting' | 'live' | 'denied' | 'unsupported' | 'error';
type Facing = 'environment' | 'user';

const MAX_EDGE = 1280;

/** Gambar sumber (video/foto) ke canvas berskala lalu kembalikan data URL JPEG. */
function toJpeg(source: CanvasImageSource, srcW: number, srcH: number): string | null {
  if (!srcW || !srcH) return null;
  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(srcW * scale);
  canvas.height = Math.round(srcH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function CameraCapture({ onCapture }: { onCapture: (dataUrl: string) => void }): ReactNode {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<CamState>('idle');
  const [facing, setFacing] = useState<Facing>('environment');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (nextFacing?: Facing) => {
      const f = nextFacing ?? 'environment';
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setState('unsupported');
        return;
      }
      setState('starting');
      stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: f, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setFacing(f);
        setState('live');
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      }
    },
    [stop],
  );

  // Hentikan kamera saat komponen dilepas.
  useEffect(() => () => stop(), [stop]);

  function capture(): void {
    const video = videoRef.current;
    if (!video) return;
    const url = toJpeg(video, video.videoWidth, video.videoHeight);
    if (url) onCapture(url);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const url = toJpeg(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(objectUrl);
      if (url) onCapture(url);
    };
    img.onerror = () => URL.revokeObjectURL(objectUrl);
    img.src = objectUrl;
  }

  const uploadButton = (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface)] cursor-pointer"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
        <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Unggah foto
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-brand-900)]">
      <div className="relative aspect-[4/3] w-full bg-black">
        {/* Video selalu ada agar ref siap; ditampilkan hanya saat live */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${state === 'live' ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Overlay bingkai + garis pindai saat live */}
        {state === 'live' && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-6 rounded-2xl border-2 border-white/30" />
            <Corner className="left-5 top-5 border-l-2 border-t-2" />
            <Corner className="right-5 top-5 border-r-2 border-t-2" />
            <Corner className="bottom-5 left-5 border-b-2 border-l-2" />
            <Corner className="bottom-5 right-5 border-b-2 border-r-2" />
            <div className="absolute inset-x-8 animate-arta-scanline">
              <div className="h-0.5 w-full bg-[var(--color-brand-400)] shadow-[0_0_12px_2px_var(--color-brand-400)]" />
            </div>
          </div>
        )}

        {/* Status non-live */}
        {state !== 'live' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            {state === 'starting' ? (
              <>
                <span className="h-8 w-8 animate-arta-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="text-sm text-white/70">Mengaktifkan kamera…</p>
              </>
            ) : (
              <>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-white">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden>
                    <path d="M3 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <circle cx="12.5" cy="12.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </span>
                <p className="max-w-xs text-sm text-white/75">
                  {state === 'denied'
                    ? 'Izin kamera ditolak. Aktifkan akses kamera di pengaturan browser, lalu coba lagi — atau unggah foto.'
                    : state === 'unsupported'
                      ? 'Perangkat/browser ini tidak mendukung kamera. Silakan unggah foto.'
                      : state === 'error'
                        ? 'Kamera tidak dapat dibuka. Coba lagi atau unggah foto.'
                        : 'Aktifkan kamera untuk memindai kualitas, atau unggah foto dari galeri.'}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Kontrol */}
      <div className="flex items-center justify-between gap-3 bg-[var(--color-brand-900)] px-4 py-3">
        {state === 'live' ? (
          <>
            <button
              type="button"
              onClick={() => start(facing === 'environment' ? 'user' : 'environment')}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
              aria-label="Ganti kamera"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v3M20 17h-3l-1.5 2h-7L7 17H4a1 1 0 0 1-1-1v-3M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              type="button"
              onClick={capture}
              className="group grid h-16 w-16 place-items-center rounded-full bg-white ring-4 ring-white/30 transition-transform active:scale-95 cursor-pointer"
              aria-label="Ambil foto"
            >
              <span className="h-12 w-12 rounded-full bg-[var(--color-brand-600)] transition-colors group-hover:bg-[var(--color-brand-700)]" />
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
              aria-label="Unggah foto"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex w-full items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => start('environment')}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
                <path d="M3 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <circle cx="12.5" cy="12.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              {state === 'denied' || state === 'error' ? 'Coba lagi' : 'Aktifkan kamera'}
            </button>
            {uploadButton}
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
    </div>
  );
}

function Corner({ className }: { className: string }): ReactNode {
  return <span className={`absolute h-6 w-6 rounded-[3px] border-white/80 ${className}`} />;
}
