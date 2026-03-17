import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: driver, error } = await adminClient
    .from('drivers')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !driver) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  }

  return NextResponse.json({ driver });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: existing } = await adminClient
    .from('drivers')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!existing) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

  const body = await request.json();
  const allowed = ['name', 'age', 'phone', 'license_number', 'license_class'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: driver, error } = await adminClient
    .from('drivers')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ driver });
}
