'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Upload, X, FileImage, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

type OrderType = 'otc' | 'prescription' | 'transfer';

function FileUploadField({
  label,
  file,
  onSelect,
  onClear,
  required,
  hint,
}: {
  label: string;
  file: File | null;
  onSelect: (f: File) => void;
  onClear: () => void;
  required?: boolean;
  hint?: string;
}) {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {file ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <FileImage size={18} className="text-green-600" />
          <span className="text-sm text-green-800 truncate flex-1">{file.name}</span>
          <button onClick={onClear} className="text-gray-400 hover:text-red-500">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors"
        >
          <Upload size={24} className="text-gray-400" />
          <span className="text-sm text-gray-500">Click to upload image (JPG, PNG, WEBP)</span>
          <span className="text-xs text-gray-400">Max 10 MB</span>
          <input
            id={id}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}
          />
        </label>
      )}
    </div>
  );
}

function OrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pharmacyId = searchParams.get('pharmacy_id') || '';
  const pharmacyName = searchParams.get('pharmacy_name') || '';
  const deliveryAddress = searchParams.get('address') || '';
  const lat = searchParams.get('lat') || '';
  const lng = searchParams.get('lng') || '';

  const [orderType, setOrderType] = useState<OrderType>('prescription');
  const [form, setForm] = useState({
    patient_name: '',
    patient_email: '',
    patient_phone: '',
    health_card_number: '',
    otc_medications: '',
    transfer_pharmacy_name: '',
    transfer_pharmacy_phone: '',
    transfer_pharmacy_address: '',
    transfer_medication_details: '',
  });
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.patient_name.trim()) errs.patient_name = 'Name is required';
    if (!form.patient_email.trim()) errs.patient_email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.patient_email)) errs.patient_email = 'Invalid email';
    if (!form.patient_phone.trim()) errs.patient_phone = 'Phone is required';
    if (orderType === 'prescription' && !prescriptionFile) errs.prescription = 'Prescription image is required';
    if (orderType === 'otc' && !form.otc_medications.trim()) errs.otc_medications = 'Please list the medications';
    if (orderType === 'transfer') {
      if (!form.transfer_pharmacy_name.trim()) errs.transfer_pharmacy_name = 'Transfer pharmacy name is required';
      if (!form.transfer_medication_details.trim()) errs.transfer_medication_details = 'Medication details are required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('pharmacy_id', pharmacyId);
      fd.append('order_type', orderType);
      fd.append('patient_name', form.patient_name);
      fd.append('patient_email', form.patient_email);
      fd.append('patient_phone', form.patient_phone);
      fd.append('patient_address', deliveryAddress);
      fd.append('patient_latitude', lat);
      fd.append('patient_longitude', lng);
      fd.append('health_card_number', form.health_card_number);
      fd.append('otc_medications', form.otc_medications);
      fd.append('transfer_pharmacy_name', form.transfer_pharmacy_name);
      fd.append('transfer_pharmacy_phone', form.transfer_pharmacy_phone);
      fd.append('transfer_pharmacy_address', form.transfer_pharmacy_address);
      fd.append('transfer_medication_details', form.transfer_medication_details);
      if (prescriptionFile) fd.append('prescription_image', prescriptionFile);
      if (insuranceFile) fd.append('insurance_image', insuranceFile);

      const res = await fetch('/api/orders', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      router.push(`/order/confirmation?order_id=${data.order.id}&pharmacy=${encodeURIComponent(pharmacyName)}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const orderTypes: { value: OrderType; label: string; desc: string }[] = [
    { value: 'prescription', label: 'Prescription', desc: 'Upload your prescription image' },
    { value: 'otc', label: 'Over the Counter', desc: 'List medications without a prescription' },
    { value: 'transfer', label: 'Transfer', desc: 'Transfer prescription from another pharmacy' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">Place Your Order</h1>
        <p className="text-gray-500 mt-1">
          Ordering from <span className="font-semibold text-teal-600">{pharmacyName}</span>
        </p>
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
          <span>Delivery to: {deliveryAddress}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Order Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Order Type</h2>
          <div className="grid grid-cols-3 gap-3">
            {orderTypes.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setOrderType(value); setErrors({}); }}
                className={cn(
                  'flex flex-col items-center text-center p-4 rounded-lg border-2 transition-all',
                  orderType === value
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                <span className="font-medium text-sm">{label}</span>
                <span className="text-xs mt-1 opacity-75">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Your Information</h2>
          <Input
            label="Full Name"
            required
            value={form.patient_name}
            onChange={(e) => update('patient_name', e.target.value)}
            error={errors.patient_name}
            placeholder="John Doe"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              required
              value={form.patient_email}
              onChange={(e) => update('patient_email', e.target.value)}
              error={errors.patient_email}
              placeholder="john@example.com"
            />
            <Input
              label="Phone Number"
              type="tel"
              required
              value={form.patient_phone}
              onChange={(e) => update('patient_phone', e.target.value)}
              error={errors.patient_phone}
              placeholder="+1 (416) 555-0100"
            />
          </div>
          <Input
            label="Health Card Number"
            value={form.health_card_number}
            onChange={(e) => update('health_card_number', e.target.value)}
            placeholder="Optional"
            hint="Provincial health card number (optional)"
          />
        </div>

        {/* OTC */}
        {orderType === 'otc' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Medications</h2>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Medication Names <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.otc_medications}
                onChange={(e) => { update('otc_medications', e.target.value); }}
                rows={3}
                placeholder="e.g. Tylenol 500mg, Advil 200mg, Claritin 10mg"
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm text-gray-900',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500',
                  errors.otc_medications ? 'border-red-400 bg-red-50' : 'border-gray-300'
                )}
              />
              <p className="text-xs text-gray-500">Separate multiple medications with commas</p>
              {errors.otc_medications && <p className="text-xs text-red-600">{errors.otc_medications}</p>}
            </div>
          </div>
        )}

        {/* Prescription */}
        {orderType === 'prescription' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Prescription</h2>
            <FileUploadField
              label="Prescription Image"
              file={prescriptionFile}
              onSelect={setPrescriptionFile}
              onClear={() => setPrescriptionFile(null)}
              required
            />
            {errors.prescription && <p className="text-xs text-red-600">{errors.prescription}</p>}
          </div>
        )}

        {/* Transfer */}
        {orderType === 'transfer' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Transfer Details</h2>
            <Input
              label="Current Pharmacy Name"
              required
              value={form.transfer_pharmacy_name}
              onChange={(e) => update('transfer_pharmacy_name', e.target.value)}
              error={errors.transfer_pharmacy_name}
              placeholder="Shoppers Drug Mart – King St"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Current Pharmacy Phone"
                type="tel"
                value={form.transfer_pharmacy_phone}
                onChange={(e) => update('transfer_pharmacy_phone', e.target.value)}
                placeholder="Optional"
              />
              <Input
                label="Current Pharmacy Address"
                value={form.transfer_pharmacy_address}
                onChange={(e) => update('transfer_pharmacy_address', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Medication or Prescription Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.transfer_medication_details}
                onChange={(e) => update('transfer_medication_details', e.target.value)}
                rows={3}
                placeholder="List the medications or provide prescription details to transfer"
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm text-gray-900',
                  'focus:outline-none focus:ring-2 focus:ring-teal-500',
                  errors.transfer_medication_details ? 'border-red-400 bg-red-50' : 'border-gray-300'
                )}
              />
              {errors.transfer_medication_details && <p className="text-xs text-red-600">{errors.transfer_medication_details}</p>}
            </div>
            <FileUploadField
              label="Prescription Image (Optional)"
              file={prescriptionFile}
              onSelect={setPrescriptionFile}
              onClear={() => setPrescriptionFile(null)}
            />
          </div>
        )}

        {/* Insurance */}
        {orderType !== 'otc' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Insurance (Optional)</h2>
            <FileUploadField
              label="Insurance Card Image"
              file={insuranceFile}
              onSelect={setInsuranceFile}
              onClear={() => setInsuranceFile(null)}
              hint="Upload your insurance card to have coverage applied"
            />
          </div>
        )}

        {/* Important Note */}
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Important:</strong> Please keep your original prescription ready for the delivery agent.
            If the original prescription is not provided at the time of delivery, the order will not be delivered.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Submit Order
        </Button>
      </form>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <OrderPageContent />
    </Suspense>
  );
}
