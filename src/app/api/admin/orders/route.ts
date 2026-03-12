import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const pharmacyId = searchParams.get('pharmacy_id');
  const status = searchParams.get('status');
  const city = searchParams.get('city');
  const date = searchParams.get('date');

  const supabase = createAdminClient();

  let query = supabase
    .from('orders')
    .select(`
      id,
      patient_name,
      patient_phone,
      patient_address,
      order_type,
      status,
      created_at,
      updated_at,
      pharmacy_id,
      pharmacies ( id, name, city )
    `)
    .order('created_at', { ascending: false });

  if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId);
  if (status) query = query.eq('status', status);
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
  }

  const { data: orders, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Filter by city after join — pharmacies may be an array from Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = city ? orders?.filter((o: any) => {
    const ph = Array.isArray(o.pharmacies) ? o.pharmacies[0] : o.pharmacies;
    return ph?.city?.toLowerCase().includes(city.toLowerCase());
  }) : orders;

  return NextResponse.json({ orders: filtered });
}
