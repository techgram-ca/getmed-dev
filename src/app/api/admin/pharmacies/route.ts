import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const supabase = await createAdminClient();
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

  const supabase = await createAdminClient();
  const { data, error: dbError } = await supabase
    .from('pharmacies')
    .update({ status: statusMap[action] })
    .eq('id', id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ pharmacy: data });
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = await createAdminClient();
  const { error: dbError } = await supabase
    .from('pharmacies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
