'use client';

import { useEffect, useRef } from 'react';
import { Pharmacy } from '@/types';

interface PharmacyMapProps {
  pharmacies: Pharmacy[];
  userLat: number;
  userLng: number;
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
}

export default function PharmacyMap({
  pharmacies,
  userLat,
  userLng,
  selectedId,
  onMarkerClick,
}: PharmacyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Init map
  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: userLat, lng: userLng },
      zoom: 13,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    // User location marker
    new google.maps.Marker({
      position: { lat: userLat, lng: userLng },
      map: mapInstanceRef.current,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add/update pharmacy markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    pharmacies.forEach((p) => {
      const marker = new google.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map: mapInstanceRef.current!,
        title: p.name,
        icon: {
          url: `https://maps.google.com/mapfiles/ms/icons/${selectedId === p.id ? 'blue' : 'red'}-dot.png`,
        },
      });

      marker.addListener('click', () => onMarkerClick?.(p.id));
      markersRef.current.set(p.id, marker);
    });
  }, [pharmacies, onMarkerClick, selectedId]);

  // Highlight selected marker
  useEffect(() => {
    if (!window.google) return;
    markersRef.current.forEach((marker, id) => {
      marker.setIcon({
        url: `https://maps.google.com/mapfiles/ms/icons/${selectedId === id ? 'blue' : 'red'}-dot.png`,
      });
    });
    if (selectedId) {
      const marker = markersRef.current.get(selectedId);
      if (marker && mapInstanceRef.current) {
        mapInstanceRef.current.panTo(marker.getPosition()!);
      }
    }
  }, [selectedId]);

  return <div ref={mapRef} className="w-full h-full rounded-xl" />;
}
