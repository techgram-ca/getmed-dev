/**
 * Haversine formula: distance in km between two lat/lng points
 */
export function calcDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export function getTodayHours(openingHours: Record<string, { open: string; close: string; closed?: boolean }>) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[new Date().getDay()];
  const hours = openingHours?.[today];
  if (!hours || hours.closed) return 'Closed today';
  return `${hours.open} – ${hours.close}`;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  insurance: 'Insurance',
  e_transfer: 'E-Transfer',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  assigned: 'Assigned to Driver',
  acknowledged: 'Acknowledged by Driver',
  picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery Failed',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  ready_for_delivery: 'bg-purple-100 text-purple-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  acknowledged: 'bg-sky-100 text-sky-800',
  picked_up: 'bg-cyan-100 text-cyan-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  delivery_failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const PHARMACY_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-800',
};

export const DRIVER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export const DELIVERY_FAILURE_REASONS = [
  'Patient not home',
  'Wrong address',
  'Patient refused delivery',
  'Unable to access building',
  'Order damaged',
  'Other',
];

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
