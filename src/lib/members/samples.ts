/**
 * Data contoh keanggotaan Koperasi Melati Jaya (sektor sayuran & cold storage).
 * Dipakai untuk mode pratinjau sebelum Phone Auth aktif & data nyata di-wire
 * dari tabel `members` / `member_invites`.
 */

import type { InviteRecord, MemberRecord } from '@/lib/members/overview';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString();
}

function daysAhead(n: number): string {
  return new Date(Date.now() + n * 864e5).toISOString();
}

/** Anggota aktif — mencakup seluruh tier peran. */
export const SAMPLE_MEMBERS: MemberRecord[] = [
  {
    id: 'm-ketua',
    fullName: 'Sutrisno Wibowo',
    role: 'ketua',
    status: 'active',
    phone: '+62 812-3344-5566',
    joinedAt: '2023-01-10T00:00:00.000Z',
    lastActiveAt: daysAgo(0),
  },
  {
    id: 'm-wakil',
    fullName: 'Wahyuni Pratiwi',
    role: 'wakil_ketua',
    status: 'active',
    phone: '+62 813-2211-8899',
    joinedAt: '2023-02-01T00:00:00.000Z',
    lastActiveAt: daysAgo(1),
    invitedByName: 'Sutrisno Wibowo',
  },
  {
    id: 'm-bendahara',
    fullName: 'Lestari Handayani',
    role: 'bendahara',
    status: 'active',
    phone: '+62 821-7788-1020',
    joinedAt: '2023-03-15T00:00:00.000Z',
    lastActiveAt: daysAgo(0),
    invitedByName: 'Sutrisno Wibowo',
  },
  {
    id: 'm-operator',
    fullName: 'Andi Nugroho',
    role: 'operator',
    status: 'active',
    phone: '+62 856-9090-3344',
    joinedAt: '2023-04-02T00:00:00.000Z',
    lastActiveAt: daysAgo(0),
    invitedByName: 'Wahyuni Pratiwi',
  },
  {
    id: 'm-kasir-1',
    fullName: 'Rina Marlina',
    role: 'kasir',
    status: 'active',
    phone: '+62 857-1122-4455',
    joinedAt: '2024-01-20T00:00:00.000Z',
    lastActiveAt: daysAgo(2),
    invitedByName: 'Andi Nugroho',
  },
  {
    id: 'm-kasir-2',
    fullName: 'Joko Susilo',
    role: 'kasir',
    status: 'active',
    phone: '+62 858-3344-7788',
    joinedAt: '2024-06-11T00:00:00.000Z',
    lastActiveAt: daysAgo(5),
    invitedByName: 'Andi Nugroho',
  },
  {
    id: 'm-anggota-1',
    fullName: 'Slamet Riyadi',
    role: 'anggota',
    status: 'active',
    phone: '+62 877-5566-1122',
    joinedAt: '2023-05-05T00:00:00.000Z',
    lastActiveAt: daysAgo(3),
  },
  {
    id: 'm-anggota-2',
    fullName: 'Sri Wahyuningsih',
    role: 'anggota',
    status: 'active',
    phone: '+62 878-2233-9090',
    joinedAt: '2023-06-18T00:00:00.000Z',
    lastActiveAt: daysAgo(7),
  },
  {
    id: 'm-anggota-3',
    fullName: 'Hadi Purnomo',
    role: 'anggota',
    status: 'active',
    phone: '+62 895-4455-1212',
    joinedAt: '2024-02-14T00:00:00.000Z',
    lastActiveAt: daysAgo(1),
  },
  {
    id: 'm-anggota-4',
    fullName: 'Ningsih Rahayu',
    role: 'anggota',
    status: 'active',
    phone: '+62 896-7788-3434',
    joinedAt: '2024-09-01T00:00:00.000Z',
    lastActiveAt: daysAgo(4),
  },
  {
    id: 'm-mitra',
    fullName: 'BPR Arta Sembada',
    role: 'mitra',
    status: 'active',
    phone: '+62 274-555-0188',
    joinedAt: '2024-03-01T00:00:00.000Z',
    lastActiveAt: daysAgo(6),
    invitedByName: 'Sutrisno Wibowo',
  },
  {
    id: 'm-dinas',
    fullName: 'Dinas Pertanian Sleman',
    role: 'dinas',
    status: 'active',
    phone: '+62 274-868-501',
    joinedAt: '2023-12-01T00:00:00.000Z',
    lastActiveAt: daysAgo(9),
    invitedByName: 'Wahyuni Pratiwi',
  },
];

/** Pendaftaran mandiri anggota yang menunggu persetujuan pengurus. */
export const SAMPLE_PENDING: MemberRecord[] = [
  {
    id: 'p-1',
    fullName: 'Yanto Saputra',
    role: 'anggota',
    status: 'pending',
    phone: '+62 813-9988-7766',
    joinedAt: daysAgo(3),
    appliedAt: daysAgo(3),
  },
  {
    id: 'p-2',
    fullName: 'Marni Astuti',
    role: 'anggota',
    status: 'pending',
    phone: '+62 852-1234-5678',
    joinedAt: daysAgo(1),
    appliedAt: daysAgo(1),
  },
  {
    id: 'p-3',
    fullName: 'Bambang Setiawan',
    role: 'anggota',
    status: 'pending',
    phone: '+62 838-4567-1290',
    joinedAt: daysAgo(0),
    appliedAt: daysAgo(0),
  },
];

/** Undangan staf yang sudah dikirim, dengan berbagai status. */
export const SAMPLE_INVITES: InviteRecord[] = [
  {
    id: 'inv-1',
    phone: '+62 812-7777-2211',
    role: 'kasir',
    note: 'Kasir gerai cabang Pakem',
    createdByName: 'Sutrisno Wibowo',
    createdAt: daysAgo(2),
    expiresAt: daysAhead(5),
    state: 'pending',
    token: 'a3f9c2e1b7d4',
  },
  {
    id: 'inv-2',
    phone: '+62 274-868-777',
    role: 'dinas',
    note: 'Validator subsidi pupuk',
    createdByName: 'Wahyuni Pratiwi',
    createdAt: daysAgo(4),
    expiresAt: daysAhead(2),
    state: 'pending',
    token: 'c1d8b6a0f3e2',
  },
  {
    id: 'inv-3',
    phone: '+62 851-3030-9090',
    role: 'operator',
    note: 'Operator gudang cold storage',
    createdByName: 'Sutrisno Wibowo',
    createdAt: daysAgo(20),
    expiresAt: daysAgo(6),
    state: 'expired',
    token: 'e7a2f1c9d0b5',
  },
  {
    id: 'inv-4',
    phone: '+62 819-2020-4545',
    role: 'mitra',
    note: 'Koperasi simpan pinjam mitra',
    createdByName: 'Sutrisno Wibowo',
    createdAt: daysAgo(12),
    expiresAt: daysAgo(5),
    state: 'accepted',
    token: 'b9c4e2a7f1d3',
  },
];
