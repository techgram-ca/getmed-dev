import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const orderId = searchParams.get('order_id');

  if (!path || !orderId) {
    return NextResponse.json({ error: 'path and order_id are required' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Verify the requesting user owns the pharmacy that owns this order
  const { data: pharmacy } = await adminClient
    .from('pharmacies')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!pharmacy) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: order } = await adminClient
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('pharmacy_id', pharmacy.id)
    .single();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const { data, error } = await adminClient.storage
    .from('driver-documents')
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate image URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
