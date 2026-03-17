import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: driver, error } = await adminClient
    .from('drivers')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  }

  return NextResponse.json({ driver });
}
