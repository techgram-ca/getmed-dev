'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  onSelect: (place: { address: string; latitude: number; longitude: number }) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

// Ontario, Canada bounding box — biases autocomplete results toward the province
const ONTARIO_BOUNDS = {
  north: 56.931393,
  south: 41.676556,
  east: -74.320576,
  west: -95.156227,
};

function isOntario(components: google.maps.GeocoderAddressComponent[]): boolean {
  return components.some(
    (c) =>
      c.types.includes('administrative_area_level_1') &&
      (c.short_name === 'ON' || c.long_name === 'Ontario')
  );
}

function isCanada(components: google.maps.GeocoderAddressComponent[]): boolean {
  return components.some(
    (c) => c.types.includes('country') && c.short_name === 'CA'
  );
}

export default function AddressAutocomplete({
  onSelect,
  onClear,
  placeholder = 'Enter your Ontario address…',
  className,
  defaultValue = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  // Load Google Maps script once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if (window.google?.maps?.places) {
      setLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          setLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    window.initGoogleMaps = () => setLoaded(true);
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Attach autocomplete once Maps is loaded
  useEffect(() => {
    if (!loaded || !inputRef.current) return;

    const bounds = new google.maps.LatLngBounds(
      { lat: ONTARIO_BOUNDS.south, lng: ONTARIO_BOUNDS.west },
      { lat: ONTARIO_BOUNDS.north, lng: ONTARIO_BOUNDS.east }
    );

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      // Restrict results to Canada only at the API level
      componentRestrictions: { country: 'ca' },
      // Bias the dropdown ranking toward Ontario addresses
      bounds,
      strictBounds: false,
      fields: ['formatted_address', 'geometry', 'address_components'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.geometry?.location || !place.address_components) return;

      const components = place.address_components;

      // Double-check it's in Canada (API restriction covers this, but be safe)
      if (!isCanada(components)) {
        setValue('');
        setError('Only Canadian addresses are supported.');
        onClear?.();
        return;
      }

      // Enforce Ontario-only
      if (!isOntario(components)) {
        setValue('');
        setError('GetMed is currently available in Ontario, Canada only.');
        onClear?.();
        return;
      }

      setError('');
      const address = place.formatted_address || '';
      setValue(address);
      onSelect({
        address,
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
      });
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [loaded, onSelect, onClear]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <MapPin
          size={18}
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none',
            error ? 'text-red-400' : 'text-gray-400'
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError('');
          }}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-4 py-3 rounded-lg border bg-white text-gray-900',
            'focus:outline-none focus:ring-2 focus:border-transparent',
            'text-base shadow-sm',
            error
              ? 'border-red-400 bg-red-50 focus:ring-red-400'
              : 'border-gray-300 focus:ring-teal-500',
            className
          )}
          autoComplete="off"
        />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
