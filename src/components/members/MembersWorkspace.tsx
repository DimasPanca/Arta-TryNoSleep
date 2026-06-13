'use client';

import { useMemo, useState, type ReactNode } from 'react';

import {
  assignableRoles,
  canApproveMembers,
  canChangeRole,
  canInviteMembers,
  canManageMembers,
  canRemoveMember,
  computeMemberSummary,
  daysUntil,
  INVITE_STATE_META,
  invitableRoles,
  manageBlockedReason,
  type InviteRecord,
  type MemberRecord,
} from '@/lib/members/overview';
import { ROLE_META, rolesInTier, TIER_META, TIER_ORDER } from '@/lib/members/roles-meta';
import type { TenantRole } from '@/types/tenant';

import {
  CalendarIcon,
  ChevronRightIcon,
  CheckIcon,
  ClockIcon,
  formatDate,
  LinkIcon,
  MemberAvatar,
  OrgDonut,
  PhoneIcon,
  PlusIcon,
  relativeTime,
  RoleBadge,
  SearchIcon,
  SendIcon,
  ShieldIcon,
  StatusDot,
  SwapIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from './shared';

interface MembersWorkspaceProps {
  members: MemberRecord[];
  pending: MemberRecord[];
  invites: InviteRecord[];
  viewerRole: TenantRole;
  viewerId: string;
  tenantName: string;
  preview: boolean;
}

type Tab = 'directory' | 'pending' | 'invites';

export function MembersWorkspace({
  members: initialMembers,
  pending: initialPending,
  invites: initialInvites,
  viewerRole,
  viewerId,
  tenantName,
  preview,
}: MembersWorkspaceProps): ReactNode {
  const [members, setMembers] = useState(initialMembers);
  const [pending, setPending] = useState(initialPending);
  const [invites, setInvites] = useState(initialInvites);
  const [tab, setTab] = useState<Tab>('directory');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<TenantRole | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canManage = canManageMembers(viewerRole);
  const canInvite = canInviteMembers(viewerRole);
  const canApprove = canApproveMembers(viewerRole);

  const summary = useMemo(
    () => computeMemberSummary(members, pending, invites),
    [members, pending, invites],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (q && !m.fullName.toLowerCase().includes(q) && !m.phone.includes(q)) return false;
      return true;
    });
  }, [members, query, roleFilter]);

  const selected = members.find((m) => m.id === selectedId) ?? null;

  function flash(msg: string): void {
    setNotice(msg);
  }

  function handleChangeRole(id: string, role: TenantRole): void {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    flash(`Peran ${members.find((m) => m.id === id)?.fullName ?? 'anggota'} diubah menjadi ${ROLE_META[role].label}.`);
  }

  function handleRemove(id: string): void {
    const m = members.find((x) => x.id === id);
    setMembers((prev) => prev.filter((x) => x.id !== id));
    setSelectedId(null);
    flash(`${m?.fullName ?? 'Anggota'} dikeluarkan dari koperasi.`);
  }

  function handleApprove(id: string): void {
    const p = pending.find((x) => x.id === id);
    if (!p) return;
    setPending((prev) => prev.filter((x) => x.id !== id));
    setMembers((prev) => [{ ...p, status: 'active', joinedAt: new Date().toISOString() }, ...prev]);
    flash(`Pendaftaran ${p.fullName} disetujui. Kini anggota aktif.`);
  }

  function handleReject(id: string): void {
    const p = pending.find((x) => x.id === id);
    setPending((prev) => prev.filter((x) => x.id !== id));
    flash(`Pendaftaran ${p?.fullName ?? ''} ditolak.`);
  }

  function handleRevokeInvite(id: string): void {
    setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, state: 'revoked' } : i)));
    flash('Undangan dibatalkan.');
  }

  function handleResendInvite(id: string): void {
    setInvites((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, state: 'pending', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 864e5).toISOString() }
          : i,
      ),
    );
    flash('Undangan dikirim ulang. Berlaku 7 hari.');
  }

  function handleCreateInvite(invite: InviteRecord): void {
    setInvites((prev) => [invite, ...prev]);
    setInviting(false);
    setTab('invites');
    flash(`Undangan untuk ${ROLE_META[invite.role].label} dibuat. Bagikan tautan ke nomor tujuan.`);
  }

  return (
    <div className="space-y-6">
      <Header
        tenantName={tenantName}
        viewerRole={viewerRole}
        preview={preview}
        canInvite={canInvite}
        canManage={canManage}
        canApprove={canApprove}
        onInvite={() => setInviting(true)}
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-4 py-3 text-sm text-[var(--color-brand-800)] animate-arta-rise">
          <CheckIcon className="h-4 w-4 flex-shrink-0" />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto cursor-pointer text-[var(--color-brand-700)] hover:text-[var(--color-brand-900)]"
            aria-label="Tutup"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Anggota aktif" value={summary.totalActive} helper={`${summary.externalCount} lembaga eksternal`} icon={<UsersIcon />} />
        <MetricCard
          label="Menunggu persetujuan"
          value={summary.pendingApprovals}
          helper={summary.pendingApprovals > 0 ? 'perlu ditinjau' : 'tidak ada antrean'}
          icon={<ClockIcon />}
          tone={summary.pendingApprovals > 0 ? 'amber' : 'plain'}
        />
        <MetricCard label="Undangan terkirim" value={summary.openInvites} helper="menunggu diterima" icon={<SendIcon />} />
        <MetricCard label="Pimpinan" value={summary.leadershipCount} helper="ketua & wakil" icon={<ShieldIcon />} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Kolom utama */}
        <div className="space-y-4 xl:col-span-8">
          <Tabs tab={tab} onChange={setTab} pendingCount={summary.pendingApprovals} inviteCount={summary.openInvites} />

          {tab === 'directory' && (
            <DirectoryTab
              members={filtered}
              total={members.length}
              query={query}
              roleFilter={roleFilter}
              viewerRole={viewerRole}
              viewerId={viewerId}
              onQuery={setQuery}
              onRoleFilter={setRoleFilter}
              onSelect={setSelectedId}
            />
          )}

          {tab === 'pending' && (
            <PendingTab pending={pending} canApprove={canApprove} onApprove={handleApprove} onReject={handleReject} />
          )}

          {tab === 'invites' && (
            <InvitesTab
              invites={invites}
              canManage={canInvite}
              onRevoke={handleRevokeInvite}
              onResend={handleResendInvite}
              onInvite={() => setInviting(true)}
            />
          )}
        </div>

        {/* Sisi kanan: komposisi + panduan wewenang */}
        <div className="space-y-4 xl:col-span-4">
          <CompositionPanel summary={summary} />
          <RoleGuidePanel viewerRole={viewerRole} />
        </div>
      </div>

      {selected && (
        <MemberDetail
          member={selected}
          viewerRole={viewerRole}
          viewerId={viewerId}
          onClose={() => setSelectedId(null)}
          onChangeRole={handleChangeRole}
          onRemove={handleRemove}
        />
      )}

      {inviting && (
        <InviteModal viewerRole={viewerRole} preview={preview} onClose={() => setInviting(false)} onCreate={handleCreateInvite} />
      )}
    </div>
  );
}

