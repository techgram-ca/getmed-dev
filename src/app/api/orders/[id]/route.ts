import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Statuses that a pharmacy is allowed to transition TO
const PHARMACY_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],           // accept or reject
  processing: ['ready_for_delivery'],             // mark ready
  ready_for_delivery: ['cancelled'],              // cancel before driver assigned
};

// Statuses where pharmacy cannot make any changes (driver has taken over)
const DRIVER_LOCKED_STATUSES = ['assigned', 'acknowledged', 'picked_up', 'out_for_delivery', 'delivered', 'delivery_failed'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: pharmacy } = await adminClient
    .from('pharmacies')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!pharmacy) {
    return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });
  }

  // Fetch current order to validate transition
  const { data: existing, error: fetchErr } = await adminClient
    .from('orders')
    .select('id, status, pharmacy_id')
    .eq('id', id)
    .eq('pharmacy_id', pharmacy.id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (DRIVER_LOCKED_STATUSES.includes(existing.status)) {
    return NextResponse.json(
      { error: `Order is currently ${existing.status} and cannot be modified by pharmacy` },
      { status: 403 }
    );
  }

  const allowed = PHARMACY_ALLOWED_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from '${existing.status}' to '${status}'` },
      { status: 400 }
    );
  }

  const { data: order, error } = await adminClient
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order });
}
