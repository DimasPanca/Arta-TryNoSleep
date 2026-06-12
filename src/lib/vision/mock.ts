import type { RipenessLevel, ScanResult, SurfaceCondition } from '@/types/scan';
import type { QualityGrade } from '@/types/stock';

/**
 * Penilaian "demo" tanpa API key — heuristik deterministik dari isi citra.
 * Fallback terakhir agar alur kamera tetap berfungsi saat ANTHROPIC_API_KEY
 * maupun GOOGLE_API_KEY belum dikonfigurasi (mis. saat presentasi/pratinjau).
 */
function gradeFor(score: number): QualityGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export async function mockScan(base64Image: string): Promise<ScanResult> {
  // Seed deterministik dari isi citra → hasil konsisten untuk foto yang sama.
  let seed = 0;
  const span = Math.min(base64Image.length, 8192);
  for (let i = 0; i < span; i += 11) {
    seed = (seed * 31 + base64Image.charCodeAt(i)) % 1_000_000;
  }

  const score = 52 + (seed % 46); // 52..97
  const grade = gradeFor(score);

  const colorRipeness: RipenessLevel =
    score >= 80 ? 'ripe' : score >= 64 ? 'semi_ripe' : score >= 50 ? 'overripe' : 'unripe';
  const surfaceCondition: SurfaceCondition =
    score >= 85 ? 'clean' : score >= 68 ? 'minor_blemish' : score >= 50 ? 'moderate_damage' : 'severe_damage';

  const defects =
    grade === 'A'
      ? []
      : grade === 'B'
        ? ['bercak ringan pada kulit']
        : grade === 'C'
          ? ['memar kecil', 'warna kurang merata']
          : ['memar luas', 'kulit keriput'];

  // Simulasi latensi pemrosesan agar UI terasa nyata.
  await new Promise((r) => setTimeout(r, 650));

  return {
    grade,
    qualityScore: score,
    defects,
    colorRipeness,
    surfaceCondition,
    sizeEstimate: seed % 3 === 0 ? 'large' : seed % 3 === 1 ? 'medium' : 'small',
    confidence: 'medium',
    reasoning:
      'Penilaian demo berbasis heuristik citra (tanpa API). Hubungkan ANTHROPIC_API_KEY atau GOOGLE_API_KEY untuk analisis AI sesungguhnya.',
    source: 'fresh_scan',
  };
}
