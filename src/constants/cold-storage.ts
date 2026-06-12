import type { StorageType } from '@/types/stock';

export const COLD_STORAGE_TEMP_C = 4;
export const AMBIENT_STORAGE_TEMP_C = 25;
export const COLD_STORAGE_CAPACITY_KG = 5000;

export const STORAGE_DURATION_DAYS: Record<StorageType, Record<string, number>> = {
  cold: {
    cabai: 14,
    bayam: 7,
    tomat: 21,
    wortel: 30,
    selada: 10,
    default: 14,
  },
  ambient: {
    cabai: 5,
    bayam: 2,
    tomat: 7,
    wortel: 14,
    selada: 3,
    default: 5,
  },
};

export const COLD_STORAGE_ELIGIBLE_COMMODITIES = [
  'cabai',
  'bayam',
  'tomat',
  'wortel',
  'selada',
  'brokoli',
  'kol',
  'buncis',
];

export function getStorageDurationDays(commodity: string, storageType: StorageType): number {
  const durations = STORAGE_DURATION_DAYS[storageType];
  return durations[commodity.toLowerCase()] ?? durations['default'] ?? 7;
}

export function isColdStorageEligible(commodity: string): boolean {
  return COLD_STORAGE_ELIGIBLE_COMMODITIES.includes(commodity.toLowerCase());
}
