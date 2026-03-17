export interface Pharmacy {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  emergency_contact?: string;
  address: string;
  city?: string;
  province?: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  opening_hours: OpeningHours;
  accepted_payment_methods: string[];
  rating: number;
  review_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  services?: {
    portal_onboarding: boolean;
    prescription_delivery: boolean;
  };
  terms_accepted: boolean;
  terms_accepted_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  distance?: number; // km, computed client-side
}

export interface OpeningHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string;   // "09:00"
  close: string;  // "18:00"
  closed?: boolean;
}

export type OrderType = 'otc' | 'prescription' | 'transfer';
export type OrderStatus = 'pending' | 'processing' | 'ready_for_delivery' | 'assigned' | 'acknowledged' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'delivery_failed' | 'cancelled';

export interface Order {
  id: string;
  pharmacy_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_address: string;
  patient_latitude?: number;
  patient_longitude?: number;
  health_card_number?: string;
  order_type: OrderType;
  otc_medications?: string;
  transfer_pharmacy_name?: string;
  transfer_pharmacy_phone?: string;
  transfer_pharmacy_address?: string;
  transfer_medication_details?: string;
  prescription_image_url?: string;
  insurance_image_url?: string;
  status: OrderStatus;
  notes?: string;
  driver_id?: string;
  delivery_notes?: string;
  delivery_photo_url?: string;
  delivery_signature_url?: string;
  failure_reason?: string;
  assigned_at?: string;
  acknowledged_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  pharmacies?: Pharmacy;
  drivers?: Driver;
}

export type DriverStatus = 'pending' | 'approved' | 'rejected';

export interface Driver {
  id: string;
  user_id: string;
  username: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  license_number: string;
  license_class: string;
  license_photo_url?: string;
  insurance_photo_url?: string;
  status: DriverStatus;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformSettings {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface SearchLocation {
  address: string;
  latitude: number;
  longitude: number;
}
