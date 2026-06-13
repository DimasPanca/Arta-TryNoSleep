'use client';

import { motion, useReducedMotion } from 'motion/react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';

/* ──────────────────────────────────────────────────────────────
   Komponen ReactBits (WebGL / GSAP / motion) hanya dieksekusi di
   sisi klien. Dimuat lewat next/dynamic ssr:false agar tidak
   memicu peringatan SSR & WebGL berjalan mulus.
   ────────────────────────────────────────────────────────────── */
interface SideRaysProps {
  rayColor1?: string;
  rayColor2?: string;
  origin?: string;
  speed?: number;
  intensity?: number;
  spread?: number;
  tilt?: number;
  saturation?: number;
  blend?: number;
  falloff?: number;
  opacity?: number;
  className?: string;
}
interface ScrollVelocityProps {
  texts: string[];
  velocity?: number;
  className?: string;
  numCopies?: number;
  damping?: number;
  stiffness?: number;
  parallaxClassName?: string;
  scrollerClassName?: string;
}
interface CardNavLink {
  label: string;
  href?: string;
  ariaLabel?: string;
}
interface CardNavItem {
  label: string;
  bgColor: string;
  textColor: string;
  links: CardNavLink[];
}
interface CardNavProps {
  logo: string;
  logoAlt?: string;
  items: CardNavItem[];
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonText?: string;
  buttonHref?: string;
  ease?: string;
  className?: string;
}

const SideRays = dynamic(() => import('@/components/SideRays'), {
  ssr: false,
}) as ComponentType<SideRaysProps>;
const ScrollVelocity = dynamic(() => import('@/components/ScrollVelocity'), {
  ssr: false,
}) as ComponentType<ScrollVelocityProps>;
const CardNav = dynamic(() => import('@/components/CardNav'), {
  ssr: false,
}) as ComponentType<CardNavProps>;
const GridMotionWrapper = dynamic(() => import('./GridMotionWrapper'), {
  ssr: false,
}) as ComponentType<object>;

/* ── Palet aksen selaras SideRays ─────────────────────────────── */
const GOLD = '#EAB308';

/* ── Navigasi (CardNav) ───────────────────────────────────────── */
const NAV_ITEMS: CardNavItem[] = [
  {
    label: 'Platform',
    bgColor: '#173a17',
    textColor: '#ffffff',
    links: [
      { label: 'Dashboard Stok', href: '#modul', ariaLabel: 'Dashboard Stok' },
      { label: 'AI Scan Mutu', href: '#scan-mutu', ariaLabel: 'AI Scan Mutu' },
      { label: 'Manajemen Anggota', href: '#anggota', ariaLabel: 'Manajemen Anggota' },
    ],
  },
  {
    label: 'Solusi',
    bgColor: '#1e3a5f',
    textColor: '#ffffff',
    links: [
      { label: 'Skor Kepercayaan', href: '#skor-kepercayaan', ariaLabel: 'Skor Kepercayaan' },
      { label: 'Portofolio Kredit', href: '#portofolio', ariaLabel: 'Portofolio Kredit' },
      { label: 'Riwayat Transaksi', href: '#riwayat', ariaLabel: 'Riwayat Transaksi' },
    ],
  },
  {
    label: 'Mulai',
    bgColor: '#3d2e1a',
    textColor: '#ffffff',
    links: [
      { label: 'Agregasi Koperasi', href: '#agregasi', ariaLabel: 'Agregasi Koperasi' },
      { label: 'Program Digitalisasi', href: '#digitalisasi', ariaLabel: 'Program Digitalisasi' },
      { label: 'Laporan Kinerja', href: '#laporan', ariaLabel: 'Laporan Kinerja' },
    ],
  },
];

