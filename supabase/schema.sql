-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (key, value, description) VALUES
  ('search_radius_km', '10', 'Default search radius for pharmacy search in kilometers')
ON CONFLICT (key) DO NOTHING;

-- Pharmacies Table
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_contact TEXT,
  address TEXT NOT NULL,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  opening_hours JSONB DEFAULT '{}',
  accepted_payment_methods TEXT[] DEFAULT ARRAY['cash', 'credit_card', 'debit_card'],
  services JSONB DEFAULT '{"portal_onboarding": true, "prescription_delivery": true}',
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  terms_accepted BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_address TEXT NOT NULL,
  patient_latitude DOUBLE PRECISION,
  patient_longitude DOUBLE PRECISION,
  health_card_number TEXT,
  order_type TEXT NOT NULL CHECK (order_type IN ('otc', 'prescription', 'transfer')),
  otc_medications TEXT,
  transfer_pharmacy_name TEXT,
  transfer_pharmacy_phone TEXT,
  transfer_pharmacy_address TEXT,
  transfer_medication_details TEXT,
  prescription_image_url TEXT,
  insurance_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready_for_delivery', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Pharmacy Policies
CREATE POLICY "Public can view approved pharmacies"
  ON pharmacies FOR SELECT
  USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "Pharmacies can view their own profile"
  ON pharmacies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Pharmacies can update their own profile"
  ON pharmacies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert pharmacy during registration"
  ON pharmacies FOR INSERT
  WITH CHECK (true);

-- Order Policies
CREATE POLICY "Anyone can insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Pharmacies can view their own orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pharmacies
      WHERE pharmacies.id = orders.pharmacy_id
      AND pharmacies.user_id = auth.uid()
    )
  );

CREATE POLICY "Pharmacies can update their own orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pharmacies
      WHERE pharmacies.id = orders.pharmacy_id
      AND pharmacies.user_id = auth.uid()
    )
  );

-- Platform settings readable by all authenticated
CREATE POLICY "Anyone can read platform settings"
  ON platform_settings FOR SELECT
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies(status);
CREATE INDEX IF NOT EXISTS idx_pharmacies_location ON pharmacies(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pharmacies_deleted ON pharmacies(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_pharmacy ON orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pharmacies_updated_at
  BEFORE UPDATE ON pharmacies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage buckets (run in Supabase dashboard or use API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('insurance-cards', 'insurance-cards', false);

-- Storage policies for prescriptions bucket
-- CREATE POLICY "Anyone can upload prescriptions" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'prescriptions');
-- CREATE POLICY "Authenticated users can view prescriptions" ON storage.objects
--   FOR SELECT USING (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

-- Storage policies for insurance-cards bucket
-- CREATE POLICY "Anyone can upload insurance cards" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'insurance-cards');
-- CREATE POLICY "Authenticated users can view insurance cards" ON storage.objects
--   FOR SELECT USING (bucket_id = 'insurance-cards' AND auth.role() = 'authenticated');
