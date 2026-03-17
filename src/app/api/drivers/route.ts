import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const username = formData.get('username') as string;
  const name = formData.get('name') as string;
  const age = formData.get('age') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const license_number = formData.get('license_number') as string;
  const license_class = formData.get('license_class') as string;
  const terms_accepted = formData.get('terms_accepted') === 'true';
  const licensePhoto = formData.get('license_photo') as File | null;
  const insurancePhoto = formData.get('insurance_photo') as File | null;

  if (!username || !name || !age || !phone || !email || !password || !license_number || !license_class) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!terms_accepted) {
    return NextResponse.json({ error: 'You must accept the terms and conditions' }, { status: 400 });
  }

  if (!licensePhoto || !insurancePhoto) {
    return NextResponse.json({ error: 'License photo and insurance photo are required' }, { status: 400 });
  }

  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
    return NextResponse.json({ error: 'Age must be between 18 and 99' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { role: 'driver', driver_name: name },
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Registration failed' }, { status: 400 });
  }

  const userId = authData.user.id;

  // Upload license photo
  let licensePhotoUrl: string | null = null;
  const licenseExt = licensePhoto.name.split('.').pop();
  const licensePath = `${userId}/license-${Date.now()}.${licenseExt}`;
  const licenseBuffer = await licensePhoto.arrayBuffer();
  const { error: licenseUploadError } = await adminClient.storage
    .from('driver-documents')
    .upload(licensePath, licenseBuffer, { contentType: licensePhoto.type });

  if (!licenseUploadError) {
    licensePhotoUrl = licensePath;
  }

  // Upload insurance photo
  let insurancePhotoUrl: string | null = null;
  const insuranceExt = insurancePhoto.name.split('.').pop();
  const insurancePath = `${userId}/insurance-${Date.now()}.${insuranceExt}`;
  const insuranceBuffer = await insurancePhoto.arrayBuffer();
  const { error: insuranceUploadError } = await adminClient.storage
    .from('driver-documents')
    .upload(insurancePath, insuranceBuffer, { contentType: insurancePhoto.type });

  if (!insuranceUploadError) {
    insurancePhotoUrl = insurancePath;
  }

  // Create driver record
  const { data: driver, error: driverError } = await adminClient
    .from('drivers')
    .insert({
      user_id: userId,
      username,
      name,
      age: ageNum,
      phone,
      email,
      license_number,
      license_class,
      license_photo_url: licensePhotoUrl,
      insurance_photo_url: insurancePhotoUrl,
      status: 'pending',
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (driverError) {
    await adminClient.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: driverError.message }, { status: 500 });
  }

  return NextResponse.json({ driver }, { status: 201 });
}