/* ── Data konten ──────────────────────────────────────────────── */
interface Module {
  name: string;
  desc: string;
  accent: string;
  icon: ReactNode;
}
const MODULES: Module[] = [
  {
    name: 'Buku Stok',
    desc: 'Pantau batch, kuantitas, dan masa simpan hasil panen secara langsung  tanpa lagi mencatat di kertas.',
    accent: '#3a7a3a',
    icon: <path d="M3 7l9-4 9 4-9 4-9-4Zm0 5l9 4 9-4M3 17l9 4 9-4" />,
  },
  {
    name: 'Scan Kualitas AI',
    desc: 'Unggah foto sayuran, kecerdasan buatan memberi grade mutu dalam hitungan detik dan konsisten.',
    accent: '#0891b2',
    icon: <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" />,
  },
  {
    name: 'Keuangan',
    desc: 'Pembiayaan beragun aset dengan riwayat kredit yang terbaca lintas koperasi, bukan sekadar catatan internal.',
    accent: '#2d6a2d',
    icon: <path d="M3 7h18v10H3V7Zm0 4h18M7 15h2" />,
  },
  {
    name: 'Pengadaan Bersama',
    desc: 'Beli pupuk dan input pertanian bareng lima koperasi untuk mendapat harga grosir, alokasi dibagi adil pro-rata.',
    accent: '#d97706',
    icon: <path d="M4 5h2l2 11h9l2-7H7M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />,
  },
  {
    name: 'Anggota',
    desc: 'Kelola delapan peran pengurus dengan kontrol akses berlapis  siapa boleh melihat, mengubah, dan menyetujui.',
    accent: '#7c3aed',
    icon: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a2.5 2.5 0 1 0 0-5M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5m2 0c0-2-1-3.6-2.5-4.5" />,
  },
  {
    name: 'Audit & Portofolio',
    desc: 'Skor kepercayaan yang lahir dari rekam jejak on-chain, plus dossier rapi yang siap dikirim ke mitra pembiayaan.',
    accent: '#0f2a0f',
    icon: <path d="M12 3l8 3v5c0 4.5-3 8.5-8 10-5-1.5-8-5.5-8-10V6l8-3Zm-1 9 1.5 1.5L15 10" />,
  },
];

interface Tech {
  name: string;
  tag: string;
  desc: string;
}
const TECH: Tech[] = [
  {
    name: 'Hyperledger Fabric',
    tag: 'Ledger berizin',
    desc: 'Setiap keputusan penting dikunci di channel arta-channel melalui chaincode credit-history, procurement, dan stock-trace. Catatan tak bisa diubah diam-diam.',
  },
  {
    name: 'PostgreSQL + RLS',
    tag: 'Isolasi data',
    desc: 'Ditenagai Supabase dengan Row-Level Security, sehingga data setiap koperasi terpisah aman meski berada dalam satu sistem.',
  },
  {
    name: 'AI Vision',
    tag: 'Penilaian mutu',
    desc: 'Model penglihatan komputer menilai kualitas hasil panen dari foto, menghapus subjektivitas penilaian manual.',
  },
  {
    name: 'Next.js 15',
    tag: 'Antarmuka cepat',
    desc: 'Dirender di server untuk waktu muat singkat dan pengalaman yang mulus, bahkan di jaringan desa yang terbatas.',
  },
];

interface Benefit {
  title: string;
  desc: string;
  accent: string;
  icon: ReactNode;
}
const BENEFITS: Benefit[] = [
  {
    title: 'Transparansi yang bisa dibuktikan',
    desc: 'Bukan klaim pengurus, melainkan angka yang terkunci di blockchain dan bisa diverifikasi siapa pun.',
    accent: GOLD,
    icon: <path d="M12 3l8 3v5c0 4.5-3 8.5-8 10-5-1.5-8-5.5-8-10V6l8-3Zm-1 9 1.5 1.5L15 10" />,
  },
  {
    title: 'Akses pembiayaan lebih mudah',
    desc: 'Skor kepercayaan on-chain menjadi bahasa yang langsung dimengerti bank dan mitra pembiayaan.',
    accent: '#2d6a2d',
    icon: <path d="M3 7h18v10H3V7Zm0 4h18M7 15h2" />,
  },
  {
    title: 'Pengadaan jauh lebih hemat',
    desc: 'Menggabungkan permintaan lima koperasi membuka harga grosir yang mustahil diraih sendirian.',
    accent: '#d97706',
    icon: <path d="M4 5h2l2 11h9l2-7H7" />,
  },
  {
    title: 'Telusur dari kebun ke meja',
    desc: 'Jejak mutu, asal, dan perpindahan hasil panen tercatat utuh  kepercayaan konsumen ikut naik.',
    accent: '#0891b2',
    icon: <path d="M3 7l9-4 9 4-9 4-9-4Zm0 5l9 4 9-4" />,
  },
];

