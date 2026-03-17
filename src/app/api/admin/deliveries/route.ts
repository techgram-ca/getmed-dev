import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/adminAuth';

// GET: fetch orders ready for delivery (ready_for_delivery) with optional filters
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const pharmacyId = searchParams.get('pharmacy_id');
  const city = searchParams.get('city');
  const statusFilter = searchParams.get('status') || 'ready_for_delivery';

  const supabase = createAdminClient();

  let query = supabase
    .from('orders')
    .select('*, pharmacies(id, name, address, city, latitude, longitude), drivers(id, name, phone)')
    .order('created_at', { ascending: false });

  if (statusFilter === 'ready_for_delivery') {
    query = query.in('status', ['ready_for_delivery', 'assigned']);
  } else if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  if (pharmacyId) {
    query = query.eq('pharmacy_id', pharmacyId);
  }

  const { data: orders, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Filter by city after join
  const filtered = city
    ? orders?.filter((o) =>
        o.pharmacies?.city?.toLowerCase().includes(city.toLowerCase())
      )
    : orders;

  return NextResponse.json({ orders: filtered || [] });
}

// POST: assign driver to order
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { order_id, driver_id } = await request.json();

  if (!order_id || !driver_id) {
    return NextResponse.json({ error: 'order_id and driver_id are required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify driver is approved
  const { data: driver, error: driverErr } = await supabase
    .from('drivers')
    .select('id, status')
    .eq('id', driver_id)
    .single();

  if (driverErr || !driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  }

  if (driver.status !== 'approved') {
    return NextResponse.json({ error: 'Driver is not approved' }, { status: 400 });
  }

  const { data: order, error: updateError } = await supabase
    .from('orders')
    .update({
      driver_id,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', order_id)
    .in('status', ['ready_for_delivery', 'assigned'])
    .select('*, pharmacies(id, name, address, city), drivers(id, name, phone)')
    .single();

  if (updateError || !order) {
    return NextResponse.json({ error: updateError?.message || 'Order not found or not assignable' }, { status: 400 });
  }

  return NextResponse.json({ order });
}
