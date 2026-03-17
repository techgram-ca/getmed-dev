import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const supabase = createAdminClient();
  const { data: drivers, error: dbError } = await supabase
    .from('drivers')
    .select('*')
    .order('created_at', { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ drivers });
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id, action } = await request.json();

  const statusMap: Record<string, string> = {
    approve: 'approved',
    reject: 'rejected',
  };

  if (!id || !statusMap[action]) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from('drivers')
    .select('user_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  }

  const { data, error: dbError } = await supabase
    .from('drivers')
    .update({ status: statusMap[action] })
    .eq('id', id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  if (action === 'approve') {
    await supabase.auth.admin.updateUserById(existing.user_id, { email_confirm: true });
  }

  return NextResponse.json({ driver: data });
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = createAdminClient();
  const { error: dbError } = await supabase
    .from('drivers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