interface Coop {
  name: string;
  focus: string;
  location: string;
  accent: string;
  us: boolean;
}
const COOPS: Coop[] = [
  { name: 'Melati Jaya', focus: 'Sayuran & cold storage', location: 'Lembang', accent: '#3a7a3a', us: true },
  { name: 'Padiwangi', focus: 'Simpan pinjam & beras', location: 'Ciwidey', accent: '#2563eb', us: false },
  { name: 'Sumber Makmur', focus: 'Pupuk & toko gerai', location: 'Pangalengan', accent: '#d97706', us: false },
  { name: 'Tirta Bersama', focus: 'Air bersih & simpan pinjam', location: 'Cimenyan', accent: '#0891b2', us: false },
  { name: 'Harapan Baru', focus: 'Ternak & pakan', location: 'Kertasari', accent: '#7c3aed', us: false },
];

interface Stakeholder {
  name: string;
  role: string;
  desc: string;
  accent: string;
  icon: ReactNode;
  bullets: string[];
}
const STAKEHOLDERS: Stakeholder[] = [
  {
    name: 'Pengurus Koperasi',
    role: 'Untuk Pengelola Harian',
    desc: 'Pantau stok real-time, prioritaskan penjualan sebelum sayuran membusuk, dan kelola operasional harian dari satu dashboard.',
    accent: '#173a17',
    icon: <path d="M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z" />,
    bullets: ['Pantau stok real-time dari gudang hingga display', 'Prioritaskan penjualan sayuran mendekati masa kedaluwarsa', 'Operasional harian kelola dari satu dashboard'],
  },
  {
    name: 'Mitra Pembiayaan',
    role: 'Bank & Investor',
    desc: 'Akses data portofolio koperasi yang sudah divalidasi on-chain: total aset stok, performa kualitas, riwayat transaksi. Tidak bisa dimanipulasi.',
    accent: '#1e3a5f',
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    bullets: ['Data portofolio divalidasi on-chain tanpa bisa diubah', 'Total aset stok & performa kualitas riil koperasi', 'Riwayat transaksi transparan siap diaudit kapan saja'],
  },
  {
    name: 'Pemerintah Kabupaten',
    role: 'Untuk Pengambil Kebijakan',
    desc: 'Pantau performa agregat berbagai koperasi untuk program digitalisasi daerah dengan data yang akurat dan real-time.',
    accent: '#3d2e1a',
    icon: <path d="M3 21h18M6 7l3-3 3 3M6 7v14m6-14v14M9 11v4m6-4v4" />,
    bullets: ['Performa agregat berbagai koperasi dalam satu tampilan', 'Program digitalisasi daerah terukur dengan data akurat', 'Dashboard real-time untuk keputusan kebijakan tepat'],
  },
];

