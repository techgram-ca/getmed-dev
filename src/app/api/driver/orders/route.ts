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

// GET: driver's assigned orders grouped by pharmacy
export async function GET() {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { driver, error } = await getAuthDriver(supabase, adminClient);
  if (error) return error;

  const { data: orders, error: dbError } = await adminClient
    .from('orders')
    .select('*, pharmacies(id, name, address, city, phone, latitude, longitude)')
    .eq('driver_id', driver!.id)
    .in('status', ['assigned', 'out_for_delivery'])
    .order('created_at', { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ orders: orders || [] });
}

// PATCH: update delivery status for an order
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { driver, error } = await getAuthDriver(supabase, adminClient);
  if (error) return error;

  const formData = await request.formData();
  const orderId = formData.get('order_id') as string;
  const action = formData.get('action') as string; // acknowledge | deliver | fail
  const deliveryNotes = formData.get('delivery_notes') as string | null;
  const failureReason = formData.get('failure_reason') as string | null;
  const deliveryPhoto = formData.get('delivery_photo') as File | null;
  const signaturePhoto = formData.get('signature_photo') as File | null;

  if (!orderId || !action) {
    return NextResponse.json({ error: 'order_id and action are required' }, { status: 400 });
  }

  // Verify order belongs to this driver
  const { data: existing, error: fetchErr } = await adminClient
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('driver_id', driver!.id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (action === 'acknowledge') {
    if (existing.status !== 'assigned') {
      return NextResponse.json({ error: 'Order is not in assigned state' }, { status: 400 });
    }
    updates.status = 'out_for_delivery';
    updates.acknowledged_at = new Date().toISOString();
  } else if (action === 'deliver' || action === 'fail') {
    if (!['assigned', 'out_for_delivery'].includes(existing.status)) {
      return NextResponse.json({ error: 'Order cannot be completed from current status' }, { status: 400 });
    }

    if (deliveryNotes) updates.delivery_notes = deliveryNotes;

    // Upload delivery photo if provided
    if (deliveryPhoto) {
      const ext = deliveryPhoto.name.split('.').pop();
      const path = `${driver!.id}/${orderId}-delivery-${Date.now()}.${ext}`;
      const buffer = await deliveryPhoto.arrayBuffer();
      const { error: uploadErr } = await adminClient.storage
        .from('driver-documents')
        .upload(path, buffer, { contentType: deliveryPhoto.type });
      if (!uploadErr) updates.delivery_photo_url = path;
    }

    // Upload signature if provided
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
      if (!failureReason) {
        return NextResponse.json({ error: 'failure_reason is required' }, { status: 400 });
      }
      updates.status = 'delivery_failed';
      updates.failure_reason = failureReason;
    }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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
