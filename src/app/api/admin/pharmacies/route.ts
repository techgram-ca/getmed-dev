import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const supabase = createAdminClient();
  const { data: pharmacies, error: dbError } = await supabase
    .from('pharmacies')
    .select('*')
    .order('created_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ pharmacies });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id, action } = await request.json();

  const statusMap: Record<string, string> = {
    approve: 'approved',
    reject: 'rejected',
    suspend: 'suspended',
  };

  if (!id || !statusMap[action]) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch the pharmacy first so we have user_id for auth operations
  const { data: existing, error: fetchError } = await supabase
    .from('pharmacies')
    .select('user_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 });
  }

  const { data, error: dbError } = await supabase
    .from('pharmacies')
    .update({ status: statusMap[action] })
    .eq('id', id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // When approving, confirm the auth user's email so they can sign in immediately
  // (handles pharmacies registered before email_confirm was set, or Supabase
  //  projects with email confirmation enabled)
  if (action === 'approve') {
    await supabase.auth.admin.updateUserById(existing.user_id, { email_confirm: true });
  }

  return NextResponse.json({ pharmacy: data });
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = createAdminClient();
  const { error: dbError } = await supabase
    .from('pharmacies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
