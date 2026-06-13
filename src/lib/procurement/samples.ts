/**
 * Data pratinjau Pengadaan Bersama (mode sebelum login / demo).
 *
 * Skenario utama meniru kasus lapangan: beberapa koperasi membeli pupuk
 * bersama agar dapat harga volume yang lebih baik. Termasuk Koperasi
 * Harapan Baru sebagai peserta `external` (sinyal lemah, konfirmasi manual).
 */

import { getCooperative, MELATI_JAYA_ID } from '@/lib/procurement/cooperatives';
import type {
  JointProcurementView,
  ParticipantAllocation,
  ParticipantPayment,
} from '@/lib/procurement/overview';

function participant(
  coopId: string,
  requestedQty: number,
  allocatedQty: number,
  payment: ParticipantPayment,
  confirmed: boolean,
): ParticipantAllocation {
  const coop = getCooperative(coopId);
  return {
    coopId,
    coopName: coop?.name ?? coopId,
    mspId: coop?.mspId ?? coopId,
    requestedQty,
    allocatedQty,
    payment,
    confirmed,
    external: coop ? !coop.onSystem : false,
  };
}

export const SAMPLE_PROCUREMENTS: JointProcurementView[] = [
  {
    id: 'jp-urea-2026-06',
    commodity: 'Pupuk Urea bersubsidi',
    unit: 'sak (50 kg)',
    initiatorId: 'SumberMakmurMSP',
    initiatorName: 'Koperasi Sumber Makmur',
    status: 'confirmed',
    supplierName: 'PT Pupuk Kujang (Distributor Wilayah)',
    pricingTiers: [
      { minQty: 0, unitPrice: 130_000, label: 'Eceran (beli sendiri)' },
      { minQty: 50, unitPrice: 118_000, label: 'Volume 50+ sak' },
      { minQty: 100, unitPrice: 108_000, label: 'Volume 100+ sak' },
      { minQty: 200, unitPrice: 98_000, label: 'Volume 200+ sak' },
    ],
    participants: [
      participant('SumberMakmurMSP', 80, 80, 'paid', true),
      participant('PadiwangiMSP', 60, 60, 'paid', true),
      participant(MELATI_JAYA_ID, 35, 35, 'pending', true),
      participant('HarapanBaruMSP', 30, 30, 'pending', true),
    ],
    createdAt: '2026-06-05T02:00:00Z',
    targetDate: '2026-06-20T00:00:00Z',
    txId: 'c4f8a1d6b9e2705c3a8f41d7e6b093a2519c7e4d',
  },
  {
    id: 'jp-benih-2026-06',
    commodity: 'Benih sayuran (cabai & tomat)',
    unit: 'kg',
    initiatorId: MELATI_JAYA_ID,
    initiatorName: 'Koperasi Melati Jaya',
    status: 'open',
    supplierName: 'CV Tani Benih Unggul',
    pricingTiers: [
      { minQty: 0, unitPrice: 285_000, label: 'Eceran (beli sendiri)' },
      { minQty: 20, unitPrice: 262_000, label: 'Volume 20+ kg' },
      { minQty: 50, unitPrice: 240_000, label: 'Volume 50+ kg' },
    ],
    participants: [
      participant(MELATI_JAYA_ID, 22, 22, 'pending', true),
      participant('PadiwangiMSP', 18, 18, 'pending', true),
      participant('TirtaBersamaMSP', 14, 14, 'pending', false),
    ],
    createdAt: '2026-06-10T03:00:00Z',
    targetDate: '2026-06-24T00:00:00Z',
  },
  {
    id: 'jp-pakan-2026-05',
    commodity: 'Pakan ternak konsentrat',
    unit: 'sak (40 kg)',
    initiatorId: MELATI_JAYA_ID,
    initiatorName: 'Koperasi Melati Jaya',
    status: 'delivered',
    supplierName: 'Poultry Feed Nusantara',
    pricingTiers: [
      { minQty: 0, unitPrice: 245_000, label: 'Eceran (beli sendiri)' },
      { minQty: 40, unitPrice: 228_000, label: 'Volume 40+ sak' },
      { minQty: 90, unitPrice: 212_000, label: 'Volume 90+ sak' },
    ],
    participants: [
      participant('HarapanBaruMSP', 70, 66, 'paid', true),
      participant(MELATI_JAYA_ID, 18, 17, 'paid', true),
      participant('TirtaBersamaMSP', 12, 11, 'paid', true),
    ],
    createdAt: '2026-05-18T04:00:00Z',
    targetDate: '2026-05-30T00:00:00Z',
    txId: 'a91e7c5d2f8b4063e1a7d94c8b5f201e6d3a9c74',
  },
  {
    id: 'jp-kapur-2026-06',
    commodity: 'Kapur dolomit (pengatur pH tanah)',
    unit: 'sak (25 kg)',
    initiatorId: 'PadiwangiMSP',
    initiatorName: 'Koperasi Padiwangi',
    status: 'planning',
    supplierName: 'UD Mineral Tani',
    pricingTiers: [
      { minQty: 0, unitPrice: 62_000, label: 'Eceran (beli sendiri)' },
      { minQty: 60, unitPrice: 54_000, label: 'Volume 60+ sak' },
      { minQty: 150, unitPrice: 47_000, label: 'Volume 150+ sak' },
    ],
    participants: [
      participant('PadiwangiMSP', 50, 50, 'pending', true),
      participant(MELATI_JAYA_ID, 40, 40, 'pending', false),
    ],
    createdAt: '2026-06-12T01:00:00Z',
    targetDate: '2026-06-28T00:00:00Z',
  },
];
