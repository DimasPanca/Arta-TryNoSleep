'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { hasPermission } from '@/constants/roles';
import {
  computeAuditSummary,
  computeTrustScore,
  TONE_COLOR,
  type ActivityLog,
  type AnomalyRecord,
  type AnomalySeverity,
  type AuditModule,
  type BlockchainRecord,
  type ComplianceReport,
  type CoopPortfolio,
  type FabricIntegrity,
  type PortfolioSection,
  type TrustScore,
  type TrustSignals,
} from '@/lib/audit/audit-overview';
import type { TenantRole } from '@/types/tenant';

import {
  ActivityIcon,
  AlertIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChainIcon,
  chaincodeVisual,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  CubeIcon,
  DocumentIcon,
  DownloadIcon,
  FinanceIcon,
  formatRpShort,
  formatTs,
  InfoIcon,
  moduleVisual,
  MembersIcon,
  PillarBar,
  PrinterIcon,
  ProcurementIcon,
  relTime,
  SearchIcon,
  ShareIcon,
  shortHash,
  ShieldCheckIcon,
  Sparkline,
  StockIcon,
  TrustGauge,
  VerifiedSeal,
  XIcon,
  type Visual,
} from './shared';

type Tab = 'anomaly' | 'activity' | 'blockchain' | 'reports' | 'portfolio';

interface Trends {
  anchored: number[];
  disbursed: number[];
  activity: number[];
  trust: number[];
}

interface Props {
  anomalies: AnomalyRecord[];
  activities: ActivityLog[];
  blockchain: BlockchainRecord[];
  reports: ComplianceReport[];
  portfolio: CoopPortfolio;
  fabric: FabricIntegrity;
  signals: TrustSignals;
  trends: Trends;
  viewerRole: TenantRole;
  tenantName: string;
  preview: boolean;
}

