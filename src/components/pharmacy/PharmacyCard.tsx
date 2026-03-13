'use client';

import { Pharmacy } from '@/types';
import { formatDistance, getTodayHours, PAYMENT_METHOD_LABELS, cn } from '@/lib/utils';
import StarRating from '@/components/ui/StarRating';
import Button from '@/components/ui/Button';
import { Phone, MapPin, Clock, CreditCard, PhoneCall } from 'lucide-react';

interface PharmacyCardProps {
  pharmacy: Pharmacy & { distance?: number };
  selected?: boolean;
  onSelect: () => void;
  onCardClick: () => void;
}

export default function PharmacyCard({ pharmacy, selected, onSelect, onCardClick }: PharmacyCardProps) {
  const todayHours = getTodayHours(pharmacy.opening_hours as Record<string, { open: string; close: string; closed?: boolean }>);

  return (
    <div
      onClick={onCardClick}
      className={cn(
        'bg-white rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-md',
        selected ? 'border-teal-500 shadow-teal-100 shadow-md' : 'border-gray-100'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-base leading-tight">{pharmacy.name}</h3>
          {pharmacy.distance !== undefined && (
            <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full mt-1 inline-block">
              {formatDistance(pharmacy.distance)} away
            </span>
          )}
        </div>
        <StarRating rating={pharmacy.rating} reviewCount={pharmacy.review_count} />
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-start gap-2">
          <MapPin size={14} className="mt-0.5 text-gray-400 shrink-0" />
          <span>{pharmacy.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-gray-400" />
          <a href={`tel:${pharmacy.phone}`} className="hover:text-teal-600" onClick={e => e.stopPropagation()}>
            {pharmacy.phone}
          </a>
        </div>
        {pharmacy.emergency_contact && (
          <div className="flex items-center gap-2">
            <PhoneCall size={14} className="text-red-400" />
            <span className="text-xs">Emergency: {pharmacy.emergency_contact}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span>{todayHours}</span>
        </div>
        {pharmacy.accepted_payment_methods?.length > 0 && (
          <div className="flex items-start gap-2">
            <CreditCard size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {pharmacy.accepted_payment_methods.map((m) => (
                <span key={m} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {PAYMENT_METHOD_LABELS[m] || m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        Select Pharmacy
      </Button>
    </div>
  );
}
