import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

async function uploadFile(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  bucket: string,
  file: File,
  folder: string
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new Error('File too large (max 10 MB)');
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only image files are allowed');

  const ext = file.name.split('.').pop();
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, bytes, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);
  return filename;
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const formData = await request.formData();

  const orderType = formData.get('order_type') as string;
  const pharmacyId = formData.get('pharmacy_id') as string;
  const patientName = formData.get('patient_name') as string;
  const patientEmail = formData.get('patient_email') as string;
  const patientPhone = formData.get('patient_phone') as string;
  const patientAddress = formData.get('patient_address') as string;
  const patientLat = formData.get('patient_latitude') as string;
  const patientLng = formData.get('patient_longitude') as string;
  const healthCard = formData.get('health_card_number') as string;
  const otcMeds = formData.get('otc_medications') as string;
  const transferPharmacyName = formData.get('transfer_pharmacy_name') as string;
  const transferPharmacyPhone = formData.get('transfer_pharmacy_phone') as string;
  const transferPharmacyAddress = formData.get('transfer_pharmacy_address') as string;
  const transferMedDetails = formData.get('transfer_medication_details') as string;
  const prescriptionFile = formData.get('prescription_image') as File | null;
  const insuranceFile = formData.get('insurance_image') as File | null;

  // Validation
  if (!pharmacyId || !patientName || !patientEmail || !patientPhone || !patientAddress || !orderType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['otc', 'prescription', 'transfer'].includes(orderType)) {
    return NextResponse.json({ error: 'Invalid order type' }, { status: 400 });
  }

  if (orderType === 'prescription' && !prescriptionFile) {
    return NextResponse.json({ error: 'Prescription image is required' }, { status: 400 });
  }

  let prescriptionImageUrl: string | null = null;
  let insuranceImageUrl: string | null = null;

  try {
    if (prescriptionFile && prescriptionFile.size > 0) {
      prescriptionImageUrl = await uploadFile(supabase, 'prescriptions', prescriptionFile, pharmacyId);
    }
    if (insuranceFile && insuranceFile.size > 0) {
      insuranceImageUrl = await uploadFile(supabase, 'insurance-cards', insuranceFile, pharmacyId);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'File upload failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      pharmacy_id: pharmacyId,
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone,
      patient_address: patientAddress,
      patient_latitude: patientLat ? parseFloat(patientLat) : null,
      patient_longitude: patientLng ? parseFloat(patientLng) : null,
      health_card_number: healthCard || null,
      order_type: orderType,
      otc_medications: otcMeds || null,
      transfer_pharmacy_name: transferPharmacyName || null,
      transfer_pharmacy_phone: transferPharmacyPhone || null,
      transfer_pharmacy_address: transferPharmacyAddress || null,
      transfer_medication_details: transferMedDetails || null,
      prescription_image_url: prescriptionImageUrl,
      insurance_image_url: insuranceImageUrl,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order }, { status: 201 });
}
