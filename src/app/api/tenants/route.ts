import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(): Promise<NextResponse> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('tenants')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Konfigurasi server tidak lengkap.' }, { status: 500 });
  }
}
