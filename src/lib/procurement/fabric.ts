import { getBatchesByTenant } from '@/lib/blockchain/query';
import type { ProcurementFabricStatus } from '@/lib/procurement/overview';

/**
 * Cek apakah gateway Hyperledger Fabric terjangkau. Dibungkus try/catch agar
 * halaman pengadaan tetap hidup walau node masih lokal / tak terjangkau dari
 * cloud. Hanya diimpor oleh server component, jadi tidak ikut ter-bundle ke klien.
 */
export async function getProcurementFabricStatus(tenantId: string): Promise<ProcurementFabricStatus> {
  const configuredUrl = process.env.HYPERLEDGER_API_URL ?? '(tidak diset)';
  const checkedAt = new Date().toISOString();
  try {
    await getBatchesByTenant(tenantId);
    return { online: true, configuredUrl, checkedAt };
  } catch (error) {
    return {
      online: false,
      configuredUrl,
      checkedAt,
      error: error instanceof Error ? error.message : 'Fabric tidak terjangkau',
    };
  }
}
