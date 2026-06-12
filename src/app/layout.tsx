import type React from 'react';

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arta — Platform Digitalisasi Koperasi',
  description: 'Sistem manajemen koperasi pertanian multi-tenant dengan blockchain traceability',
  keywords: ['koperasi', 'pertanian', 'digitalisasi', 'blockchain', 'sayuran'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
