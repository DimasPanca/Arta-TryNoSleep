'use client';

import * as React from 'react';

import CircularGallery from '@/components/CircularGallery';

const cooperativeItems = [
  {
    image:
      'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&h=400&fit=crop&q=80',
    text: 'Petani Berdaya',
  },
  {
    image:
      'https://images.unsplash.com/photo-1592982537447-6f2a6a0c7c5b?w=600&h=400&fit=crop&q=80',
    text: 'Hasil Bumi',
  },
  {
    image:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&h=400&fit=crop&q=80',
    text: 'Ladang Berkelanjutan',
  },
  {
    image:
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop&q=80',
    text: 'Sawah Hijau',
  },
  {
    image:
      'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=600&h=400&fit=crop&q=80',
    text: 'Teknologi Tepat Guna',
  },
  {
    image:
      'https://images.unsplash.com/photo-1584637111711-3f3b0b7e2f3f?w=600&h=400&fit=crop&q=80',
    text: 'Pasar Petani',
  },
  {
    image:
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop&q=80',
    text: 'Kebun Organik',
  },
  {
    image:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&h=400&fit=crop&q=80',
    text: 'Panen Raya',
  },
  {
    image:
      'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&h=400&fit=crop&q=80',
    text: 'Petani Milenial',
  },
  {
    image:
      'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=600&h=400&fit=crop&q=80',
    text: 'Irigasi Cerdas',
  },
  {
    image:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=400&fit=crop&q=80',
    text:' Komunitas Tani',
  },
  {
    image:
      'https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&h=400&fit=crop&q=80',
    text: 'Inovasi Desa',
  },
];

export default function CircularGalleryWrapper(): React.ReactElement {
  return (
    <div className="absolute inset-0 w-full h-full opacity-30 blur-sm pointer-events-auto">
      <CircularGallery
        items={cooperativeItems}
        bend={2}
        textColor="#ffffff"
        borderRadius={0.05}
        font="bold 28px Inter, sans-serif"
        autoplaySpeed={0.5}
        scrollSpeed={1.5}
        scrollEase={0.04}
      />
    </div>
  );
}