/* ── Header ───────────────────────────────────────────────────────── */

function Header({
  tenantName,
  viewerRole,
  preview,
  canInvite,
  canManage,
  canApprove,
  onInvite,
}: {
  tenantName: string;
  viewerRole: TenantRole;
  preview: boolean;
  canInvite: boolean;
  canManage: boolean;
  canApprove: boolean;
  onInvite: () => void;
}): ReactNode {
  return (
    <header className="animate-arta-rise">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-card)] px-2.5 py-1 text-[var(--color-text-secondary)]">
              {tenantName}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-card)] px-2.5 py-1 text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
              Masuk sebagai <RoleBadge role={viewerRole} size="sm" />
            </span>
            {preview && (
              <span className="rounded-full bg-[var(--color-amber-100)] px-2.5 py-1 text-[var(--color-amber-400)]">
                Pratinjau lokal
              </span>
            )}
          </div>
          <h1 className="mt-2 font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
            Anggota koperasi
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
            Kelola keanggotaan, peran, dan undangan bergabung. Wewenang tiap tindakan menyesuaikan peran Anda.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 lg:items-end">
          {canInvite ? (
            <button
              type="button"
              onClick={onInvite}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
            >
              <PlusIcon />
              Undang anggota
            </button>
          ) : (
            <span className="rounded-lg border border-dashed border-[var(--color-border-strong)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
              Peran Anda tidak dapat mengundang
            </span>
          )}
          <PermissionChips canInvite={canInvite} canManage={canManage} canApprove={canApprove} />
        </div>
      </div>
    </header>
  );
}

