import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function getAuthDriver(supabase: Awaited<ReturnType<typeof createClient>>, adminClient: ReturnType<typeof createAdminClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { driver: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: driver, error: driverError } = await adminClient
    .from('drivers')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (driverError || !driver) return { driver: null, error: NextResponse.json({ error: 'Driver not found' }, { status: 404 }) };
  if (driver.status !== 'approved') return { driver: null, error: NextResponse.json({ error: 'Account not approved' }, { status: 403 }) };

  return { driver, error: null };
}

// GET: driver's active orders grouped by pharmacy
export async function GET() {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { driver, error } = await getAuthDriver(supabase, adminClient);
  if (error) return error;

  const { data: orders, error: dbError } = await adminClient
    .from('orders')
    .select('*, pharmacies(id, name, address, city, phone, latitude, longitude)')
    .eq('driver_id', driver!.id)
    .in('status', ['assigned', 'acknowledged', 'picked_up', 'out_for_delivery'])
    .order('created_at', { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ orders: orders || [] });
}

// PATCH: update delivery status
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { driver, error } = await getAuthDriver(supabase, adminClient);
  if (error) return error;

  const formData = await request.formData();
  const action = formData.get('action') as string;
  const orderId = formData.get('order_id') as string | null;
  const pharmacyId = formData.get('pharmacy_id') as string | null;

  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 });

  // ── Group-level actions (affect all orders in pharmacy group) ──────────

  if (action === 'acknowledge' || action === 'pickup') {
    if (!pharmacyId) return NextResponse.json({ error: 'pharmacy_id is required' }, { status: 400 });

    const fromStatus = action === 'acknowledge' ? 'assigned' : 'acknowledged';
    const toStatus = action === 'acknowledge' ? 'acknowledged' : 'picked_up';
    const timestampField = action === 'acknowledge' ? 'acknowledged_at' : 'picked_up_at';

    const { data: orders, error: updateErr } = await adminClient
      .from('orders')
      .update({ status: toStatus, [timestampField]: new Date().toISOString() })
      .eq('driver_id', driver!.id)
      .eq('pharmacy_id', pharmacyId)
      .eq('status', fromStatus)
      .select();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ orders: orders || [] });
  }

  // ── Per-order actions ──────────────────────────────────────────────────

  if (!orderId) return NextResponse.json({ error: 'order_id is required' }, { status: 400 });

  // Verify order belongs to this driver
  const { data: existing, error: fetchErr } = await adminClient
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('driver_id', driver!.id)
    .single();

  if (fetchErr || !existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // ── out_for_delivery ──
  if (action === 'out_for_delivery') {
    if (existing.status !== 'picked_up') {
      return NextResponse.json({ error: 'Order must be picked_up first' }, { status: 400 });
    }
    const { data: order, error: updateErr } = await adminClient
      .from('orders')
      .update({ status: 'out_for_delivery' })
      .eq('id', orderId)
      .select('*, pharmacies(id, name, address, city, phone, latitude, longitude)')
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ order });
  }

  // ── cancel ──
  if (action === 'cancel') {
    if (existing.status === 'out_for_delivery') {
      return NextResponse.json({ error: 'Cannot cancel an order that is already out for delivery' }, { status: 400 });
    }
    if (!['assigned', 'acknowledged', 'picked_up'].includes(existing.status)) {
      return NextResponse.json({ error: 'Order cannot be cancelled from current status' }, { status: 400 });
    }
    const { data: order, error: updateErr } = await adminClient
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ order });
  }

  // ── deliver / fail ──
  if (action === 'deliver' || action === 'fail') {
    if (existing.status !== 'out_for_delivery') {
      return NextResponse.json({ error: 'Order must be out_for_delivery first' }, { status: 400 });
    }

    const deliveryNotes = formData.get('delivery_notes') as string | null;
    const failureReason = formData.get('failure_reason') as string | null;
    const deliveryPhoto = formData.get('delivery_photo') as File | null;
    const signaturePhoto = formData.get('signature_photo') as File | null;

    const updates: Record<string, unknown> = {};

    if (deliveryNotes) updates.delivery_notes = deliveryNotes;

    if (deliveryPhoto) {
      const ext = deliveryPhoto.name.split('.').pop();
      const path = `${driver!.id}/${orderId}-delivery-${Date.now()}.${ext}`;
      const buffer = await deliveryPhoto.arrayBuffer();
      const { error: uploadErr } = await adminClient.storage
        .from('driver-documents')
        .upload(path, buffer, { contentType: deliveryPhoto.type });
      if (!uploadErr) updates.delivery_photo_url = path;
    }

    if (signaturePhoto) {
      const ext = signaturePhoto.name.split('.').pop();
      const path = `${driver!.id}/${orderId}-signature-${Date.now()}.${ext}`;
      const buffer = await signaturePhoto.arrayBuffer();
      const { error: uploadErr } = await adminClient.storage
        .from('driver-documents')
        .upload(path, buffer, { contentType: signaturePhoto.type });
      if (!uploadErr) updates.delivery_signature_url = path;
    }

    if (action === 'deliver') {
      updates.status = 'delivered';
      updates.delivered_at = new Date().toISOString();
    } else {
      if (!failureReason) return NextResponse.json({ error: 'failure_reason is required' }, { status: 400 });
      updates.status = 'delivery_failed';
      updates.failure_reason = failureReason;
    }

    const { data: order, error: updateErr } = await adminClient
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('*, pharmacies(id, name, address, city, phone, latitude, longitude)')
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ order });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
