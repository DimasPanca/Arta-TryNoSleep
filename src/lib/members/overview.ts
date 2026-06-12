/**
 * Model & perhitungan untuk modul Anggota (keanggotaan koperasi).
 *
 * Pure & client-safe — diimpor oleh komponen klien `MembersWorkspace`.
 * Mengandung tipe data, ringkasan komposisi peran, dan — yang terpenting —
 * "guard" wewenang yang menjawab: siapa boleh mengundang, mengubah peran,
 * dan mengeluarkan anggota; siapa yang hanya bisa melihat.
 *
 * Sumber kebenaran izin per-peran ada di `src/constants/roles.ts`. Guard di
 * sini membungkus izin tersebut dengan aturan bisnis tambahan (mis. operator
 * tidak boleh menyentuh pimpinan, tidak boleh mengubah peran diri sendiri).
 */

import { hasPermission } from '@/constants/roles';
import { ROLE_META, ROLE_ORDER, TIER_ORDER, type RoleTier } from '@/lib/members/roles-meta';
import type { TenantRole } from '@/types/tenant';

export type MemberAccountStatus = 'active' | 'pending' | 'inactive';

export interface MemberRecord {
  id: string;
  fullName: string;
  role: TenantRole;
  status: MemberAccountStatus;
  /** Nomor telepon (boleh tersamar sebagian untuk privasi pratinjau). */
  phone: string;
  /** ISO — tanggal bergabung / aktif. */
  joinedAt: string;
  /** ISO — aktivitas terakhir (opsional). */
  lastActiveAt?: string;
  /** Nama pengundang (opsional). */
  invitedByName?: string;
  /** ISO — kapan mendaftar (untuk yang berstatus pending). */
  appliedAt?: string;
}

export type InviteState = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface InviteRecord {
  id: string;
  phone: string;
  /** Undangan hanya untuk peran staf — anggota mendaftar sendiri. */
  role: Exclude<TenantRole, 'anggota'>;
  note?: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
  state: InviteState;
  /** Token tautan undangan. */
  token: string;
}

/* ── Ringkasan komposisi ──────────────────────────────────────────── */

export interface MemberSummary {
  totalActive: number;
  pendingApprovals: number;
  openInvites: number;
  leadershipCount: number;
  externalCount: number;
  roleCounts: Record<TenantRole, number>;
  tierCounts: Record<RoleTier, number>;
}

function emptyRoleCounts(): Record<TenantRole, number> {
  return ROLE_ORDER.reduce(
    (acc, r) => {
      acc[r] = 0;
      return acc;
    },
    {} as Record<TenantRole, number>,
  );
}

function emptyTierCounts(): Record<RoleTier, number> {
  return TIER_ORDER.reduce(
    (acc, t) => {
      acc[t] = 0;
      return acc;
    },
    {} as Record<RoleTier, number>,
  );
}

export function computeMemberSummary(
  active: MemberRecord[],
  pending: MemberRecord[],
  invites: InviteRecord[],
): MemberSummary {
  const roleCounts = emptyRoleCounts();
  const tierCounts = emptyTierCounts();
  let leadershipCount = 0;
  let externalCount = 0;

  for (const m of active) {
    roleCounts[m.role] += 1;
    const meta = ROLE_META[m.role];
    tierCounts[meta.tier] += 1;
    if (meta.tier === 'pimpinan') leadershipCount += 1;
    if (meta.external) externalCount += 1;
  }

  return {
    totalActive: active.length,
    pendingApprovals: pending.length,
    openInvites: invites.filter((i) => i.state === 'pending').length,
    leadershipCount,
    externalCount,
    roleCounts,
    tierCounts,
  };
}

/* ── Guard wewenang ───────────────────────────────────────────────── */

const LEADERSHIP: TenantRole[] = ['ketua', 'wakil_ketua'];
const PROTECTED_FROM_OPERATOR: TenantRole[] = ['ketua', 'wakil_ketua', 'bendahara'];

