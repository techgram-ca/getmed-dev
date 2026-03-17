import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/adminAuth';

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
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const dateFilter = searchParams.get('date_filter') || 'all';
  const customDate = searchParams.get('custom_date');
  const driverId = searchParams.get('driver_id'); // optional: filter to one driver

  const range = getDateRange(dateFilter, customDate);
  const supabase = createAdminClient();

  // Fetch all approved drivers
  const { data: drivers, error: drvErr } = await supabase
    .from('drivers')
    .select('id, name, username, phone, email, license_class')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('name');

  if (drvErr) return NextResponse.json({ error: drvErr.message }, { status: 500 });

  // Fetch completed orders in date range
  let ordersQuery = supabase
    .from('orders')
    .select('id, driver_id, status, delivered_at, created_at, patient_name, patient_address, pharmacies(name, city)')
    .in('status', ['delivered', 'delivery_failed'])
    .order('delivered_at', { ascending: false, nullsFirst: false });

  if (range) {
    ordersQuery = ordersQuery.gte('created_at', range.from).lt('created_at', range.to);
  }
  if (driverId) {
    ordersQuery = ordersQuery.eq('driver_id', driverId);
  }

  const { data: orders, error: ordErr } = await ordersQuery;
  if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 500 });

  // Build per-driver stats
  const statsMap = new Map<string, { delivered: number; failed: number; orders: typeof orders }>();
  for (const drv of drivers || []) {
    statsMap.set(drv.id, { delivered: 0, failed: 0, orders: [] });
  }

  for (const order of orders || []) {
    if (!order.driver_id) continue;
    const entry = statsMap.get(order.driver_id);
    if (!entry) continue;
    if (order.status === 'delivered') entry.delivered++;
    else entry.failed++;
    entry.orders.push(order);
  }

  const result = (drivers || []).map((drv) => {
    const s = statsMap.get(drv.id) || { delivered: 0, failed: 0, orders: [] };
    return {
      driver: drv,
      delivered: s.delivered,
      failed: s.failed,
      total: s.delivered + s.failed,
      orders: driverId ? s.orders : undefined, // only return orders if filtering by single driver
    };
  });

  return NextResponse.json({ stats: result });
}