/* ── Helper UI ────────────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}): React.JSX.Element {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1700,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const [val, setVal] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e || !e.isIntersecting || started.current) return;
        started.current = true;
        if (reduce) {
          setVal(to);
          return;
        }
        const start = performance.now();
        const tick = (now: number): void => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(to * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration, reduce]);

  const display = (decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString()).replace('.', ',');
  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
        dark
          ? 'bg-white/10 text-[var(--color-brand-200)] ring-1 ring-white/15'
          : 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] ring-1 ring-[var(--color-brand-200)]'
      }`}
    >
      {children}
    </span>
  );
}

function Icon({ children, className = 'h-6 w-6' }: { children: ReactNode; className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════════════════ */
export function LandingPage(): React.JSX.Element {
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--color-surface)] text-[var(--color-text-primary)]">
      {/* ── Navbar ──────────────────────────────────────────── */}
      <CardNav
        logo="/Arta-Logo.png"
        logoAlt="Arta"
        items={NAV_ITEMS}
        baseColor="#ffffff"
        menuColor="#0f2a0f"
        buttonBgColor="#2d6a2d"
        buttonTextColor="#ffffff"
        buttonText="Masuk"
        buttonHref="/login"
        ease="power3.out"
        className="!fixed"
      />

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-32 text-white">
        {/* Latar gelap elegan */}
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(120% 100% at 80% 0%, #173a17 0%, #0f2a0f 38%, #081608 72%, #050d05 100%)',
          }}
        />
        <div aria-hidden className="arta-grid-overlay absolute inset-0 z-0 opacity-40" />

        {/* GridMotion  animasi grid di sebelah kiri */}
        {!reduce && <GridMotionWrapper />}

        {/* SideRays  emas + langit, dari kanan atas */}
        {!reduce && (
          <div className="arta-rays" aria-hidden>
            <SideRays
              rayColor1={GOLD}
              rayColor2="#96c8ff"
              origin="top-right"
              speed={2.5}
              intensity={2}
              spread={2}
              tilt={0}
              saturation={1.5}
              blend={0.75}
              falloff={1.6}
              opacity={1}
            />
          </div>
        )}

        {/* Vignette bawah untuk transisi mulus */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-[1] h-0"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--color-surface))' }}
        />

        {/* Konten hero */}
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
          >
            <Eyebrow dark>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
              Didukung Hyperledger Fabric · 5 koperasi terhubung
            </Eyebrow>
          </motion.div>

          <motion.h1
            className="mt-6 font-[var(--font-display)] text-[2.6rem] leading-[1.05] tracking-tight sm:text-6xl"
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={reduce ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0, 0, 0.2, 1] }}
          >
            Koperasi pertanian yang{' '}
            <span style={{ color: GOLD }}>transparan</span>,{' '}
            <span style={{ color: '#96c8ff' }}>terhubung</span>, dan layak dibiayai.
          </motion.h1>

          <motion.p
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-lg"
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={reduce ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: [0, 0, 0.2, 1] }}
          >
            Arta menyatukan telusur hasil panen, manajemen stok, pembiayaan, dan
            pengadaan bersama dalam satu sistem. Setiap angka penting dikunci di
            blockchain  dan bisa dibuktikan kepada siapa saja.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={reduce ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0, 0, 0.2, 1] }}
          >
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-400)] px-6 py-3 text-sm font-semibold text-[#061406] shadow-[0_18px_50px_-18px_rgba(90,158,90,0.9)] transition-transform duration-200 hover:scale-[1.03] cursor-pointer"
            >
              Masuk ke Sistem
              <Icon className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </Icon>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors duration-200 hover:bg-white/10 cursor-pointer"
            >
              Daftar Anggota
            </Link>
          </motion.div>

          {/* Chip kepercayaan */}
          <motion.ul
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/60"
            initial={reduce ? false : { opacity: 0 }}
            animate={reduce ? {} : { opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.34 }}
          >
            {['Multi-tenant', 'Terverifikasi on-chain', 'Penilaian mutu AI', 'Kredit lintas koperasi'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-[var(--color-brand-200)]">
                  <path d="M20 6 9 17l-5-5" />
                </Icon>
                {t}
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ── MARQUEE koperasi (ScrollVelocity) ───────────────── */}
      <section id="jaringan" className="border-y border-[var(--color-border)] bg-[var(--color-surface-card)] py-8" aria-label="Jaringan koperasi Arta">
        <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          Dipercaya jaringan koperasi pertanian
        </div>
        <ScrollVelocity
          texts={[
            'Melati Jaya · Padiwangi · Sumber Makmur · Tirta Bersama · Harapan Baru · ',
            'Hyperledger Fabric · Pengadaan Bersama · Skor Kepercayaan · Telusur Panen · ',
          ]}
          velocity={32}
          numCopies={5}
          damping={50}
          stiffness={400}
          className="custom-scroll-text"
          scrollerClassName="!text-transparent"
        />
      </section>

      {/* ── STAKEHOLDER ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="max-w-2xl">
          <Eyebrow>Untuk siapa Arta</Eyebrow>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-tight tracking-tight sm:text-[2.6rem]">
            Tiga pihak, satu platform kepercayaan.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {STAKEHOLDERS.map((s, i) => (
            <Reveal key={s.name} delay={(i % 3) * 0.1}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-7 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-brand-200)] hover:shadow-[0_24px_60px_-32px_rgba(15,42,15,0.35)]">
                <span aria-hidden className="absolute right-0 top-0 h-1.5 w-full" style={{ backgroundColor: s.accent }} />
                <span
                  className="grid h-14 w-14 place-items-center rounded-xl text-white transition-transform duration-200 group-hover:scale-105"
                  style={{ backgroundColor: s.accent }}
                >
                  <Icon className="h-7 w-7">{s.icon}</Icon>
                </span>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  {s.role}
                </div>
                <h3 className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{s.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {s.desc}
                </p>
                <ul className="mt-5 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                      <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${s.accent}1a`, color: s.accent }}>
                        <Icon className="h-3 w-3"><path d="M20 6 9 17l-5-5" /></Icon>
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── MASALAH ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Masalah yang kami pecahkan</Eyebrow>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-[2.6rem]">
            Setahun setelah MVP, satu pertanyaan membuat semuanya berhenti.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-7">
            <p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
              Sistem ini awalnya dibangun untuk <strong className="text-[var(--color-text-primary)]">satu koperasi</strong>.
              Kini lima koperasi memakainya bersama. Ketika mitra pembiayaan pertama
              kali meminta data portofolio, tim tidak tahu harus mengirim apa  atau
              seberapa banyak yang boleh dibagikan.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
              Data tersebar: sebagian di spreadsheet, sebagian di kepala pengurus.
              Tidak ada yang bisa membuktikan mana angka yang benar. Kepercayaan
              dibangun dari rasa percaya, bukan dari bukti.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Data tercecer', 'Tak ada bukti', 'Sulit dibagikan'].map((t) => (
                <span key={t} className="rounded-lg bg-[var(--color-danger-100)] px-3 py-1 text-xs font-semibold text-[var(--color-danger-400)]">
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="relative flex flex-col justify-center overflow-hidden rounded-2xl p-8 text-white" >
            <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1e4a1e, #0f2a0f)' }} />
            <div aria-hidden className="arta-grid-overlay absolute inset-0 opacity-30" />
            <div className="relative">
              <Icon className="h-8 w-8 text-[var(--color-brand-200)]">
                <path d="M7.5 8.5h9M7.5 12h6M21 12a9 9 0 1 1-3.8-7.3L21 4v5h-5" />
              </Icon>
              <p className="mt-4 font-[var(--font-display)] text-2xl leading-snug">
                &ldquo;Kami punya datanya. Kami hanya tidak bisa membuktikannya.&rdquo;
              </p>
              <p className="mt-3 text-sm text-white/65">
                 Pengurus koperasi, saat ditanya portofolio oleh calon mitra pembiayaan.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SOLUSI ──────────────────────────────────────────── */}
      <section id="mitra" className="relative overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-surface-card)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Jawaban kami</Eyebrow>
              <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-tight tracking-tight sm:text-[2.6rem]">
                Kepercayaan yang bisa dibuktikan, bukan sekadar dijanjikan.
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                Arta mencatat setiap keputusan penting  persetujuan pinjaman, pencairan,
                pengadaan, perpindahan stok  ke Hyperledger Fabric. Dari sana lahir{' '}
                <strong className="text-[var(--color-text-primary)]">Lembar Kepercayaan</strong>:
                portofolio yang bisa Anda bagikan ke mitra dengan kendali penuh atas
                seberapa banyak yang terlihat.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Skor kepercayaan dihitung dari sinyal on-chain, bukan klaim.',
                  'Setiap metrik membawa bukti transaksi yang bisa diverifikasi.',
                  'Atur cakupan berbagi: lengkap, keuangan, pengadaan, atau ringkasan publik.',
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-sm text-[var(--color-text-secondary)]">
                    <span className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
                      <Icon className="h-3 w-3"><path d="M20 6 9 17l-5-5" /></Icon>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Kartu Lembar Kepercayaan */}
            <Reveal delay={0.1}>
              <div className="relative mx-auto max-w-sm rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 arta-glow-gold">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Lembar Kepercayaan</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[11px] font-bold text-[var(--color-grade-a)]">
                    <Icon className="h-3 w-3"><path d="M12 3l8 3v5c0 4.5-3 8.5-8 10-5-1.5-8-5.5-8-10V6l8-3Z" /></Icon>
                    Terverifikasi
                  </span>
                </div>
                <div className="mt-5 flex items-end gap-3">
                  <span className="font-[var(--font-display)] text-6xl leading-none text-[var(--color-brand-700)]">
                    <CountUp to={84} />
                  </span>
                  <span className="mb-1 rounded-lg bg-[#dcfce7] px-2 py-0.5 text-sm font-bold text-[var(--color-grade-a)]">AA</span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Koperasi Melati Jaya · Layak dibiayai</p>
                <div className="mt-5 space-y-3">
                  {[
                    { label: 'Pelunasan tepat waktu', v: 94 },
                    { label: 'Cakupan on-chain', v: 96 },
                    { label: 'Penanganan anomali', v: 86 },
                  ].map((p) => (
                    <div key={p.label}>
                      <div className="flex justify-between text-[11px] text-[var(--color-text-secondary)]">
                        <span>{p.label}</span>
                        <span className="font-mono">{p.v}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
                        <div className="h-full rounded-full" style={{ width: `${p.v}%`, backgroundColor: 'var(--color-brand-400)' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-text-muted)]">
                  <Icon className="h-3.5 w-3.5"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" /></Icon>
                  arta-channel · credit-history
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── MODUL ───────────────────────────────────────────── */}
      <section id="modul" className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="max-w-2xl">
          <Eyebrow>Satu sistem, enam modul</Eyebrow>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-tight tracking-tight sm:text-[2.6rem]">
            Semua yang dibutuhkan koperasi modern, terhubung di satu tempat.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <Reveal key={m.name} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-brand-200)] hover:shadow-[0_24px_60px_-32px_rgba(15,42,15,0.35)] cursor-default">
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl text-white transition-transform duration-200 group-hover:scale-105"
                  style={{ backgroundColor: m.accent }}
                >
                  <Icon className="h-6 w-6">{m.icon}</Icon>
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">{m.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{m.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── METRIK / STUDI KASUS ────────────────────────────── */}
      <section id="studi-kasus" className="relative overflow-hidden py-24 text-white">
        <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 20% 0%, #1e4a1e, #0f2a0f 55%, #060f06)' }} />
        <div aria-hidden className="arta-grid-overlay absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal className="max-w-2xl">
            <Eyebrow dark>Studi kasus · Melati Jaya</Eyebrow>
            <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-tight tracking-tight sm:text-[2.6rem]">
              Angka yang berbicara sebelum pengurus sempat menjelaskan.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/70">
              Dalam satu tahun terhubung ke Arta, inilah jejak yang kini bisa dibuktikan
              ke siapa pun  tanpa rapat, tanpa berkas tercecer.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-3">
            {[
              { value: <><CountUp to={84} /> <span className="text-2xl align-top">AA</span></>, label: 'Skor kepercayaan on-chain' },
              { value: <><span className="text-2xl align-top">Rp</span><CountUp to={6.5} decimals={1} /> jt</>, label: 'Hemat dari satu pengadaan bersama' },
              { value: <CountUp to={5} />, label: 'Koperasi saling terhubung' },
              { value: <CountUp to={94.3} decimals={1} suffix="%" />, label: 'Pelunasan tepat waktu' },
              { value: <CountUp to={1.1} decimals={1} suffix="%" />, label: 'Rasio kredit bermasalah (NPL)' },
              { value: <CountUp to={47} />, label: 'Transaksi terkunci di blockchain' },
            ].map((s, i) => (
              <Reveal key={i} delay={(i % 3) * 0.08} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                <div className="font-[var(--font-display)] text-4xl leading-none sm:text-5xl" style={{ color: i === 0 ? GOLD : '#ffffff' }}>
                  {s.value}
                </div>
                <p className="mt-2 text-sm text-white/65">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEKNOLOGI ───────────────────────────────────────── */}
      <section id="teknologi" className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="max-w-2xl">
          <Eyebrow>Fondasi teknologi</Eyebrow>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-tight tracking-tight sm:text-[2.6rem]">
            Dibangun di atas teknologi yang dipercaya institusi keuangan.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {TECH.map((t, i) => (
            <Reveal key={t.name} delay={(i % 2) * 0.08}>
              <div className="flex h-full gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-6">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
                  <Icon className="h-5 w-5"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 4.3 6.5 3.6L12 13.5 5.5 9.9 12 6.3Z" /></Icon>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t.name}</h3>
                    <span className="rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t.tag}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{t.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── MANFAAT ─────────────────────────────────────────── */}
      <section id="manfaat" className="border-y border-[var(--color-border)] bg-[var(--color-surface-card)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="max-w-2xl">
            <Eyebrow>Mengapa Arta</Eyebrow>
            <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-tight tracking-tight sm:text-[2.6rem]">
              Manfaat yang terasa langsung, dari kebun sampai ruang rapat mitra.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={(i % 4) * 0.07}>
                <div className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundColor: `${b.accent}1a`, color: b.accent }}>
                    <Icon className="h-5 w-5">{b.icon}</Icon>
                  </span>
                  <h3 className="mt-4 text-base font-semibold leading-snug text-[var(--color-text-primary)]">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── JARINGAN KOPERASI ───────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal className="max-w-2xl">
          <Eyebrow>Jaringan koperasi</Eyebrow>
          <h2 className="mt-5 font-[var(--font-display)] text-3xl leading-tight tracking-tight sm:text-[2.6rem]">
            Lima koperasi, satu jaringan kepercayaan yang saling menguatkan.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
            Riwayat kredit dan pengadaan terbaca lintas koperasi, sehingga anggota baik
            di mana pun ia bernaung tetap dikenali rekam jejaknya.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COOPS.map((c, i) => (
            <Reveal key={c.name} delay={(i % 3) * 0.07}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-card)] p-6">
                <span aria-hidden className="absolute right-0 top-0 h-1.5 w-full" style={{ backgroundColor: c.accent }} />
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: c.accent }}>
                    {c.name.split(' ').map((w) => w.charAt(0)).join('').slice(0, 2)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{c.name}</h3>
                      {c.us && (
                        <span className="rounded-md bg-[var(--color-brand-100)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-brand-700)]">KITA</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">{c.location}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{c.focus}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA AKHIR ───────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-28 text-white">
        <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #1e4a1e, #0f2a0f 60%, #060f06)' }} />
        {!reduce && (
          <div className="arta-rays" aria-hidden>
            <SideRays rayColor1={GOLD} rayColor2="#96c8ff" origin="top-left" speed={2} intensity={1.5} spread={1.6} saturation={1.4} blend={0.7} falloff={1.7} opacity={0.85} />
          </div>
        )}
        <Reveal className="relative mx-auto max-w-2xl text-center">
          <Image src="/Arta-Logo.png" alt="Arta" width={56} height={56} className="mx-auto mb-6 h-14 w-14 rounded-2xl object-contain" />
          <h2 className="font-[var(--font-display)] text-3xl leading-tight tracking-tight sm:text-5xl">
            Siap membuat koperasi Anda transparan dan layak dibiayai?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/70">
            Mulai catat, buktikan, dan bagikan rekam jejak koperasi Anda hari ini.
            Bergabunglah dengan jaringan yang dibangun di atas kepercayaan yang nyata.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-400)] px-7 py-3.5 text-sm font-semibold text-[#061406] shadow-[0_18px_50px_-18px_rgba(90,158,90,0.9)] transition-transform duration-200 hover:scale-[1.03] cursor-pointer"
            >
              Daftar Anggota Sekarang
              <Icon className="h-4 w-4 transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors duration-200 hover:bg-white/10 cursor-pointer"
            >
              Masuk ke Sistem
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-card)] px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/Arta-Logo.png" alt="Arta" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
            <div>
              <div className="font-[var(--font-display)] text-lg leading-none text-[var(--color-text-primary)]">Arta</div>
              <div className="text-xs text-[var(--color-text-muted)]">Platform Digitalisasi Koperasi</div>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--color-text-secondary)]">
            <a href="#modul" className="transition-colors hover:text-[var(--color-brand-700)] cursor-pointer">Modul</a>
            <a href="#teknologi" className="transition-colors hover:text-[var(--color-brand-700)] cursor-pointer">Teknologi</a>
            <a href="#studi-kasus" className="transition-colors hover:text-[var(--color-brand-700)] cursor-pointer">Studi Kasus</a>
            <Link href="/login" className="transition-colors hover:text-[var(--color-brand-700)] cursor-pointer">Masuk</Link>
            <Link href="/register" className="transition-colors hover:text-[var(--color-brand-700)] cursor-pointer">Daftar</Link>
          </nav>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-[var(--color-border)] pt-6 text-center text-xs text-[var(--color-text-muted)]">
          © {new Date().getFullYear()} Arta · Platform Digitalisasi Koperasi Pertanian · Terverifikasi Hyperledger Fabric
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