/** Bisakah peran ini membuka modul kelola anggota sama sekali? */
export function canManageMembers(role: TenantRole): boolean {
  return hasPermission(role, 'members:manage');
}

export function canInviteMembers(role: TenantRole): boolean {
  return hasPermission(role, 'members:invite');
}

export function canApproveMembers(role: TenantRole): boolean {
  return hasPermission(role, 'members:approve');
}

/**
 * Peran yang boleh diundang oleh aktor.
 * - ketua/wakil → semua peran staf (kecuali ketua & anggota).
 * - operator → hanya kasir, mitra, dinas (sesuai RLS migrasi 006).
 */
export function invitableRoles(actor: TenantRole): Array<Exclude<TenantRole, 'anggota'>> {
  if (LEADERSHIP.includes(actor)) {
    return ['wakil_ketua', 'bendahara', 'operator', 'kasir', 'mitra', 'dinas'];
  }
  if (actor === 'operator') return ['kasir', 'mitra', 'dinas'];
  return [];
}

/**
 * Peran yang boleh ditetapkan aktor saat mengubah peran anggota lain.
 * - ketua/wakil → semua peran.
 * - operator → hanya kasir, anggota, mitra, dinas (tak boleh ke pimpinan/bendahara).
 */
export function assignableRoles(actor: TenantRole): TenantRole[] {
  if (LEADERSHIP.includes(actor)) {
    return [...ROLE_ORDER];
  }
  if (actor === 'operator') return ['kasir', 'anggota', 'mitra', 'dinas'];
  return [];
}

/** Bisakah aktor mengubah peran anggota target? */
export function canChangeRole(actor: TenantRole, target: MemberRecord, actorId: string): boolean {
  if (!canManageMembers(actor)) return false;
  if (target.id === actorId) return false; // tak boleh ubah peran sendiri
  if (actor === 'operator' && PROTECTED_FROM_OPERATOR.includes(target.role)) return false;
  return true;
}

/** Bisakah aktor mengeluarkan / menonaktifkan anggota target? */
export function canRemoveMember(actor: TenantRole, target: MemberRecord, actorId: string): boolean {
  if (!canManageMembers(actor)) return false;
  if (target.id === actorId) return false; // tak boleh keluarkan diri sendiri
  if (actor === 'operator' && PROTECTED_FROM_OPERATOR.includes(target.role)) return false;
  // Ketua hanya boleh dikeluarkan oleh ketua.
  if (target.role === 'ketua' && actor !== 'ketua') return false;
  return true;
}

/** Alasan singkat mengapa aktor tak bisa mengelola target (untuk UI). */
export function manageBlockedReason(actor: TenantRole, target: MemberRecord, actorId: string): string | null {
  if (!canManageMembers(actor)) return 'Peran Anda hanya dapat melihat daftar anggota.';
  if (target.id === actorId) return 'Anda tidak dapat mengubah akun Anda sendiri.';
  if (actor === 'operator' && PROTECTED_FROM_OPERATOR.includes(target.role)) {
    return 'Operator tidak dapat mengelola pimpinan atau bendahara.';
  }
  return null;
}

/* ── Util tampilan ────────────────────────────────────────────────── */

export interface InviteStateMeta {
  label: string;
  color: string;
  bg: string;
}

export const INVITE_STATE_META: Record<InviteState, InviteStateMeta> = {
  pending: { label: 'Menunggu', color: 'var(--color-amber-400)', bg: 'var(--color-amber-100)' },
  accepted: { label: 'Diterima', color: 'var(--color-grade-a)', bg: '#dcfce7' },
  expired: { label: 'Kedaluwarsa', color: 'var(--color-text-muted)', bg: 'var(--color-surface)' },
  revoked: { label: 'Dibatalkan', color: 'var(--color-danger-400)', bg: 'var(--color-danger-100)' },
};

/** Hitung sisa hari menuju kedaluwarsa (negatif bila lewat). */
export function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return 0;
  return Math.ceil((target - Date.now()) / 864e5);
}
