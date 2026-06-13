'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

interface GridMotionProps {
  items?: (string | React.ReactNode)[];
  gradientColor?: string;
  autoPlay?: boolean;
}

const GridMotion = dynamic(() => import('@/components/GridMotion'), {
  ssr: false,
}) as ComponentType<GridMotionProps>;

const GRID_ITEMS: string[] = [
  'Telusur Panen', 'Stok Real-time', 'AI Scan Mutu', 'Blockchain', 'Multi-tenant', 'Skor AA', 'Kredit',
  'Dashboard', 'Pengadaan', 'Cold Storage', 'On-chain', 'Grade Mutu', 'Portofolio', 'Audit',
  'Transparan', 'Bankable', 'Efisien', 'Tervalidasi', 'Real-time', 'Agregasi', 'Digitalisasi',
  'Koperasi', 'Pertanian', 'Lembang', 'Ciwidey', 'Pangalengan', 'Cimenyan', 'Kertasari',
];

export default function GridMotionWrapper(): React.ReactElement {
  return (
    <div className="flex-1 h-full overflow-hidden opacity-50 md:opacity-70 pointer-events-none">
      <GridMotion
        items={GRID_ITEMS}
        gradientColor="#0f2a0f"
        autoPlay
      />
    </div>
  );
}
