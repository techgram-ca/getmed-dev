import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function getDateRange(dateFilter: string, customDate: string | null): { from: string; to: string } | null {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateFilter === 'today') {
    return { from: todayStart.toISOString(), to: new Date(todayStart.getTime() + 86400000).toISOString() };
  }
  if (dateFilter === 'yesterday') {
    return { from: new Date(todayStart.getTime() - 86400000).toISOString(), to: todayStart.toISOString() };
  }
  if (dateFilter === 'last_week') {
    return { from: new Date(todayStart.getTime() - 7 * 86400000).toISOString(), to: new Date(todayStart.getTime() + 86400000).toISOString() };
  }
  if (dateFilter === 'custom' && customDate) {
    const d = new Date(customDate);
    if (isNaN(d.getTime())) return null;
    return {
      from: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
      to: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString(),
    };
  }
  return null; // 'all' — no date restriction
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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') || '10', 10)));
  const isPaginated = dateFilter === 'all';

  const range = getDateRange(dateFilter, customDate);

  let query = adminClient
    .from('orders')
    .select('*, drivers(id, name, phone)', { count: 'exact' })
    .eq('pharmacy_id', pharmacy.id)
    .order('created_at', { ascending: false });

  if (range) {
    query = query.gte('created_at', range.from).lt('created_at', range.to);
  }

  if (isPaginated) {
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);
  }

  const { data: orders, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Per-status counts for the current date filter (independent of pagination)
  let statsQuery = adminClient
    .from('orders')
    .select('status')
    .eq('pharmacy_id', pharmacy.id);
  if (range) {
    statsQuery = statsQuery.gte('created_at', range.from).lt('created_at', range.to);
  }
  const { data: statusRows } = await statsQuery;
  const status_counts: Record<string, number> = {};
  for (const r of statusRows || []) {
    status_counts[r.status] = (status_counts[r.status] || 0) + 1;
  }

  return NextResponse.json({ orders, total: count ?? orders?.length ?? 0, page, page_size: pageSize, status_counts });
}