export function AuditWorkspace({
  anomalies: initAnomalies,
  activities,
  blockchain,
  reports,
  portfolio,
  fabric,
  signals,
  trends,
  viewerRole,
  tenantName,
  preview,
}: Props): ReactNode {
  const [anomalies, setAnomalies] = useState(initAnomalies);
  const [tab, setTab] = useState<Tab>('anomaly');
  const [selected, setSelected] = useState<AnomalyRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canInvestigate = hasPermission(viewerRole, 'audit:investigate');
  const trust = useMemo(() => computeTrustScore(signals), [signals]);
  const summary = useMemo(
    () => computeAuditSummary(anomalies, activities, blockchain, fabric),
    [anomalies, activities, blockchain, fabric],
  );
  const coverage = fabric.totalAnchored + fabric.totalUnanchored > 0
    ? Math.round((fabric.totalAnchored / (fabric.totalAnchored + fabric.totalUnanchored)) * 100)
    : 0;
  const trustDelta = trends.trust.length >= 2 ? trust.score - trends.trust[0]! : 0;

  function resolve(id: string): void {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
    setSelected(null);
    setNotice('Anomali ditandai selesai ditangani.');
  }

  const tabs: Array<{ id: Tab; label: string; Icon: Visual['Icon']; badge?: number }> = [
    { id: 'anomaly', label: 'Anomali', Icon: AlertIcon, badge: summary.criticalCount + summary.warningCount },
    { id: 'activity', label: 'Aktivitas', Icon: ActivityIcon },
    { id: 'blockchain', label: 'Ledger', Icon: CubeIcon, badge: summary.anchoredRecords },
    { id: 'reports', label: 'Laporan', Icon: DocumentIcon },
    { id: 'portfolio', label: 'Portofolio', Icon: ShieldCheckIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="animate-arta-rise arta-no-print">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={fabric.online
              ? { backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-700)' }
              : { backgroundColor: 'var(--color-amber-100)', color: 'var(--color-amber-400)' }}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${fabric.online ? 'animate-pulse' : ''}`} style={{ backgroundColor: fabric.online ? 'var(--color-brand-600)' : 'var(--color-amber-400)' }} />
            Hyperledger Fabric {fabric.online ? 'terhubung' : 'luring'}
          </span>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-card)] px-2.5 py-1 text-[var(--color-text-secondary)]">{tenantName}</span>
          <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-card)] px-2.5 py-1 font-[var(--font-mono)] text-[var(--color-text-muted)]">{fabric.connectedPeers.length} peer aktif</span>
          {preview && <span className="rounded-full bg-[var(--color-amber-100)] px-2.5 py-1 text-[var(--color-amber-400)]">Pratinjau</span>}
        </div>
        <h1 className="mt-2 font-[var(--font-display)] text-[2rem] leading-tight tracking-tight text-[var(--color-text-primary)]">
          Audit &amp; Lembar Kepercayaan
        </h1>
        <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          Setiap angka di halaman ini bersumber dari rekam jejak yang dikunci di Hyperledger Fabric. Mitra pembiayaan dan dinas dapat memverifikasi setiap data secara mandiri, tanpa bergantung pada pernyataan pengurus.
        </p>
      </header>

      {notice && (
        <div className="arta-no-print flex items-center gap-2 rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-4 py-3 text-sm text-[var(--color-brand-800)] animate-arta-rise">
          <CheckIcon className="h-4 w-4 flex-shrink-0" />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="ml-auto cursor-pointer text-[var(--color-brand-700)] hover:text-[var(--color-brand-900)]" aria-label="Tutup"><XIcon className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* HERO — Skor Kepercayaan */}
      <TrustHero trust={trust} fabric={fabric} portfolio={portfolio} trustTrend={trends.trust} delta={trustDelta} />

      {/* KPI strip */}
      <section className="arta-no-print grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pinjaman dicairkan" value={formatRpShort(trends.disbursed[trends.disbursed.length - 1]! * 1_000_000)} color="#2563eb" spark={trends.disbursed} trend={{ up: true, text: '6 bln terakhir' }} Icon={FinanceIcon} />
        <StatCard label="Aktivitas tercatat" value={String(summary.totalActivities)} color="#7c3aed" spark={trends.activity} trend={{ up: true, text: '14 hari' }} Icon={ActivityIcon} />
        <StatCard label="Ter-anchor on-chain" value={String(fabric.totalAnchored)} color="#16a34a" spark={trends.anchored} trend={{ up: true, text: `${coverage}% cakupan` }} Icon={CubeIcon} />
        <AnomalyStatCard critical={summary.criticalCount} warning={summary.warningCount} total={anomalies.length} />
      </section>

      {/* Tabs */}
      <div className="arta-no-print flex flex-wrap gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-1 sm:inline-flex">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${active ? 'bg-[var(--color-brand-600)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'}`}
            >
              <t.Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${active ? 'bg-white/25 text-white' : 'bg-[var(--color-amber-100)] text-[var(--color-amber-400)]'}`}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'anomaly' && <AnomalyTab anomalies={anomalies} canInvestigate={canInvestigate} onSelect={setSelected} onResolve={resolve} />}
      {tab === 'activity' && <ActivityTab activities={activities} />}
      {tab === 'blockchain' && <BlockchainTab records={blockchain} fabric={fabric} />}
      {tab === 'reports' && <ReportsTab reports={reports} />}
      {tab === 'portfolio' && <PortfolioTab portfolio={portfolio} trust={trust} fabric={fabric} viewerRole={viewerRole} onNotice={setNotice} />}

      {selected && <AnomalyDetail anomaly={selected} canInvestigate={canInvestigate} onClose={() => setSelected(null)} onResolve={resolve} />}
    </div>
  );
}

/* ── HERO ─────────────────────────────────────────────────────────── */

function TrustHero({ trust, fabric, portfolio, trustTrend, delta }: {
  trust: TrustScore;
  fabric: FabricIntegrity;
  portfolio: CoopPortfolio;
  trustTrend: number[];
  delta: number;
}): ReactNode {
  const tone = TONE_COLOR[trust.tone];
  return (
    <section className="arta-no-print relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] animate-arta-rise">
      {/* dekor */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-[0.07]" style={{ background: `radial-gradient(circle, ${tone}, transparent 70%)` }} />
        <div className="absolute inset-0 opacity-[0.4]" style={{ background: 'linear-gradient(135deg, var(--color-brand-50), transparent 45%)' }} />
      </div>

      <div className="relative grid gap-6 p-5 lg:grid-cols-[260px_1fr_auto] lg:p-6">
        {/* Gauge */}
        <div className="flex flex-col items-center justify-center border-b border-[var(--color-border)] pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Skor Kepercayaan</p>
          <TrustGauge score={trust.score} tone={trust.tone} grade={trust.grade} />
          <p className="-mt-2 text-sm font-semibold" style={{ color: tone }}>{trust.verdict}</p>
          {trustTrend.length >= 2 && (
            <div className="mt-2 flex items-center gap-2">
              <Sparkline points={trustTrend} color={tone} width={70} height={22} />
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: delta >= 0 ? '#16a34a' : '#dc2626' }}>
                {delta >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}{delta >= 0 ? '+' : ''}{delta} pts
              </span>
            </div>
          )}
        </div>

        {/* Pilar */}
        <div className="flex flex-col justify-center">
          <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Komponen penilaian (berbasis data on-chain)</p>
          <ul className="space-y-2.5">
            {trust.pillars.map((p) => (
              <li key={p.key}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                    {p.label}
                    <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 font-[var(--font-mono)] text-[10px] text-[var(--color-text-muted)]">{Math.round(p.weight * 100)}%</span>
                  </span>
                  <span className={`font-[var(--font-mono)] font-semibold ${p.good ? 'text-[#16a34a]' : 'text-[#d97706]'}`}>{p.display}</span>
                </div>
                <PillarBar score={p.score} color={p.good ? 'var(--color-brand-600)' : '#d97706'} />
              </li>
            ))}
          </ul>
        </div>

        {/* Verifikasi */}
        <div className="flex flex-col justify-center gap-3 border-t border-[var(--color-border)] pt-5 lg:w-64 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <VerifiedSeal />
          <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
            Skor dihitung dari <strong>{fabric.totalAnchored} transaksi</strong> yang terkunci di ledger lintas {fabric.connectedPeers.length} koperasi. Tidak dapat dimanipulasi sepihak.
          </p>
          <dl className="space-y-1.5 rounded-xl bg-[var(--color-surface)] p-3 text-[11px]">
            <div className="flex justify-between gap-2"><dt className="text-[var(--color-text-muted)]">Channel</dt><dd className="font-[var(--font-mono)] text-[var(--color-text-secondary)]">arta-channel</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--color-text-muted)]">Berdiri sejak</dt><dd className="font-medium text-[var(--color-text-secondary)]">{portfolio.establishedYear}</dd></div>
            {portfolio.portfolioHash && (
              <div className="flex justify-between gap-2"><dt className="text-[var(--color-text-muted)]">Hash</dt><dd className="font-[var(--font-mono)] text-[var(--color-text-secondary)]" title={portfolio.portfolioHash}>{shortHash(portfolio.portfolioHash)}</dd></div>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ── KPI cards ────────────────────────────────────────────────────── */

function StatCard({ label, value, color, spark, trend, Icon }: {
  label: string;
  value: string;
  color: string;
  spark: number[];
  trend: { up: boolean; text: string };
  Icon: Visual['Icon'];
}): ReactNode {
  return (
    <article className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4 transition-colors hover:border-[var(--color-brand-200)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
          <p className="mt-1 font-[var(--font-display)] text-[1.9rem] leading-none text-[var(--color-text-primary)]">{value}</p>
        </div>
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: trend.up ? '#16a34a' : 'var(--color-text-muted)' }}>
          {trend.up && <ArrowUpIcon />}{trend.text}
        </span>
        <Sparkline points={spark} color={color} />
      </div>
    </article>
  );
}

function AnomalyStatCard({ critical, warning, total }: { critical: number; warning: number; total: number }): ReactNode {
  const active = critical + warning;
  const alert = critical > 0;
  return (
    <article className="rounded-xl border p-4 transition-colors" style={alert ? { borderColor: '#fca5a5', backgroundColor: '#fee2e255' } : { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-card)' }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">Anomali aktif</p>
          <p className="mt-1 font-[var(--font-display)] text-[1.9rem] leading-none text-[var(--color-text-primary)]">{active}</p>
        </div>
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg" style={{ backgroundColor: alert ? '#dc2626' : '#fef3c7', color: alert ? '#fff' : '#d97706' }}>
          <AlertIcon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="h-2 w-2 rounded-sm bg-[#dc2626]" /><span className="text-[var(--color-text-secondary)]">{critical} kritis</span>
          <span className="ml-2 h-2 w-2 rounded-sm bg-[#d97706]" /><span className="text-[var(--color-text-secondary)]">{warning} peringatan</span>
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)]">{total} total termonitor</p>
      </div>
    </article>
  );
}

/* ── Tab Anomali ──────────────────────────────────────────────────── */

function AnomalyTab({ anomalies, canInvestigate, onSelect, onResolve }: {
  anomalies: AnomalyRecord[];
  canInvestigate: boolean;
  onSelect: (a: AnomalyRecord) => void;
  onResolve: (id: string) => void;
}): ReactNode {
  const [sev, setSev] = useState<AnomalySeverity | 'all'>('all');
  const [mod, setMod] = useState<AuditModule | 'all'>('all');
  const [showResolved, setShowResolved] = useState(false);

  const active = anomalies.filter((a) => !a.resolved);
  const sevCount = {
    critical: active.filter((a) => a.severity === 'critical').length,
    warning: active.filter((a) => a.severity === 'warning').length,
    info: active.filter((a) => a.severity === 'info').length,
  };
  const totalActive = active.length || 1;

  const filtered = anomalies.filter((a) => {
    if (!showResolved && a.resolved) return false;
    if (sev !== 'all' && a.severity !== sev) return false;
    if (mod !== 'all' && a.module !== mod) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Risk meter */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Sebaran risiko anomali aktif</p>
          <span className="text-xs text-[var(--color-text-muted)]">{active.length} aktif</span>
        </div>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-[var(--color-surface)]">
          <div style={{ width: `${(sevCount.critical / totalActive) * 100}%`, backgroundColor: '#dc2626' }} />
          <div style={{ width: `${(sevCount.warning / totalActive) * 100}%`, backgroundColor: '#d97706' }} />
          <div style={{ width: `${(sevCount.info / totalActive) * 100}%`, backgroundColor: '#2563eb' }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <Legend color="#dc2626" label={`${sevCount.critical} Kritis`} />
          <Legend color="#d97706" label={`${sevCount.warning} Peringatan`} />
          <Legend color="#2563eb" label={`${sevCount.info} Info`} />
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'critical', 'warning', 'info'] as const).map((s) => {
          const on = sev === s;
          const c = s === 'critical' ? '#dc2626' : s === 'warning' ? '#d97706' : s === 'info' ? '#2563eb' : 'var(--color-brand-600)';
          return (
            <button key={s} type="button" onClick={() => setSev(s)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              style={on ? { backgroundColor: `${c}15`, color: c, borderColor: c } : { backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
              {s === 'all' ? 'Semua' : s === 'critical' ? 'Kritis' : s === 'warning' ? 'Peringatan' : 'Info'}
            </button>
          );
        })}
        <select value={mod} onChange={(e) => setMod(e.target.value as AuditModule | 'all')}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none cursor-pointer">
          <option value="all">Semua modul</option>
          {(['finance', 'stock', 'members', 'procurement', 'blockchain'] as AuditModule[]).map((m) => (
            <option key={m} value={m}>{moduleVisual(m).label}</option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] cursor-pointer">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-[var(--color-brand-600)]" />
          Tampilkan selesai
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyBox Icon={CheckIcon} title="Tidak ada anomali aktif" desc="Sistem berjalan normal." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a) => <AnomalyCard key={a.id} a={a} canInvestigate={canInvestigate} onSelect={onSelect} onResolve={onResolve} />)}
        </div>
      )}
    </div>
  );
}

const SEV_VISUAL: Record<AnomalySeverity, { color: string; bg: string; label: string; Icon: Visual['Icon'] }> = {
  critical: { color: '#dc2626', bg: '#fee2e2', label: 'Kritis', Icon: AlertIcon },
  warning: { color: '#d97706', bg: '#fef3c7', label: 'Peringatan', Icon: AlertIcon },
  info: { color: '#2563eb', bg: '#dbeafe', label: 'Info', Icon: InfoIcon },
};

function AnomalyCard({ a, canInvestigate, onSelect, onResolve }: {
  a: AnomalyRecord;
  canInvestigate: boolean;
  onSelect: (a: AnomalyRecord) => void;
  onResolve: (id: string) => void;
}): ReactNode {
  const sv = SEV_VISUAL[a.severity];
  const mv = moduleVisual(a.module);
  return (
    <div className={`relative flex gap-3 overflow-hidden rounded-xl border bg-[var(--color-surface-card)] p-4 pl-5 transition-all ${a.resolved ? 'opacity-60' : ''}`}
      style={{ borderColor: a.resolved ? 'var(--color-border)' : sv.color + '55' }}>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: sv.color }} />
      <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: sv.color }}>
        <sv.Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{a.title}</p>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: sv.bg, color: sv.color }}>{sv.label}</span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${mv.color}15`, color: mv.color }}>
            <mv.Icon className="h-3 w-3" />{mv.label}
          </span>
          {a.resolved && <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold text-[#16a34a]"><CheckIcon className="h-2.5 w-2.5" />Selesai</span>}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{a.description}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--color-text-muted)]">
          {a.actor && <span>Aktor: <span className="font-medium text-[var(--color-text-secondary)]">{a.actor}</span></span>}
          {a.entityRef && <span className="font-[var(--font-mono)]">{a.entityRef}</span>}
          <span className="inline-flex items-center gap-1"><ClockIcon className="h-3 w-3" />{relTime(a.detectedAt)}</span>
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-2">
        {a.requiresInvestigation && canInvestigate && !a.resolved && (
          <button type="button" onClick={() => onSelect(a)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer" style={{ backgroundColor: sv.color }}>Investigasi</button>
        )}
        {!a.resolved && (
          <button type="button" onClick={() => onResolve(a.id)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-400)] cursor-pointer">Tandai selesai</button>
        )}
      </div>
    </div>
  );
}

