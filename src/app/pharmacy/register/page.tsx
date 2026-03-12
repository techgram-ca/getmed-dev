'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AddressAutocomplete from '@/components/map/AddressAutocomplete';
import { DAYS_OF_WEEK, cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'e_transfer', label: 'E-Transfer' },
];

const DEFAULT_HOURS = { open: '09:00', close: '18:00', closed: false };

export default function PharmacyRegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', emergency_contact: '', city: '', province: '', postal_code: '',
  });
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['cash', 'credit_card', 'debit_card']);
  const [hours, setHours] = useState(
    Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, { ...DEFAULT_HOURS }]))
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const togglePayment = (val: string) => {
    setPaymentMethods((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const updateHours = (day: string, field: string, value: string | boolean) => {
    setHours((h) => ({ ...h, [day]: { ...h[day], [field]: value } }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Pharmacy name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (!address) errs.address = 'Address is required';
    if (!latitude || !longitude) errs.address = 'Please select an address from the autocomplete';
    if (!termsAccepted) errs.terms = 'You must accept the terms and conditions';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/pharmacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          emergency_contact: form.emergency_contact,
          address,
          city: form.city,
          province: form.province,
          postal_code: form.postal_code,
          latitude,
          longitude,
          opening_hours: hours,
          accepted_payment_methods: paymentMethods,
          terms_accepted: termsAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSuccess(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Registration Submitted!</h1>
        <p className="text-gray-500 mb-6">
          Your pharmacy registration is <strong>pending review</strong>. Our team will review your application and notify you by email once approved. This typically takes 1–2 business days.
        </p>
        <Button onClick={() => router.push('/pharmacy/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Register Your Pharmacy</h1>
        <p className="text-gray-500 mt-1">Join GetMed to receive prescription orders from nearby patients.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Pharmacy Information</h2>
          <Input
            label="Pharmacy Name"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            error={errors.name}
            placeholder="City Pharmacy"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              error={errors.phone}
              placeholder="+1 (416) 555-0100"
            />
            <Input
              label="Emergency Contact"
              type="tel"
              value={form.emergency_contact}
              onChange={(e) => update('emergency_contact', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Location</h2>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Pharmacy Address <span className="text-red-500">*</span>
            </label>
            <AddressAutocomplete
              onSelect={(place) => {
                setAddress(place.address);
                setLatitude(place.latitude);
                setLongitude(place.longitude);
                setErrors((e) => ({ ...e, address: '' }));
              }}
              placeholder="Search your pharmacy address…"
            />
            {errors.address && <p className="text-xs text-red-600">{errors.address}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="City"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Toronto"
            />
            <Input
              label="Province"
              value={form.province}
              onChange={(e) => update('province', e.target.value)}
              placeholder="ON"
            />
            <Input
              label="Postal Code"
              value={form.postal_code}
              onChange={(e) => update('postal_code', e.target.value)}
              placeholder="M5V 2T6"
            />
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Opening Hours</h2>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium text-gray-600 capitalize">{day}</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!hours[day].closed}
                    onChange={(e) => updateHours(day, 'closed', !e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-500">Open</span>
                </label>
                {!hours[day].closed && (
                  <>
                    <input
                      type="time"
                      value={hours[day].open}
                      onChange={(e) => updateHours(day, 'open', e.target.value)}
                      className="text-sm border border-gray-200 rounded px-2 py-1"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                      type="time"
                      value={hours[day].close}
                      onChange={(e) => updateHours(day, 'close', e.target.value)}
                      className="text-sm border border-gray-200 rounded px-2 py-1"
                    />
                  </>
                )}
                {hours[day].closed && <span className="text-sm text-gray-400">Closed</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Accepted Payment Methods</h2>
          <div className="flex flex-wrap gap-3">
            {PAYMENT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => togglePayment(value)}
                className={cn(
                  'px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                  paymentMethods.includes(value)
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Account Credentials</h2>
          <Input
            label="Email Address"
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
            placeholder="pharmacy@example.com"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Password"
              type="password"
              required
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              error={errors.password}
              placeholder="Min 8 characters"
            />
            <Input
              label="Confirm Password"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              placeholder="Repeat password"
            />
          </div>
        </div>

        {/* Terms */}
        <div className={cn('bg-white rounded-xl border-2 p-6', errors.terms ? 'border-red-300 bg-red-50' : 'border-gray-200')}>
          <h2 className="font-semibold text-gray-900 mb-3">Terms & Conditions</h2>
          <div className="text-sm text-gray-600 mb-4 h-32 overflow-y-auto border border-gray-100 rounded-lg p-3 bg-gray-50">
            <p className="mb-2 font-medium">GetMed Pharmacy Partner Agreement</p>
            <p className="mb-2">By registering on GetMed, you agree to the following terms:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-500">
              <li>Your pharmacy must be a licensed, regulated pharmacy in your jurisdiction.</li>
              <li>You will accurately represent your services, hours, and contact information.</li>
              <li>All prescription processing must comply with applicable laws and regulations.</li>
              <li>You will maintain patient confidentiality and protect prescription data.</li>
              <li>Orders received through GetMed must be fulfilled promptly and professionally.</li>
              <li>GetMed reserves the right to suspend or remove pharmacies for non-compliance.</li>
              <li>You consent to GetMed conducting verification checks on your pharmacy.</li>
              <li>Prescription images received must be used solely for order fulfillment.</li>
            </ol>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => { setTermsAccepted(e.target.checked); setErrors((er) => ({ ...er, terms: '' })); }}
              className="mt-0.5 rounded"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the <strong>GetMed Pharmacy Partner Agreement</strong> and Terms of Service.
            </span>
          </label>
          {errors.terms && <p className="text-xs text-red-600 mt-2">{errors.terms}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Submit Registration
        </Button>

        <p className="text-center text-sm text-gray-500">
          Already registered?{' '}
          <a href="/pharmacy/login" className="text-blue-600 hover:underline font-medium">Sign in</a>
        </p>
      </form>
    </div>
  );
}
