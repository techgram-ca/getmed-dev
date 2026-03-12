import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: pharmacy, error } = await adminClient
    .from('pharmacies')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !pharmacy) return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });

  return NextResponse.json({ pharmacy });
}