function AnomalyDetail({ anomaly: a, canInvestigate, onClose, onResolve }: {
  anomaly: AnomalyRecord;
  canInvestigate: boolean;
  onClose: () => void;
  onResolve: (id: string) => void;
}): ReactNode {
  const sv = SEV_VISUAL[a.severity];
  const mv = moduleVisual(a.module);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)] animate-arta-rise">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ backgroundColor: sv.color }}><sv.Icon className="h-6 w-6" /></span>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">{a.title}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: sv.color }}><mv.Icon className="h-3 w-3" />{sv.label} · {mv.label}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] cursor-pointer" aria-label="Tutup"><XIcon /></button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <p className="leading-relaxed text-[var(--color-text-secondary)]">{a.description}</p>
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--color-surface)] p-3 text-xs">
            <div><dt className="text-[var(--color-text-muted)]">Waktu deteksi</dt><dd className="mt-0.5 font-medium">{formatTs(a.detectedAt)}</dd></div>
            {a.actor && <div><dt className="text-[var(--color-text-muted)]">Aktor</dt><dd className="mt-0.5 font-medium">{a.actor}</dd></div>}
            {a.entityRef && <div><dt className="text-[var(--color-text-muted)]">Entitas</dt><dd className="mt-0.5 font-[var(--font-mono)]">{a.entityRef}</dd></div>}
            <div><dt className="text-[var(--color-text-muted)]">Status</dt><dd className="mt-0.5 font-medium">{a.resolved ? 'Selesai' : 'Aktif'}</dd></div>
          </dl>
          {a.requiresInvestigation && !canInvestigate && (
            <p className="rounded-lg bg-[var(--color-amber-100)] px-3 py-2 text-xs text-[var(--color-amber-400)]">Investigasi detail hanya untuk ketua, wakil, atau dinas.</p>
          )}
        </div>
        {!a.resolved && (
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] cursor-pointer">Tutup</button>
            <button type="button" onClick={() => onResolve(a.id)} className="rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)] cursor-pointer">Tandai selesai</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tab Aktivitas (timeline spine) ───────────────────────────────── */

function ActivityTab({ activities }: { activities: ActivityLog[] }): ReactNode {
  const [query, setQuery] = useState('');
  const [mod, setMod] = useState<ActivityLog['module'] | 'all'>('all');

  const filtered = activities.filter((a) => {
    if (mod !== 'all' && a.module !== mod) return false;
    if (query && !a.description.toLowerCase().includes(query.toLowerCase()) && !a.actor.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"><SearchIcon /></span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari aktor atau aktivitas…"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-400)] placeholder:text-[var(--color-text-muted)]" />
        </label>
        <select value={mod} onChange={(e) => setMod(e.target.value as ActivityLog['module'] | 'all')}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none cursor-pointer">
          <option value="all">Semua modul</option>
          <option value="finance">Pembiayaan</option>
          <option value="procurement">Pengadaan</option>
          <option value="stock">Stok</option>
          <option value="members">Anggota</option>
          <option value="system">Sistem</option>
        </select>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4 sm:p-5">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Tidak ada aktivitas cocok.</p>
        ) : (
          <ol className="relative ml-3">
            <span className="absolute left-0 top-2 bottom-2 w-px bg-[var(--color-border)]" aria-hidden />
            {filtered.map((act) => {
              const mv = moduleVisual(act.module);
              return (
                <li key={act.id} className="relative pb-5 pl-7 last:pb-0">
                  <span className="absolute -left-[7px] top-1 grid h-4 w-4 place-items-center rounded-full ring-4 ring-[var(--color-surface-card)]" style={{ backgroundColor: mv.color }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--color-text-primary)]">{act.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--color-text-muted)]">
                        <span className="inline-flex items-center gap-1 font-medium" style={{ color: mv.color }}><mv.Icon className="h-3 w-3" />{mv.label}</span>
                        <span className="font-medium text-[var(--color-text-secondary)]">{act.actor}</span>
                        <span>{act.actorRole}</span>
                        {act.txId && (
                          <span className="inline-flex items-center gap-1 rounded bg-[var(--color-brand-50)] px-1.5 font-[var(--font-mono)] text-[var(--color-brand-700)]">
                            <ChainIcon className="h-3 w-3" />{shortHash(act.txId)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1"><ClockIcon className="h-3 w-3" />{relTime(act.timestamp)}</span>
                      </div>
                    </div>
                    {act.amount && <span className="flex-shrink-0 font-[var(--font-mono)] text-sm font-semibold text-[var(--color-text-primary)]">{formatRpShort(act.amount)}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ── Tab Blockchain (ledger explorer) ─────────────────────────────── */

function BlockchainTab({ records, fabric }: { records: BlockchainRecord[]; fabric: FabricIntegrity }): ReactNode {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(tx: string): void {
    void navigator.clipboard?.writeText(tx);
    setCopied(tx);
    setTimeout(() => setCopied((c) => (c === tx ? null : c)), 1500);
  }
  return (
    <div className="space-y-3">
      {/* Strip channel */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-brand-50)] to-[var(--color-surface-card)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-brand-600)] text-white"><CubeIcon className="h-5 w-5" /></span>
          <div>
            <p className="font-[var(--font-mono)] text-sm font-semibold text-[var(--color-text-primary)]">arta-channel</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">multi-org permissioned ledger</p>
          </div>
        </div>
        <Stat k="Total blok" v={String(fabric.totalAnchored)} />
        <Stat k="Peer terhubung" v={String(fabric.connectedPeers.length)} />
        <Stat k="Menunggu anchor" v={String(fabric.totalUnanchored)} />
        {fabric.lastAnchoredAt && <Stat k="Blok terakhir" v={relTime(fabric.lastAnchoredAt)} />}
      </div>

      <p className="text-xs text-[var(--color-text-secondary)]">Tiap blok dapat diverifikasi langsung ke ledger. Salin txId dan cek di gateway Fabric.</p>

      {/* Ledger */}
      <ol className="relative ml-2">
        <span className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-[var(--color-border)]" aria-hidden />
        {records.map((r) => {
          const cv = chaincodeVisual(r.chaincode);
          return (
            <li key={r.id} className="relative mb-2.5 pl-10 last:mb-0">
              <span className="absolute left-0 top-3 grid h-8 w-8 place-items-center rounded-lg text-white ring-4 ring-[var(--color-surface)]" style={{ backgroundColor: cv.color }}>
                <cv.Icon className="h-4 w-4" />
              </span>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-3.5 transition-colors hover:border-[var(--color-brand-200)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{r.summary}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: `${cv.color}15`, color: cv.color }}>{cv.label}</span>
                      <span className="font-[var(--font-mono)]">{r.fnName}</span>
                      <span>oleh {r.initiator}</span>
                      <span className="inline-flex items-center gap-1"><ClockIcon className="h-3 w-3" />{relTime(r.timestamp)}</span>
                    </div>
                  </div>
                  {r.crossVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold text-[#16a34a]">
                      <ShieldCheckIcon className="h-3 w-3" />cross-verified
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => copy(r.txId)} title="Salin txId"
                  className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 font-[var(--font-mono)] text-[11px] text-[var(--color-brand-700)] transition-colors hover:border-[var(--color-brand-400)] cursor-pointer">
                  <ChainIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{r.txId}</span>
                  {copied === r.txId ? <CheckIcon className="h-3 w-3 flex-shrink-0 text-[#16a34a]" /> : <CopyIcon className="flex-shrink-0" />}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }): ReactNode {
  return (
    <div>
      <p className="text-[11px] text-[var(--color-text-muted)]">{k}</p>
      <p className="font-[var(--font-mono)] text-sm font-semibold text-[var(--color-text-primary)]">{v}</p>
    </div>
  );
}

/* ── Tab Laporan ──────────────────────────────────────────────────── */

const REPORT_VISUAL: Record<ComplianceReport['module'], Visual> = {
  finance: { color: '#2563eb', label: 'Pembiayaan', Icon: FinanceIcon },
  procurement: { color: '#0e7490', label: 'Pengadaan', Icon: ProcurementIcon },
  members: { color: '#7c3aed', label: 'Anggota', Icon: MembersIcon },
  stock: { color: '#16a34a', label: 'Stok', Icon: StockIcon },
};

function ReportsTab({ reports }: { reports: ComplianceReport[] }): ReactNode {
  function exportCsv(rep: ComplianceReport): void {
    const rows = rep.metrics.map((m) => `"${m.label}","${m.value}"`).join('\r\n');
    const csv = `"Laporan","${REPORT_VISUAL[rep.module].label}: ${rep.periodLabel}"\r\n"Label","Nilai"\r\n${rows}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `laporan-${rep.module}-${rep.periodLabel}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {reports.map((rep) => {
        const v = REPORT_VISUAL[rep.module];
        return (
          <article key={rep.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)]">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3" style={{ backgroundColor: `${v.color}0d` }}>
              <span className="grid h-9 w-9 place-items-center rounded-lg text-white" style={{ backgroundColor: v.color }}><v.Icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{v.label} · {rep.periodLabel}</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">Dibuat {relTime(rep.generatedAt)}</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 p-4">
              <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{rep.summary}</p>
              <ul className="space-y-2">
                {rep.metrics.map((m) => (
                  <li key={m.label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[var(--color-text-secondary)]">{m.label}</span>
                    <span className={`inline-flex items-center gap-1 font-[var(--font-mono)] font-semibold ${m.good === true ? 'text-[#16a34a]' : m.good === false ? 'text-[#dc2626]' : 'text-[var(--color-text-primary)]'}`}>
                      {m.value}
                      {m.trend === 'up' && <ArrowUpIcon className="h-3 w-3 text-[#16a34a]" />}
                      {m.trend === 'down' && <ArrowDownIcon className="h-3 w-3 text-[#dc2626]" />}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2.5">
              {rep.anchorTxId ? <VerifiedSeal label={`On-chain ${shortHash(rep.anchorTxId)}`} compact /> : <span className="text-[11px] text-[var(--color-text-muted)]">Belum ter-anchor</span>}
              <button type="button" onClick={() => exportCsv(rep)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-brand-700)] cursor-pointer">
                <DownloadIcon className="h-3.5 w-3.5" />CSV
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ── Tab Portofolio (dossier + PDF) ───────────────────────────────── */

const SECTION_VISUAL: Record<PortfolioSection['icon'], Visual> = {
  finance: { color: '#2563eb', label: 'Pembiayaan', Icon: FinanceIcon },
  procurement: { color: '#0e7490', label: 'Pengadaan', Icon: ProcurementIcon },
  members: { color: '#7c3aed', label: 'Anggota', Icon: MembersIcon },
  stock: { color: '#16a34a', label: 'Stok', Icon: StockIcon },
  integrity: { color: '#3a7a3a', label: 'Integritas', Icon: ChainIcon },
};

function PortfolioTab({ portfolio, trust, fabric, viewerRole, onNotice }: {
  portfolio: CoopPortfolio;
  trust: TrustScore;
  fabric: FabricIntegrity;
  viewerRole: TenantRole;
  onNotice: (s: string) => void;
}): ReactNode {
  const [scope, setScope] = useState<CoopPortfolio['scope']>(portfolio.scope);
  const [shared, setShared] = useState(false);
  const canShare = hasPermission(viewerRole, 'audit:read');
  const tone = TONE_COLOR[trust.tone];
  const shareLink = `arta.app/portofolio/${portfolio.coopId.slice(0, 8)}?token=${portfolio.portfolioHash?.slice(7, 19) ?? 'preview'}`;

  const scopeOptions: Array<{ id: CoopPortfolio['scope']; label: string; desc: string }> = [
    { id: 'full', label: 'Lengkap', desc: 'Semua seksi untuk mitra & dinas terpercaya' },
    { id: 'finance_only', label: 'Keuangan saja', desc: 'Hanya rekam jejak pembiayaan' },
    { id: 'procurement_only', label: 'Pengadaan saja', desc: 'Hanya data pengadaan bersama' },
    { id: 'public_summary', label: 'Ringkasan publik', desc: 'Data minimal tanpa angka sensitif' },
  ];

  const visible = portfolio.sections.filter((s) => {
    if (scope === 'full') return true;
    if (scope === 'finance_only') return s.icon === 'finance' || s.icon === 'integrity';
    if (scope === 'procurement_only') return s.icon === 'procurement' || s.icon === 'integrity';
    if (scope === 'public_summary') return s.icon === 'members' || s.icon === 'integrity';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Kontrol berbagi (tidak ikut cetak) */}
      {canShare && (
        <div className="arta-no-print flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Data yang dibagikan</label>
              <select value={scope} onChange={(e) => setScope(e.target.value as CoopPortfolio['scope'])}
                className="mt-1 block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-3 py-2 text-sm outline-none cursor-pointer">
                {scopeOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <p className="max-w-xs text-[11px] text-[var(--color-text-muted)]">{scopeOptions.find((o) => o.id === scope)?.desc}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-card)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-700)] cursor-pointer">
              <PrinterIcon />Unduh PDF
            </button>
            <button type="button" onClick={() => { setShared(true); onNotice('Tautan portofolio dibuat. Salin & kirim ke mitra atau dinas.'); }}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] cursor-pointer">
              <ShareIcon />{shared ? 'Perbarui tautan' : 'Buat tautan'}
            </button>
          </div>
        </div>
      )}

      {shared && (
        <div className="arta-no-print flex items-center gap-2 rounded-lg border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3 py-2 animate-arta-rise">
          <ChainIcon className="h-4 w-4 flex-shrink-0 text-[var(--color-brand-700)]" />
          <span className="flex-1 truncate font-[var(--font-mono)] text-xs text-[var(--color-brand-700)]">{shareLink}</span>
          <button type="button" onClick={() => navigator.clipboard?.writeText(shareLink)} className="inline-flex items-center gap-1 rounded border border-[var(--color-brand-200)] px-2 py-1 text-[11px] font-semibold text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)] cursor-pointer">
            <CopyIcon />Salin
          </button>
        </div>
      )}

      {/* DOSSIER (ini yang dicetak ke PDF) */}
      <div id="arta-portfolio-dossier" className="space-y-4">
        {/* Sampul */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: `radial-gradient(circle at 90% 0%, ${tone}, transparent 55%)` }} aria-hidden />
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-600)] text-xl font-bold text-white">
                {portfolio.coopName.split(' ').slice(1, 3).map((w) => w[0]).join('')}
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Lembar Kepercayaan Koperasi</p>
                <h2 className="font-[var(--font-display)] text-2xl leading-tight text-[var(--color-text-primary)]">{portfolio.coopName}</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">{portfolio.sector} · {portfolio.location} · est. {portfolio.establishedYear}</p>
                <div className="mt-2"><VerifiedSeal /></div>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Skor</p>
                <p className="font-[var(--font-display)] text-4xl leading-none text-[var(--color-text-primary)]">{trust.score}</p>
              </div>
              <div>
                <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ backgroundColor: tone }}>{trust.grade}</span>
                <p className="mt-1 text-xs font-semibold" style={{ color: tone }}>{trust.verdict}</p>
              </div>
            </div>
          </div>
          {portfolio.portfolioHash && (
            <div className="relative border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 sm:px-6">
              <p className="font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
                Portfolio hash: <span className="text-[var(--color-brand-700)]">{portfolio.portfolioHash}</span> · dibuat {formatTs(portfolio.generatedAt)}
              </p>
            </div>
          )}
        </div>

        {/* Seksi */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((s) => <DossierSection key={s.id} section={s} />)}
        </div>

        {/* Footer verifikasi */}
        <div className="rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-brand-600)] text-white"><ShieldCheckIcon /></span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-brand-800)]">Cara memverifikasi portofolio ini</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-brand-800)]/80">
                Setiap titik hijau di sebelah angka menandai bukti on-chain. Cocokkan txId pada channel <span className="font-[var(--font-mono)]">arta-channel</span> melalui gateway Hyperledger Fabric ({fabric.connectedPeers.length} peer koperasi). Data tidak dapat diubah setelah dikunci, sehingga angka di sini tidak bisa dimanipulasi sepihak oleh pengurus.
              </p>
            </div>
          </div>
        </div>
      </div>

      {visible.length < portfolio.sections.length && (
        <p className="arta-no-print rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-card)] px-4 py-3 text-center text-xs text-[var(--color-text-muted)]">
          {portfolio.sections.length - visible.length} seksi disembunyikan oleh scope &ldquo;<strong>{scopeOptions.find((o) => o.id === scope)?.label}</strong>&rdquo;.
        </p>
      )}
    </div>
  );
}

function DossierSection({ section }: { section: PortfolioSection }): ReactNode {
  const v = SECTION_VISUAL[section.icon];
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3" style={{ backgroundColor: `${v.color}0d` }}>
        <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ backgroundColor: v.color }}><v.Icon className="h-[18px] w-[18px]" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{section.title}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Diperbarui {relTime(section.lastUpdated)}</p>
        </div>
        {section.sectionAnchorTxId && <VerifiedSeal label="on-chain" compact />}
      </div>
      <ul className="flex-1 divide-y divide-[var(--color-border)]">
        {section.metrics.map((m) => (
          <li key={m.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-xs text-[var(--color-text-secondary)]">{m.label}</p>
              {m.sub && <p className="text-[10px] text-[var(--color-text-muted)]">{m.sub}</p>}
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <span className={`font-[var(--font-mono)] text-sm font-semibold ${m.good === true ? 'text-[#16a34a]' : m.good === false ? 'text-[#dc2626]' : 'text-[var(--color-text-primary)]'}`}>{m.value}</span>
              {m.trend === 'up' && <ArrowUpIcon className="h-3 w-3 text-[#16a34a]" />}
              {m.anchorTxId && <span title={`Fabric txId: ${m.anchorTxId}`} className="h-2 w-2 rounded-full bg-[var(--color-brand-600)]" />}
            </div>
          </li>
        ))}
      </ul>
      {section.sectionAnchorTxId && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-brand-50)]/40 px-4 py-1.5">
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-brand-700)]">anchor: {shortHash(section.sectionAnchorTxId)}</p>
        </div>
      )}
    </article>
  );
}

/* ── util kecil ───────────────────────────────────────────────────── */

function Legend({ color, label }: { color: string; label: string }): ReactNode {
  return (
    <span className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />{label}
    </span>
  );
}

function EmptyBox({ Icon, title, desc }: { Icon: Visual['Icon']; title: string; desc: string }): ReactNode {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"><Icon className="h-6 w-6" /></span>
      <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{desc}</p>
    </div>
  );
}
