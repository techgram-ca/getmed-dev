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
  const nameFilter = searchParams.get('name') || '';
  const cityFilter = searchParams.get('city') || '';
  const pharmacyId = searchParams.get('pharmacy_id'); // optional: filter to one pharmacy for orders

  const range = getDateRange(dateFilter, customDate);
  const supabase = createAdminClient();

  // Fetch approved pharmacies
  let pharmacyQuery = supabase
    .from('pharmacies')
    .select('id, name, city, address')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('name');

  if (nameFilter) {
    pharmacyQuery = pharmacyQuery.ilike('name', `%${nameFilter}%`);
  }
  if (cityFilter) {
    pharmacyQuery = pharmacyQuery.ilike('city', `%${cityFilter}%`);
  }

  const { data: pharmacies, error: pharmErr } = await pharmacyQuery;
  if (pharmErr) return NextResponse.json({ error: pharmErr.message }, { status: 500 });

  // Fetch orders in date range
  let ordersQuery = supabase
    .from('orders')
    .select('id, pharmacy_id, status, created_at, patient_name, patient_address')
    .order('created_at', { ascending: false });

  if (range) {
    ordersQuery = ordersQuery.gte('created_at', range.from).lt('created_at', range.to);
  }
  if (pharmacyId) {
    ordersQuery = ordersQuery.eq('pharmacy_id', pharmacyId);
  }

  const { data: orders, error: ordErr } = await ordersQuery;
  if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 500 });

  // Build per-pharmacy stats
  const statsMap = new Map<string, { received: number; delivered: number; cancelled: number; failed: number; orders: typeof orders }>();
  for (const ph of pharmacies || []) {
    statsMap.set(ph.id, { received: 0, delivered: 0, cancelled: 0, failed: 0, orders: [] });
  }

  for (const order of orders || []) {
    const entry = statsMap.get(order.pharmacy_id);
    if (!entry) continue;
    entry.received++;
    if (order.status === 'delivered') entry.delivered++;
    else if (order.status === 'cancelled') entry.cancelled++;
    else if (order.status === 'delivery_failed') entry.failed++;
    entry.orders.push(order);
  }

  const result = (pharmacies || []).map((ph) => {
    const s = statsMap.get(ph.id) || { received: 0, delivered: 0, cancelled: 0, failed: 0, orders: [] };
    return {
      pharmacy: ph,
      received: s.received,
      delivered: s.delivered,
      cancelled: s.cancelled,
      failed: s.failed,
      orders: pharmacyId ? s.orders : undefined,
    };
  });

  return NextResponse.json({ stats: result });
}