function PermissionChips({
  canInvite,
  canManage,
  canApprove,
}: {
  canInvite: boolean;
  canManage: boolean;
  canApprove: boolean;
}): ReactNode {
  const items: Array<{ label: string; on: boolean }> = [
    { label: 'Undang', on: canInvite },
    { label: 'Setujui', on: canApprove },
    { label: 'Ubah & keluarkan', on: canManage },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={
            it.on
              ? { backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }
              : { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' }
          }
        >
          {it.on ? <CheckIcon className="h-3 w-3" /> : <XIcon className="h-2.5 w-2.5" />}
          {it.label}
        </span>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = 'plain',
}: {
  label: string;
  value: number;
  helper: string;
  icon: ReactNode;
  tone?: 'plain' | 'amber';
}): ReactNode {
  const amber = tone === 'amber';
  return (
    <article
      className={`rounded-lg border p-4 transition-colors duration-200 ${
        amber
          ? 'border-[var(--color-amber-400)]/40 bg-[var(--color-amber-100)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-card)] hover:border-[var(--color-brand-200)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
          <p className="mt-1 font-[var(--font-display)] text-[2rem] leading-none text-[var(--color-text-primary)]">{value}</p>
        </div>
        <span
          className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${
            amber ? 'bg-[var(--color-amber-400)] text-white' : 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">{helper}</p>
    </article>
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────── */

function Tabs({
  tab,
  onChange,
  pendingCount,
  inviteCount,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  pendingCount: number;
  inviteCount: number;
}): ReactNode {
  const items: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'directory', label: 'Direktori' },
    { id: 'pending', label: 'Persetujuan', count: pendingCount },
    { id: 'invites', label: 'Undangan', count: inviteCount },
  ];
  return (
    <div className="inline-flex w-full gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-1 sm:w-auto">
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer sm:flex-none ${
              active
                ? 'bg-[var(--color-brand-600)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {it.label}
            {typeof it.count === 'number' && it.count > 0 && (
              <span
                className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${
                  active ? 'bg-white/25 text-white' : 'bg-[var(--color-amber-100)] text-[var(--color-amber-400)]'
                }`}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Tab: Direktori ───────────────────────────────────────────────── */

function DirectoryTab({
  members,
  total,
  query,
  roleFilter,
  viewerRole,
  viewerId,
  onQuery,
  onRoleFilter,
  onSelect,
}: {
  members: MemberRecord[];
  total: number;
  query: string;
  roleFilter: TenantRole | 'all';
  viewerRole: TenantRole;
  viewerId: string;
  onQuery: (q: string) => void;
  onRoleFilter: (r: TenantRole | 'all') => void;
  onSelect: (id: string) => void;
}): ReactNode {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Cari nama atau nomor…"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-brand-400)] placeholder:text-[var(--color-text-muted)]"
          />
        </label>
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilter(e.target.value as TenantRole | 'all')}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-brand-400)] cursor-pointer"
          aria-label="Saring peran"
        >
          <option value="all">Semua peran</option>
          {TIER_ORDER.flatMap((tier) =>
            rolesInTier(tier).map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            )),
          )}
        </select>
      </div>

      {members.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-10 text-center">
          <UsersIcon className="h-8 w-8 text-[var(--color-text-muted)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">Tidak ada anggota cocok</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Ubah kata kunci atau saringan peran.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--color-text-muted)]">
            Menampilkan {members.length} dari {total} anggota
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {members.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                manageable={canChangeRole(viewerRole, m, viewerId) || canRemoveMember(viewerRole, m, viewerId)}
                onSelect={() => onSelect(m.id)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function MemberCard({
  member,
  manageable,
  onSelect,
}: {
  member: MemberRecord;
  manageable: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-3.5 text-left transition-colors hover:border-[var(--color-brand-200)] hover:bg-[var(--color-brand-50)]/40 cursor-pointer"
    >
      <MemberAvatar name={member.fullName} role={member.role} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{member.fullName}</p>
        <div className="mt-1 flex items-center gap-2">
          <RoleBadge role={member.role} size="sm" />
        </div>
        <p className="mt-1.5 truncate font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">{member.phone}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 self-stretch">
        <StatusDot status={member.status} />
        <span className="text-[10px] text-[var(--color-text-muted)]">{relativeTime(member.lastActiveAt)}</span>
        <span className="mt-auto text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-brand-600)]">
          <ChevronRightIcon />
        </span>
      </div>
      {manageable && <span className="sr-only">dapat dikelola</span>}
    </button>
  );
}

/* ── Tab: Persetujuan ─────────────────────────────────────────────── */

function PendingTab({
  pending,
  canApprove,
  onApprove,
  onReject,
}: {
  pending: MemberRecord[];
  canApprove: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}): ReactNode {
  if (pending.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
          <CheckIcon className="h-6 w-6" />
        </span>
        <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Tidak ada antrean persetujuan</p>
        <p className="mt-1 max-w-xs text-xs text-[var(--color-text-secondary)]">
          Pendaftaran mandiri anggota baru akan muncul di sini untuk ditinjau.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {!canApprove && (
        <p className="rounded-lg bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
          Peran Anda hanya dapat melihat antrean. Persetujuan dilakukan oleh ketua, wakil, atau operator.
        </p>
      )}
      {pending.map((p) => (
        <div
          key={p.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-3.5 animate-arta-rise"
        >
          <MemberAvatar name={p.fullName} role={p.role} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{p.fullName}</p>
            <p className="mt-0.5 truncate font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">{p.phone}</p>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              Mendaftar mandiri sebagai <span className="font-medium">anggota</span> · {relativeTime(p.appliedAt)}
            </p>
          </div>
          {canApprove && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onReject(p.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-danger-400)] hover:text-[var(--color-danger-400)] cursor-pointer"
              >
                <XIcon className="h-3.5 w-3.5" />
                Tolak
              </button>
              <button
                type="button"
                onClick={() => onApprove(p.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-600)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Setujui
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Undangan ────────────────────────────────────────────────── */

function InvitesTab({
  invites,
  canManage,
  onRevoke,
  onResend,
  onInvite,
}: {
  invites: InviteRecord[];
  canManage: boolean;
  onRevoke: (id: string) => void;
  onResend: (id: string) => void;
  onInvite: () => void;
}): ReactNode {
  if (invites.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
          <SendIcon className="h-6 w-6" />
        </span>
        <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Belum ada undangan terkirim</p>
        {canManage && (
          <button
            type="button"
            onClick={onInvite}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer"
          >
            <PlusIcon />
            Undang anggota
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {invites.map((inv) => (
        <InviteRow key={inv.id} invite={inv} canManage={canManage} onRevoke={onRevoke} onResend={onResend} />
      ))}
    </div>
  );
}

function InviteRow({
  invite,
  canManage,
  onRevoke,
  onResend,
}: {
  invite: InviteRecord;
  canManage: boolean;
  onRevoke: (id: string) => void;
  onResend: (id: string) => void;
}): ReactNode {
  const sm = INVITE_STATE_META[invite.state];
  const remaining = daysUntil(invite.expiresAt);
  const link = `arta.app/register?token=${invite.token}`;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-3.5">
      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${ROLE_META[invite.role].accent}1a`, color: ROLE_META[invite.role].accent }}>
        <SendIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-[var(--font-mono)] text-sm font-medium text-[var(--color-text-primary)]">{invite.phone}</p>
          <RoleBadge role={invite.role} size="sm" />
        </div>
        {invite.note && <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">{invite.note}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--color-text-muted)]">
          <span>oleh {invite.createdByName}</span>
          {invite.state === 'pending' && (
            <span className={remaining <= 2 ? 'text-[var(--color-amber-400)]' : ''}>
              {remaining > 0 ? `kedaluwarsa ${remaining} hari lagi` : 'kedaluwarsa hari ini'}
            </span>
          )}
          {invite.state === 'pending' && (
            <span className="inline-flex items-center gap-1 font-[var(--font-mono)]" title={link}>
              <LinkIcon className="h-3 w-3" />
              {link}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: sm.bg, color: sm.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sm.color }} />
          {sm.label}
        </span>
        {canManage && (invite.state === 'pending' || invite.state === 'expired') && (
          <div className="flex items-center gap-1">
            {invite.state === 'expired' && (
              <button
                type="button"
                onClick={() => onResend(invite.id)}
                className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-brand-700)] cursor-pointer"
              >
                Kirim ulang
              </button>
            )}
            {invite.state === 'pending' && (
              <button
                type="button"
                onClick={() => onRevoke(invite.id)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-danger-100)] hover:text-[var(--color-danger-400)] cursor-pointer"
                aria-label="Batalkan undangan"
                title="Batalkan undangan"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Komposisi peran ──────────────────────────────────────────────── */

function CompositionPanel({
  summary,
}: {
  summary: ReturnType<typeof computeMemberSummary>;
}): ReactNode {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Komposisi peran</h2>
      <p className="text-xs text-[var(--color-text-muted)]">Sebaran anggota aktif per tier</p>
      <div className="mt-3 flex justify-center">
        <OrgDonut tierCounts={summary.tierCounts} total={summary.totalActive} />
      </div>
      <ul className="mt-4 space-y-2.5">
        {TIER_ORDER.map((tier) => {
          const count = summary.tierCounts[tier];
          const meta = TIER_META[tier];
          const pct = summary.totalActive > 0 ? (count / summary.totalActive) * 100 : 0;
          return (
            <li key={tier}>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: meta.accent }} />
                  {meta.label}
                </span>
                <span className="font-[var(--font-mono)] text-[var(--color-text-secondary)]">{count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: meta.accent }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── Panduan peran & wewenang ─────────────────────────────────────── */

function RoleGuidePanel({ viewerRole }: { viewerRole: TenantRole }): ReactNode {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Peran & wewenang</h2>
      <p className="text-xs text-[var(--color-text-muted)]">Siapa boleh melakukan apa di koperasi</p>
      <div className="mt-3 space-y-3">
        {TIER_ORDER.map((tier) => (
          <div key={tier}>
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: TIER_META[tier].accent }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIER_META[tier].accent }} />
              {TIER_META[tier].label}
            </p>
            <ul className="space-y-1.5">
              {rolesInTier(tier).map((role) => {
                const meta = ROLE_META[role];
                const isViewer = role === viewerRole;
                return (
                  <li
                    key={role}
                    className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${isViewer ? 'bg-[var(--color-brand-50)] ring-1 ring-[var(--color-brand-200)]' : ''}`}
                  >
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: meta.accent }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text-primary)]">
                        {meta.label}
                        {isViewer && <span className="ml-1 text-[10px] font-semibold text-[var(--color-brand-700)]">(Anda)</span>}
                      </p>
                      <p className="text-[11px] leading-snug text-[var(--color-text-muted)]">{meta.summary}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Slide-over detail anggota ────────────────────────────────────── */

function MemberDetail({
  member,
  viewerRole,
  viewerId,
  onClose,
  onChangeRole,
  onRemove,
}: {
  member: MemberRecord;
  viewerRole: TenantRole;
  viewerId: string;
  onClose: () => void;
  onChangeRole: (id: string, role: TenantRole) => void;
  onRemove: (id: string) => void;
}): ReactNode {
  const [changingRole, setChangingRole] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const allowChangeRole = canChangeRole(viewerRole, member, viewerId);
  const allowRemove = canRemoveMember(viewerRole, member, viewerId);
  const blockedReason = manageBlockedReason(viewerRole, member, viewerId);
  const roleOptions = assignableRoles(viewerRole).filter((r) => r !== member.role);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detail ${member.fullName}`}
        className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface-card)] shadow-[-24px_0_64px_-16px_rgba(0,0,0,0.4)] animate-arta-rise"
      >
        {/* Kepala */}
        <div className="relative overflow-hidden border-b border-[var(--color-border)] p-5">
          <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${ROLE_META[member.role].accent}, transparent 70%)` }} aria-hidden />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <MemberAvatar name={member.fullName} role={member.role} size="xl" ring />
              <div className="min-w-0">
                <h2 className="font-[var(--font-display)] text-xl leading-tight text-[var(--color-text-primary)]">{member.fullName}</h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <RoleBadge role={member.role} />
                  <StatusDot status={member.status} />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] cursor-pointer"
              aria-label="Tutup"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Isi */}
        <div className="flex-1 space-y-5 p-5">
          <dl className="space-y-3">
            <DetailRow icon={<PhoneIcon />} label="Nomor telepon" value={member.phone} mono />
            <DetailRow icon={<CalendarIcon />} label="Bergabung" value={formatDate(member.joinedAt)} />
            <DetailRow icon={<ClockIcon className="h-4 w-4" />} label="Aktif terakhir" value={relativeTime(member.lastActiveAt)} />
            {member.invitedByName && <DetailRow icon={<SendIcon className="h-4 w-4" />} label="Diundang oleh" value={member.invitedByName} />}
          </dl>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Wewenang peran</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{ROLE_META[member.role].summary}</p>
          </div>

          {/* Aksi pengelolaan */}
          {blockedReason ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">{blockedReason}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Tindakan</p>

              {allowChangeRole && (
                <div>
                  {!changingRole ? (
                    <button
                      type="button"
                      onClick={() => setChangingRole(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-brand-400)] hover:bg-[var(--color-brand-50)] cursor-pointer"
                    >
                      <SwapIcon />
                      Ubah peran
                    </button>
                  ) : (
                    <div className="rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-3">
                      <p className="mb-2 text-xs font-semibold text-[var(--color-brand-800)]">Tetapkan peran baru</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {roleOptions.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              onChangeRole(member.id, r);
                              setChangingRole(false);
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-2.5 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-brand-400)] cursor-pointer"
                          >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ROLE_META[r].accent }} />
                            {ROLE_META[r].label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setChangingRole(false)}
                        className="mt-2 w-full text-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              )}

              {allowRemove && (
                <div>
                  {!confirmRemove ? (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-danger-400)]/40 px-4 py-2.5 text-sm font-semibold text-[var(--color-danger-400)] transition-colors hover:bg-[var(--color-danger-100)] cursor-pointer"
                    >
                      <TrashIcon />
                      Keluarkan dari koperasi
                    </button>
                  ) : (
                    <div className="rounded-xl border border-[var(--color-danger-400)]/40 bg-[var(--color-danger-100)] p-3">
                      <p className="text-xs font-medium text-[var(--color-danger-400)]">
                        Keluarkan {member.fullName}? Akses ke koperasi akan dicabut.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(false)}
                          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(member.id)}
                          className="flex-1 rounded-lg bg-[var(--color-danger-400)] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
                        >
                          Ya, keluarkan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}): ReactNode {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] text-[var(--color-text-muted)]">{label}</dt>
        <dd className={`truncate text-sm text-[var(--color-text-primary)] ${mono ? 'font-[var(--font-mono)]' : ''}`}>{value}</dd>
      </div>
    </div>
  );
}

/* ── Modal undangan ───────────────────────────────────────────────── */

function InviteModal({
  viewerRole,
  preview,
  onClose,
  onCreate,
}: {
  viewerRole: TenantRole;
  preview: boolean;
  onClose: () => void;
  onCreate: (invite: InviteRecord) => void;
}): ReactNode {
  const options = invitableRoles(viewerRole);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Exclude<TenantRole, 'anggota'>>(options[0] ?? 'kasir');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const valid = phone.trim().length >= 8;

  async function submit(): Promise<void> {
    if (!valid) return;
    setSubmitting(true);
    if (!preview) await new Promise((r) => setTimeout(r, 400));
    const invite: InviteRecord = {
      id: `inv-${Date.now().toString(36)}`,
      phone: phone.trim(),
      role,
      createdByName: 'Anda',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      state: 'pending',
      token: Math.random().toString(36).slice(2, 14),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    setSubmitting(false);
    onCreate(invite);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Undang anggota baru"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.4)] animate-arta-rise"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-xl text-[var(--color-text-primary)]">Undang anggota</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] cursor-pointer"
            aria-label="Tutup"
          >
            <XIcon />
          </button>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          Tautan undangan dikirim via WhatsApp. Penerima langsung aktif dengan peran yang dipilih saat menerima.
        </p>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Nomor WhatsApp</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+62 812-3456-7890"
              inputMode="tel"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-brand-400)] placeholder:text-[var(--color-text-muted)]"
            />
          </label>

          <div>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Peran</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {options.map((r) => {
                const active = r === role;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--color-brand-400)] bg-[var(--color-brand-50)] text-[var(--color-brand-800)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-200)]'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROLE_META[r].accent }} />
                    {ROLE_META[r].label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-text-muted)]">{ROLE_META[role].summary}</p>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Catatan (opsional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. Kasir gerai cabang"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-brand-400)] placeholder:text-[var(--color-text-muted)]"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <span className="h-4 w-4 animate-arta-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
            Kirim undangan
          </button>
        </div>
      </div>
    </div>
  );
}
