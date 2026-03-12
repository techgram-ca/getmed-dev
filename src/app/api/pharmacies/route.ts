import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    name, email, password, phone, emergency_contact,
    address, city, province, postal_code,
    latitude, longitude, opening_hours,
    accepted_payment_methods, terms_accepted,
  } = body;

  if (!name || !email || !password || !phone || !address || !latitude || !longitude) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!terms_accepted) {
    return NextResponse.json({ error: 'You must accept the terms and conditions' }, { status: 400 });
  }

  const supabase = await createClient();
  const adminClient = await createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: 'pharmacy', pharmacy_name: name } },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Registration failed' }, { status: 400 });
  }

  // Create pharmacy profile
  const { data: pharmacy, error: pharmacyError } = await adminClient
    .from('pharmacies')
    .insert({
      user_id: authData.user.id,
      name,
      email,
      phone,
      emergency_contact: emergency_contact || null,
      address,
      city: city || null,
      province: province || null,
      postal_code: postal_code || null,
      latitude,
      longitude,
      opening_hours: opening_hours || {},
      accepted_payment_methods: accepted_payment_methods || ['cash', 'credit_card', 'debit_card'],
      status: 'pending',
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (pharmacyError) {
    // Rollback auth user
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: pharmacyError.message }, { status: 500 });
  }

  return NextResponse.json({ pharmacy }, { status: 201 });
}
