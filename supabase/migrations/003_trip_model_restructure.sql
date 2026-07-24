-- ════════════════════════════════════════════════════════════════
-- Kipita — 003: Trip-model restructure + expanded entities
-- ════════════════════════════════════════════════════════════════
-- Migrates the peer "rides" model to a driver-created "trips" model and
-- adds the entities needed to begin real integrations:
--   passenger profiles, cities, saved places, emergency contacts,
--   wallets + transactions, promo codes, media, trip stops, and richer
--   user / driver / vehicle / trip / booking / payment fields.
--
-- Non-destructive where possible (RENAME + ADD COLUMN). `ride_requests`
-- is retained — it powers the passenger-request side of the marketplace.
-- ════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 0. Generic helpers
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'deleted');
CREATE TYPE kyc_status AS ENUM ('not_submitted', 'pending', 'approved', 'rejected');
CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'van', 'minibus', 'pickup', 'motorbike');
CREATE TYPE wallet_txn_type AS ENUM ('credit', 'debit', 'refund', 'payout', 'topup', 'fee');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
CREATE TYPE media_type AS ENUM ('avatar', 'license', 'national_id', 'selfie', 'vehicle', 'insurance', 'other');

-- New payment methods (idempotent).
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'apple_pay';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'google_pay';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'cash';

-- ─────────────────────────────────────────────
-- 2. USERS — richer profile fields
-- ─────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name         TEXT,
  ADD COLUMN IF NOT EXISTS last_name          TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth      DATE,
  ADD COLUMN IF NOT EXISTS gender             gender,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS country            TEXT NOT NULL DEFAULT 'KE',
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS email_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status             user_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at         TIMESTAMPTZ;

-- Best-effort backfill of first/last name from full_name.
UPDATE public.users
SET first_name = COALESCE(first_name, NULLIF(split_part(full_name, ' ', 1), '')),
    last_name  = COALESCE(last_name, NULLIF(substr(full_name, length(split_part(full_name, ' ', 1)) + 2), ''))
WHERE full_name <> '';

-- ─────────────────────────────────────────────
-- 3. PASSENGER PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE public.passenger_profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  default_pickup_notes    TEXT,
  preferred_payment_method payment_method,
  rating                  NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_trips             INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);
CREATE TRIGGER trg_passenger_profiles_updated
  BEFORE UPDATE ON public.passenger_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- 4. DRIVER PROFILES — KYC, geo, earnings
-- ─────────────────────────────────────────────
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS national_id            TEXT,
  ADD COLUMN IF NOT EXISTS license_expiry         DATE,
  ADD COLUMN IF NOT EXISTS profile_photo          TEXT,
  ADD COLUMN IF NOT EXISTS license_photo          TEXT,
  ADD COLUMN IF NOT EXISTS selfie_photo           TEXT,
  ADD COLUMN IF NOT EXISTS background_check_status kyc_status NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS approval_status         kyc_status NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS is_online               BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepting_trips         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS current_latitude        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS current_longitude       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_seen               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating                  NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS completed_trips         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_trips         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earnings                NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_driver_profiles_online ON public.driver_profiles(is_online) WHERE is_online = TRUE;
CREATE TRIGGER trg_driver_profiles_updated
  BEFORE UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- 5. VEHICLES — type, capacity, documents
-- ─────────────────────────────────────────────
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type        vehicle_type NOT NULL DEFAULT 'sedan',
  ADD COLUMN IF NOT EXISTS seat_capacity       INTEGER NOT NULL DEFAULT 4 CHECK (seat_capacity >= 1 AND seat_capacity <= 60),
  ADD COLUMN IF NOT EXISTS photo               TEXT,
  ADD COLUMN IF NOT EXISTS insurance_number    TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expiry    DATE,
  ADD COLUMN IF NOT EXISTS inspection_expiry   DATE,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS active              BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TRIGGER trg_vehicles_updated
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- 6. CITIES
-- ─────────────────────────────────────────────
CREATE TABLE public.cities (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name      TEXT NOT NULL,
  county    TEXT,
  country   TEXT NOT NULL DEFAULT 'KE',
  latitude  DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, county)
);
CREATE INDEX idx_cities_name ON public.cities(name);

INSERT INTO public.cities (name, county, latitude, longitude) VALUES
  ('Nairobi',  'Nairobi',      -1.2864, 36.8172),
  ('Mombasa',  'Mombasa',      -4.0435, 39.6682),
  ('Kisumu',   'Kisumu',       -0.0917, 34.7680),
  ('Nakuru',   'Nakuru',       -0.3031, 36.0800),
  ('Eldoret',  'Uasin Gishu',   0.5143, 35.2698),
  ('Thika',    'Kiambu',       -1.0332, 37.0693),
  ('Nyeri',    'Nyeri',        -0.4169, 36.9510),
  ('Machakos', 'Machakos',     -1.5177, 37.2634),
  ('Kericho',  'Kericho',      -0.3689, 35.2831),
  ('Malindi',  'Kilifi',       -3.2192, 40.1169)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- 7. RIDES → TRIPS  (driver-created trips)
-- ─────────────────────────────────────────────
ALTER TYPE ride_status RENAME TO trip_status;
ALTER TABLE public.rides RENAME TO trips;

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS origin_city_id      UUID REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS destination_city_id UUID REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS estimated_arrival   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description         TEXT,
  ADD COLUMN IF NOT EXISTS pickup_point        TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_point       TEXT,
  ADD COLUMN IF NOT EXISTS allows_pets         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allows_smoking      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allows_luggage      BOOLEAN NOT NULL DEFAULT TRUE;

