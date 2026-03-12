'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PharmacyCard from '@/components/pharmacy/PharmacyCard';
import Button from '@/components/ui/Button';
import { Pharmacy } from '@/types';
import { MapPin, Search, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

const PharmacyMap = dynamic(() => import('@/components/map/PharmacyMap'), { ssr: false });

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const address = searchParams.get('address') || '';
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!lat || !lng) return;

    const fetchPharmacies = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/search?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Search failed');
        setPharmacies(data.pharmacies);
        setRadiusKm(data.radiusKm);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacies();
  }, [lat, lng]);

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedId(id);
    const el = cardRefs.current.get(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleSelectPharmacy = (pharmacy: Pharmacy) => {
    const params = new URLSearchParams({
      pharmacy_id: pharmacy.id,
      pharmacy_name: pharmacy.name,
      address,
      lat: lat.toString(),
      lng: lng.toString(),
    });
    router.push(`/order?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          ← Back
        </Button>
        <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
          <MapPin size={14} className="text-blue-500 shrink-0" />
          <span className="truncate">{address}</span>
        </div>
        <span className="text-xs text-gray-400 ml-auto shrink-0">Within {radiusKm} km</span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Finding nearby pharmacies…</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle size={40} className="mx-auto mb-3" />
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/')}>
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: pharmacy list */}
          <div className="w-full md:w-[420px] lg:w-[480px] flex flex-col shrink-0 border-r border-gray-200">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
              <h2 className="font-semibold text-gray-900">
                {pharmacies.length === 0
                  ? 'No pharmacies found'
                  : `${pharmacies.length} Pharmacie${pharmacies.length === 1 ? '' : 's'} Found`}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Sorted by distance</p>
            </div>

            {pharmacies.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Search size={40} className="text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">No approved pharmacies found within {radiusKm} km</p>
                <p className="text-sm text-gray-400">Try a different address or check back later.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/')}>
                  Change Address
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pharmacies.map((pharmacy) => (
                  <div
                    key={pharmacy.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(pharmacy.id, el);
                    }}
                  >
                    <PharmacyCard
                      pharmacy={pharmacy}
                      selected={selectedId === pharmacy.id}
                      onCardClick={() => setSelectedId(pharmacy.id)}
                      onSelect={() => handleSelectPharmacy(pharmacy)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: map */}
          <div className="hidden md:block flex-1 p-3">
            {lat && lng && (
              <PharmacyMap
                pharmacies={pharmacies}
                userLat={lat}
                userLng={lng}
                selectedId={selectedId}
                onMarkerClick={handleMarkerClick}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
