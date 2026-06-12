/**
 * Ubah input lokal Indonesia menjadi format E.164 yang dibutuhkan
 * Supabase Phone Auth. Contoh:
 *   "0812-3456-7890" → "+6281234567890"
 *   "812 3456 7890"  → "+6281234567890"
 *   "+6281234567890" → "+6281234567890"
 */
export function toE164(local: string): string {
  let digits = local.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith('62')) digits = digits.slice(2);
  return `+62${digits}`;
}

/** Format tampilan ramah: "+62 812 3456 7890". */
export function formatPhoneDisplay(local: string): string {
  const digits = toE164(local).slice(3); // tanpa "+62"
  const groups = digits.replace(/(\d{3})(\d{4})(\d{0,5})/, '$1 $2 $3').trim();
  return `+62 ${groups}`;
}

/** Validasi panjang nomor lokal (tanpa kode negara): 9–13 digit. */
export function isValidLocalPhone(local: string): boolean {
  let digits = local.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith('62')) digits = digits.slice(2);
  return digits.length >= 9 && digits.length <= 13;
}
