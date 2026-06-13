import { NextResponse, type NextRequest } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)
    .eq('status', 'pending');

  if (error) {
    console.error('[members/reject]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
