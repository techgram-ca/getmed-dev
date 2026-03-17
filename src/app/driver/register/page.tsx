'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { CheckCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const LICENSE_CLASSES = ['G', 'G2', 'G1', 'AZ', 'DZ', 'CZ', 'BZ', 'A', 'B', 'C', 'D', 'E', 'F'];

export default function DriverRegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: '', name: '', age: '', phone: '', email: '',
    password: '', confirmPassword: '', license_number: '', license_class: '',
  });
  const [licensePhoto, setLicensePhoto] = useState<File | null>(null);
  const [insurancePhoto, setInsurancePhoto] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.age || parseInt(form.age) < 18) errs.age = 'Must be at least 18 years old';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!form.license_number.trim()) errs.license_number = 'License number is required';
    if (!form.license_class) errs.license_class = 'License class is required';
    if (!licensePhoto) errs.license_photo = 'License photo is required';
    if (!insurancePhoto) errs.insurance_photo = 'Insurance photo is required';
    if (!termsAccepted) errs.terms = 'You must accept the terms and conditions';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('terms_accepted', 'true');
      fd.append('license_photo', licensePhoto!);
      fd.append('insurance_photo', insurancePhoto!);

      const res = await fetch('/api/drivers', { method: 'POST', body: fd });
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
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h1>
        <p className="text-gray-500 mb-6">
          Your driver application is <strong>pending review</strong>. Our team will verify your documents and notify you by email once approved. This typically takes 1–2 business days.
        </p>
        <Button onClick={() => router.push('/driver/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Driver Registration</h1>
        <p className="text-gray-500 mt-1">Join GetMed as a delivery driver. Your application will be reviewed before activation.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              error={errors.name}
              placeholder="John Doe"
            />
            <Input
              label="Age"
              type="number"
              required
              value={form.age}
              onChange={(e) => update('age', e.target.value)}
              error={errors.age}
              placeholder="25"
            />
          </div>
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
              label="Email Address"
              type="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              error={errors.email}
              placeholder="driver@example.com"
            />
          </div>
        </div>

        {/* License Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Driver's License</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="License Number"
              required
              value={form.license_number}
              onChange={(e) => update('license_number', e.target.value)}
              error={errors.license_number}
              placeholder="A1234-56789-00000"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                License Class <span className="text-red-500">*</span>
              </label>
              <select
                value={form.license_class}
                onChange={(e) => update('license_class', e.target.value)}
                className={cn(
                  'border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500',
                  errors.license_class ? 'border-red-400' : 'border-gray-300'
                )}
              >
                <option value="">Select class</option>
                {LICENSE_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.license_class && <p className="text-xs text-red-600">{errors.license_class}</p>}
            </div>
          </div>

          {/* License Photo Upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              License Photo <span className="text-red-500">*</span>
            </label>
            <label className={cn(
              'flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer hover:border-teal-400 transition-colors',
              licensePhoto ? 'border-teal-400 bg-teal-50' : 'border-gray-300',
              errors.license_photo ? 'border-red-400' : ''
            )}>
              <Upload size={18} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600 truncate">
                {licensePhoto ? licensePhoto.name : 'Upload front of driver\'s license'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  setLicensePhoto(e.target.files?.[0] || null);
                  setErrors((er) => ({ ...er, license_photo: '' }));
                }}
              />
            </label>
            {errors.license_photo && <p className="text-xs text-red-600 mt-1">{errors.license_photo}</p>}
          </div>

          {/* Insurance Photo Upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Insurance Photo <span className="text-red-500">*</span>
            </label>
            <label className={cn(
              'flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer hover:border-teal-400 transition-colors',
              insurancePhoto ? 'border-teal-400 bg-teal-50' : 'border-gray-300',
              errors.insurance_photo ? 'border-red-400' : ''
            )}>
              <Upload size={18} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600 truncate">
                {insurancePhoto ? insurancePhoto.name : 'Upload vehicle insurance document'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  setInsurancePhoto(e.target.files?.[0] || null);
                  setErrors((er) => ({ ...er, insurance_photo: '' }));
                }}
              />
            </label>
            {errors.insurance_photo && <p className="text-xs text-red-600 mt-1">{errors.insurance_photo}</p>}
          </div>
        </div>

        {/* Account */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Account Credentials</h2>
          <Input
            label="Username"
            required
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            error={errors.username}
            placeholder="johndoe_driver"
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
            <p className="mb-2 font-medium">GetMed Driver Agreement</p>
            <p className="mb-2">By registering as a GetMed delivery driver, you agree to the following terms:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-500">
              <li>You hold a valid Canadian driver's license and vehicle insurance at all times.</li>
              <li>You will handle all medications with care and maintain their integrity during delivery.</li>
              <li>You will maintain patient confidentiality and protect all personal health information.</li>
              <li>You will deliver orders promptly and professionally to the correct recipient.</li>
              <li>You will accurately record proof of delivery including photos and patient signature where required.</li>
              <li>GetMed reserves the right to suspend or remove drivers for non-compliance or misconduct.</li>
              <li>You consent to GetMed verifying your license and insurance documents.</li>
              <li>You will notify GetMed immediately of any changes to your license or insurance status.</li>
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
              I have read and agree to the <strong>GetMed Driver Agreement</strong> and Terms of Service.
            </span>
          </label>
          {errors.terms && <p className="text-xs text-red-600 mt-2">{errors.terms}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Submit Application
        </Button>

        <p className="text-center text-sm text-gray-500">
          Already registered?{' '}
          <a href="/driver/login" className="text-teal-600 hover:underline font-medium">Sign in</a>
        </p>
      </form>
    </div>
  );
}
