'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from '@/components/map/AddressAutocomplete';
import { Search, Store, Zap, ShieldCheck, Upload, ClipboardCheck, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const [location, setLocation] = useState<{ address: string; latitude: number; longitude: number } | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
    if (!location) {
      toast.error('Please select an Ontario address from the suggestions');
      return;
    }
    setSearching(true);
    const params = new URLSearchParams({
      address: location.address,
      lat: location.latitude.toString(),
      lng: location.longitude.toString(),
    });
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-col bg-[#F2F7F6]">

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">

        {/* Left — text + search */}
        <div>
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-600 text-sm font-medium px-4 py-1.5 rounded-full mb-7 border border-teal-100">
            <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
            Trusted by 10,000+ users
          </div>

          <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-5">
            Get Your{' '}
            <span className="text-teal-500">Medicines</span>{' '}
            Delivered
          </h1>

          <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
            Quickly order prescription medicines from nearby pharmacies and get them delivered
            straight to your door — safe, fast, and hassle-free.
          </p>

          {/* Search row */}
          <div className="flex items-start gap-3 mb-5">
            <div className="flex-1">
              <AddressAutocomplete
                onSelect={setLocation}
                onClear={() => setLocation(null)}
                placeholder="Enter your delivery address..."
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold px-5 py-3 rounded-lg transition-colors whitespace-nowrap shadow-sm disabled:opacity-70 shrink-0"
            >
              <Search size={16} />
              {searching ? 'Searching…' : 'Find Pharmacies'}
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D'].map((l) => (
                <div
                  key={l}
                  className="w-8 h-8 rounded-full bg-teal-100 border-2 border-white flex items-center justify-center text-xs font-bold text-teal-700"
                >
                  {l}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">Join thousands getting medicines delivered daily</p>
          </div>
        </div>

        {/* Right — illustration card */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-100 p-8 relative overflow-hidden">
            {/* Wavy teal background blobs */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <svg
                viewBox="0 0 400 420"
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="xMidYMid slice"
              >
                <path
                  d="M0,220 C80,120 200,320 320,170 C390,100 420,220 400,320 L400,420 L0,420 Z"
                  fill="#14B8A6"
                  opacity="0.12"
                />
                <path
                  d="M0,310 C110,220 220,370 340,270 C390,230 400,310 400,420 L0,420 Z"
                  fill="#14B8A6"
                  opacity="0.18"
                />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-6 py-6">
              {/* Icon */}
              <div className="w-32 h-32 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100">
                <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                  <rect x="14" y="24" width="44" height="38" rx="6" fill="#CCFBF1" stroke="#14B8A6" strokeWidth="2" />
                  <path d="M26 24V20a10 10 0 0 1 20 0v4" stroke="#14B8A6" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M36 34v14M29 41h14" stroke="#0D9488" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>

              <div className="text-center">
                <p className="font-bold text-gray-800 text-lg">Fast &amp; Secure Delivery</p>
                <p className="text-gray-400 text-sm mt-1">Serving Ontario, Canada</p>
              </div>

              {/* Stats row */}
              <div className="flex gap-3 w-full">
                {[
                  { value: '24h', label: 'Delivery' },
                  { value: '100+', label: 'Pharmacies' },
                  { value: '10k+', label: 'Users' },
                ].map(({ value, label }) => (
                  <div key={label} className="flex-1 bg-teal-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-teal-600">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-teal-500 font-semibold text-xs uppercase tracking-widest mb-3">
              SIMPLE PROCESS
            </p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500 text-lg">
              Getting your medicines delivered is as easy as three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: 'STEP 01',
                title: 'Upload Prescription',
                desc: "Securely upload your doctor's prescription through our app. We accept photos and digital prescriptions.",
                icon: <Upload size={40} className="text-teal-500" />,
              },
              {
                step: 'STEP 02',
                title: 'Pharmacy Verifies',
                desc: 'Your selected pharmacy reviews and confirms the order, ensuring accuracy and safety for every medicine.',
                icon: <ClipboardCheck size={40} className="text-teal-500" />,
              },
              {
                step: 'STEP 03',
                title: 'Medicine Delivered',
                desc: 'Your medicines are carefully prepared and delivered right to your doorstep — quickly and reliably.',
                icon: <Package size={40} className="text-teal-500" />,
              },
            ].map(({ step, title, desc, icon }) => (
              <div
                key={step}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Illustration area */}
                <div className="bg-gray-50 rounded-xl flex items-center justify-center h-44 mb-6">
                  {icon}
                </div>
                {/* Step label with divider */}
                <p className="text-teal-500 text-xs font-bold uppercase tracking-widest pb-2 mb-3 border-b border-gray-100">
                  {step}
                </p>
                <h3 className="font-bold text-gray-900 text-xl mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose GetMed ── */}
      <section id="why-getmed" className="bg-[#F2F7F6] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-teal-500 font-semibold text-xs uppercase tracking-widest mb-3">
              OUR ADVANTAGES
            </p>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3">Why Choose GetMed</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              We&apos;re building a better way to get your medicines — convenient, safe, and
              community-focused.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            {[
              {
                icon: <Store size={28} className="text-white" />,
                title: 'Local Pharmacies',
                desc: 'Support trusted neighborhood pharmacies you already know. We connect you with verified local stores for reliable service.',
              },
              {
                icon: <Zap size={28} className="text-white" />,
                title: 'Fast Delivery',
                desc: 'Get your medicines delivered quickly — often within the same day. No more waiting in long pharmacy queues.',
              },
              {
                icon: <ShieldCheck size={28} className="text-white" />,
                title: 'Secure Prescriptions',
                desc: 'Your prescription data is kept safe and handled only by licensed pharmacies. Privacy and security come first.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mb-5 shadow-md">
                  {icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 3a3 3 0 0 1 3 3v1h1.5A1.5 1.5 0 0 1 16 8.5v7A1.5 1.5 0 0 1 14.5 17h-9A1.5 1.5 0 0 1 4 15.5v-7A1.5 1.5 0 0 1 5.5 7H7V6a3 3 0 0 1 3-3zm0 1.5A1.5 1.5 0 0 0 8.5 6v1h3V6A1.5 1.5 0 0 0 10 4.5zm0 6a1 1 0 0 0-1 1v1.5a1 1 0 0 0 2 0V11.5a1 1 0 0 0-1-1z"
                  fill="white"
                />
              </svg>
            </div>
            <span className="font-bold text-teal-500 text-lg">GetMed</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-teal-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-teal-500 transition-colors">Terms</a>
            <a href="#" className="hover:text-teal-500 transition-colors">Support</a>
          </div>

          <p className="text-sm text-gray-400">Made with ♥ by GetMed © 2026</p>
        </div>
      </footer>
    </div>
  );
}
