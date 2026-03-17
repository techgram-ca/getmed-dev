import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function getDateRange(dateFilter: string, customDate: string | null): { from: string; to: string } | null {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateFilter === 'today') {
    const from = todayStart.toISOString();
    const to = new Date(todayStart.getTime() + 86400000).toISOString();
    return { from, to };
  }
  if (dateFilter === 'yesterday') {
    const from = new Date(todayStart.getTime() - 86400000).toISOString();
    const to = todayStart.toISOString();
    return { from, to };
  }
  if (dateFilter === 'last_week') {
    const from = new Date(todayStart.getTime() - 7 * 86400000).toISOString();
    const to = new Date(todayStart.getTime() + 86400000).toISOString();
    return { from, to };
  }
  if (dateFilter === 'custom' && customDate) {
    const d = new Date(customDate);
    if (isNaN(d.getTime())) return null;
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
    return { from, to };
  }
  return null;
}

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const dateFilter = searchParams.get('date_filter') || 'today';
  const customDate = searchParams.get('custom_date');

  const range = getDateRange(dateFilter, customDate);

  let query = adminClient
    .from('orders')
    .select('*, drivers(id, name, phone)')
    .eq('pharmacy_id', pharmacy.id)
    .order('created_at', { ascending: false });

  if (range) {
    query = query.gte('created_at', range.from).lt('created_at', range.to);
  }

  const { data: orders, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders });
}
