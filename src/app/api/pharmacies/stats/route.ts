import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: pharmacy } = await adminClient
    .from('pharmacies')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!pharmacy) return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });

  // Fetch all orders for this pharmacy (no date filter) — just ids + status for counting
  const { data: orders, error } = await adminClient
    .from('orders')
    .select('status')
    .eq('pharmacy_id', pharmacy.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const o of orders || []) {
    counts[o.status] = (counts[o.status] || 0) + 1;
  }

  return NextResponse.json({ stats: counts, total: orders?.length ?? 0 });
}
