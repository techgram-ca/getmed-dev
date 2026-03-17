import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: pharmacy, error } = await adminClient
    .from('pharmacies')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !pharmacy) return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });

  return NextResponse.json({ pharmacy });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: existing } = await adminClient
    .from('pharmacies')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!existing) return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });

  const body = await request.json();
  const allowed = ['name', 'phone', 'emergency_contact', 'address', 'city', 'province', 'postal_code', 'opening_hours', 'accepted_payment_methods'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: pharmacy, error } = await adminClient
    .from('pharmacies')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pharmacy });
}
