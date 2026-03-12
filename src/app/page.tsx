'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddressAutocomplete from '@/components/map/AddressAutocomplete';
import Button from '@/components/ui/Button';
import { Search, ShieldCheck, Clock, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const [location, setLocation] = useState<{ address: string; latitude: number; longitude: number } | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = () => {
    if (!location) {
      toast.error('Please select an address from the suggestions');
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

  const features = [
    {
      icon: <Search size={28} className="text-blue-500" />,
      title: 'Find Nearby Pharmacies',
      desc: 'Search pharmacies within your area and compare options.',
    },
    {
      icon: <ShieldCheck size={28} className="text-green-500" />,
      title: 'Secure Prescription Upload',
      desc: 'Your prescriptions are stored securely and shared only with your chosen pharmacy.',
    },
    {
      icon: <Clock size={28} className="text-purple-500" />,
      title: 'Fast Processing',
      desc: 'Pharmacies are notified instantly and begin processing your order right away.',
    },
    {
      icon: <Truck size={28} className="text-orange-500" />,
      title: 'Next-Day Delivery',
      desc: 'Receive your medication delivered to your door by the next day.',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="relative max-w-4xl mx-auto px-4 py-24 sm:py-32 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Prescription Delivery,<br />
            <span className="text-blue-200">Right to Your Door</span>
          </h1>
          <p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
            Enter your address to find approved pharmacies near you and get your medications delivered without leaving home.
          </p>

          {/* Search Box */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl mx-auto">
            <p className="text-gray-700 font-medium mb-3 text-left">Your delivery address</p>
            <AddressAutocomplete
              onSelect={setLocation}
              placeholder="Start typing your address…"
            />
            <Button
              size="lg"
              className="w-full mt-4"
              onClick={handleSearch}
              loading={searching}
            >
              <Search size={18} />
              Find Nearby Pharmacies
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">How GetMed Works</h2>
        <p className="text-center text-gray-500 mb-12">Simple, fast, and secure prescription delivery in 4 easy steps.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Enter Address', desc: 'Type your delivery address to discover nearby pharmacies.' },
            { step: '2', title: 'Choose Pharmacy', desc: 'Browse pharmacies by distance, rating, and payment options.' },
            { step: '3', title: 'Upload Prescription', desc: 'Fill in your details and upload your prescription securely.' },
            { step: '4', title: 'Receive Delivery', desc: 'The pharmacy verifies and delivers your medication next day.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose GetMed?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map(({ icon, title, desc }) => (
              <div key={title} className="flex flex-col items-start gap-3 p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for pharmacies */}
      <section className="bg-blue-50 border-t border-blue-100">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Are you a pharmacy?</h2>
          <p className="text-gray-600 mb-6">
            Join GetMed to receive prescription orders from patients in your area and grow your business.
          </p>
          <a
            href="/pharmacy/register"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Register Your Pharmacy
          </a>
        </div>
      </section>
    </div>
  );
}