-- ─────────────────────────────────────────────
-- 8. TRIP STOPS
-- ─────────────────────────────────────────────
CREATE TABLE public.trip_stops (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id        UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  stop_order     INTEGER NOT NULL DEFAULT 0,
  city_id        UUID REFERENCES public.cities(id),
  label          TEXT,
  arrival_time   TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, stop_order)
);
CREATE INDEX idx_trip_stops_trip ON public.trip_stops(trip_id, stop_order);

-- ─────────────────────────────────────────────
-- 9. BOOKINGS — ride_id → trip_id, extra fields
-- ─────────────────────────────────────────────
ALTER TABLE public.bookings RENAME COLUMN ride_id TO trip_id;
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_location   TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location  TEXT,
  ADD COLUMN IF NOT EXISTS booking_reference TEXT UNIQUE DEFAULT ('KIP-' || upper(substr(md5(random()::text), 1, 8))),
  ADD COLUMN IF NOT EXISTS payment_status    payment_status,
  ADD COLUMN IF NOT EXISTS cancel_reason     TEXT;

-- ─────────────────────────────────────────────
-- 10. PAYMENTS — transaction ref, payer, paid_at
-- ─────────────────────────────────────────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payer_id              UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at               TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- 11. SAVED PLACES
-- ─────────────────────────────────────────────
CREATE TABLE public.saved_places (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  address    TEXT,
  latitude   DOUBLE PRECISION,
  longitude  DOUBLE PRECISION,
  is_home    BOOLEAN NOT NULL DEFAULT FALSE,
  is_work    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_saved_places_user ON public.saved_places(user_id);

-- ─────────────────────────────────────────────
-- 12. EMERGENCY CONTACTS
-- ─────────────────────────────────────────────
CREATE TABLE public.emergency_contacts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  relationship TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_emergency_contacts_user ON public.emergency_contacts(user_id);

-- ─────────────────────────────────────────────
-- 13. WALLETS + TRANSACTIONS
-- ─────────────────────────────────────────────
CREATE TABLE public.wallets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  balance    NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency   TEXT NOT NULL DEFAULT 'KES',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);
CREATE TRIGGER trg_wallets_updated
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id   UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  type        wallet_txn_type NOT NULL,
  reference   TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_txns_wallet ON public.wallet_transactions(wallet_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 14. PROMO CODES
-- ─────────────────────────────────────────────
CREATE TABLE public.promo_codes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT NOT NULL UNIQUE,
  discount_type  discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses       INTEGER,
  used_count     INTEGER NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code) WHERE active = TRUE;

-- ─────────────────────────────────────────────
-- 15. MEDIA (uploads: IDs, licenses, vehicle docs)
-- ─────────────────────────────────────────────
CREATE TABLE public.media (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  type       media_type NOT NULL DEFAULT 'other',
  mime_type  TEXT,
  size       INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_media_user ON public.media(user_id, type);

-- ─────────────────────────────────────────────
-- 16. Fix seat-deduction function for renamed table
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION deduct_seats(p_ride_id UUID, p_seats INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE current_available INTEGER;
BEGIN
  SELECT seats_available INTO current_available FROM public.trips WHERE id = p_ride_id FOR UPDATE;
  IF current_available IS NULL THEN RAISE EXCEPTION 'Trip not found'; END IF;
  IF current_available < p_seats THEN RETURN FALSE; END IF;
  UPDATE public.trips SET seats_available = seats_available - p_seats, updated_at = NOW() WHERE id = p_ride_id;
  RETURN TRUE;
END;
$$;

-- Auto-create a wallet whenever a user profile is created.
CREATE OR REPLACE FUNCTION handle_new_user_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_new_user_wallet
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_wallet();

-- ─────────────────────────────────────────────
-- 17. ROW LEVEL SECURITY for new tables
-- ─────────────────────────────────────────────
ALTER TABLE public.passenger_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media               ENABLE ROW LEVEL SECURITY;

-- Convenience: current app user id from the auth session.
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$;

CREATE POLICY "Passenger profiles own" ON public.passenger_profiles
  FOR ALL USING (user_id = current_app_user_id());

CREATE POLICY "Cities readable" ON public.cities FOR SELECT USING (true);

CREATE POLICY "Trip stops readable" ON public.trip_stops FOR SELECT USING (true);
CREATE POLICY "Trip stops owner write" ON public.trip_stops
  FOR ALL USING (trip_id IN (SELECT id FROM public.trips WHERE driver_id = current_app_user_id()));

CREATE POLICY "Saved places own" ON public.saved_places
  FOR ALL USING (user_id = current_app_user_id());

CREATE POLICY "Emergency contacts own" ON public.emergency_contacts
  FOR ALL USING (user_id = current_app_user_id());

CREATE POLICY "Wallets own" ON public.wallets
  FOR SELECT USING (user_id = current_app_user_id());

CREATE POLICY "Wallet txns own" ON public.wallet_transactions
  FOR SELECT USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = current_app_user_id()));

CREATE POLICY "Promo codes readable" ON public.promo_codes
  FOR SELECT USING (active = TRUE);

CREATE POLICY "Media own" ON public.media
  FOR ALL USING (user_id = current_app_user_id());

-- ─────────────────────────────────────────────
-- 18. REALTIME
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
