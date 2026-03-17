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
  if (dateFilter === 'last_month') {
    return { from: new Date(todayStart.getTime() - 30 * 86400000).toISOString(), to: new Date(todayStart.getTime() + 86400000).toISOString() };
  }
  if (dateFilter === 'custom' && customDate) {
    const d = new Date(customDate);
    if (isNaN(d.getTime())) return null;
    return {
      from: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
      to: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString(),
    };
  }
  return null; // 'all'
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: driver, error: driverError } = await adminClient
    .from('drivers')
    .select('id, status')
    .eq('user_id', user.id)
    .single();

  if (driverError || !driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  if (driver.status !== 'approved') return NextResponse.json({ error: 'Account not approved' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const dateFilter = searchParams.get('date_filter') || 'today';
  const customDate = searchParams.get('custom_date');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = 10;

  const range = getDateRange(dateFilter, customDate);

  let query = adminClient
    .from('orders')
    .select('*, pharmacies(id, name, address, city)', { count: 'exact' })
    .eq('driver_id', driver.id)
    .in('status', ['delivered', 'delivery_failed'])
    .order('delivered_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (range) {
    // Filter on delivered_at if available, otherwise created_at
    query = query.gte('created_at', range.from).lt('created_at', range.to);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data: orders, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Summary counts (all-time for this driver)
  const { data: allHistory } = await adminClient
    .from('orders')
    .select('status')
    .eq('driver_id', driver.id)
    .in('status', ['delivered', 'delivery_failed']);

  const totalDelivered = allHistory?.filter((o) => o.status === 'delivered').length ?? 0;
  const totalFailed = allHistory?.filter((o) => o.status === 'delivery_failed').length ?? 0;

  return NextResponse.json({
    orders: orders || [],
    total: count ?? 0,
    page,
    page_size: pageSize,
    summary: { delivered: totalDelivered, failed: totalFailed, total: totalDelivered + totalFailed },
  });
}
