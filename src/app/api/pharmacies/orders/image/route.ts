import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get('bucket');
  const path = searchParams.get('path');

  if (!bucket || !path) {
    return NextResponse.json({ error: 'Missing bucket or path' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = await createAdminClient();

  // Verify pharmacy owns the order that contains this image
  const { data: pharmacy } = await adminClient
    .from('pharmacies')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!pharmacy) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Verify the image path starts with pharmacy id
  if (!path.startsWith(pharmacy.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await adminClient.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to get image URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
