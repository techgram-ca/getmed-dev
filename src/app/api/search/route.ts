import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { calcDistance } from '@/lib/utils';
import { Pharmacy } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Get search radius from settings
  const { data: setting } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'search_radius_km')
    .single();

  const radiusKm = parseFloat(setting?.value || '10');

  // Approximate bounding box for rough DB filter (1 deg ≈ 111 km)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  const { data: pharmacies, error } = await supabase
    .from('pharmacies')
    .select('*')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .gte('latitude', lat - latDelta)
    .lte('latitude', lat + latDelta)
    .gte('longitude', lng - lngDelta)
    .lte('longitude', lng + lngDelta);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate precise distance and filter
  const results: (Pharmacy & { distance: number })[] = (pharmacies || [])
    .map((p: Pharmacy) => ({
      ...p,
      distance: calcDistance(lat, lng, p.latitude, p.longitude),
    }))
    .filter((p) => p.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  return NextResponse.json({ pharmacies: results, radiusKm });
}
