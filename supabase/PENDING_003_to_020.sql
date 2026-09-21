-- ════════════════════════════════════════════════════════════════
-- Kipita: migrations 003-020, concatenated in order.
-- Paste into the Supabase SQL Editor and run once, then run seed.sql.
-- Generated 2026-09-22. Do not edit by hand.
-- ════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- 003_trip_model_restructure.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Kipita â€” 003: Trip-model restructure + expanded entities
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Migrates the peer "rides" model to a driver-created "trips" model and
-- adds the entities needed to begin real integrations:
--   passenger profiles, cities, saved places, emergency contacts,
--   wallets + transactions, promo codes, media, trip stops, and richer
--   user / driver / vehicle / trip / booking / payment fields.
--
-- Non-destructive where possible (RENAME + ADD COLUMN). `ride_requests`
-- is retained â€” it powers the passenger-request side of the marketplace.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 0. Generic helpers
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 1. ENUMS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2. USERS â€” richer profile fields
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 3. PASSENGER PROFILES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 4. DRIVER PROFILES â€” KYC, geo, earnings
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 5. VEHICLES â€” type, capacity, documents
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 6. CITIES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 7. RIDES â†’ TRIPS  (driver-created trips)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 8. TRIP STOPS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 9. BOOKINGS â€” ride_id â†’ trip_id, extra fields
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.bookings RENAME COLUMN ride_id TO trip_id;
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_location   TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location  TEXT,
  ADD COLUMN IF NOT EXISTS booking_reference TEXT UNIQUE DEFAULT ('KIP-' || upper(substr(md5(random()::text), 1, 8))),
  ADD COLUMN IF NOT EXISTS payment_status    payment_status,
  ADD COLUMN IF NOT EXISTS cancel_reason     TEXT;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 10. PAYMENTS â€” transaction ref, payer, paid_at
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payer_id              UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at               TIMESTAMPTZ;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 11. SAVED PLACES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 12. EMERGENCY CONTACTS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE public.emergency_contacts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  relationship TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_emergency_contacts_user ON public.emergency_contacts(user_id);

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 13. WALLETS + TRANSACTIONS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 14. PROMO CODES
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 15. MEDIA (uploads: IDs, licenses, vehicle docs)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 16. Fix seat-deduction function for renamed table
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 17. ROW LEVEL SECURITY for new tables
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 18. REALTIME
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;


-- ───────────────────────────────────────────────────────────────
-- 004_auth_profile_security.sql
-- ───────────────────────────────────────────────────────────────
-- Kipita authentication hardening and profile provisioning.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_prompt_dismissed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_name TEXT;
BEGIN
  profile_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(CONCAT_WS(' ', NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name')), ''),
    ''
  );

  INSERT INTO public.users (
    auth_id,
    full_name,
    first_name,
    last_name,
    phone,
    email,
    email_verified,
    phone_verified
  )
  VALUES (
    NEW.id,
    profile_name,
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'first_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'last_name'), ''),
    NEW.phone,
    NEW.email,
    NEW.email_confirmed_at IS NOT NULL,
    NEW.phone_confirmed_at IS NOT NULL
  )
  ON CONFLICT (auth_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    email_verified = EXCLUDED.email_verified,
    phone_verified = EXCLUDED.phone_verified,
    full_name = CASE
      WHEN public.users.full_name = '' THEN EXCLUDED.full_name
      ELSE public.users.full_name
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_changed
AFTER INSERT OR UPDATE OF email, phone, email_confirmed_at, phone_confirmed_at, raw_user_meta_data
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_profile();

-- Backfill profiles for any auth users created before the trigger was deployed.
INSERT INTO public.users (auth_id, full_name, phone, email, email_verified, phone_verified)
SELECT
  id,
  COALESCE(NULLIF(TRIM(raw_user_meta_data ->> 'full_name'), ''), ''),
  phone,
  email,
  email_confirmed_at IS NOT NULL,
  phone_confirmed_at IS NOT NULL
FROM auth.users
ON CONFLICT (auth_id) DO NOTHING;

DROP POLICY IF EXISTS "Users can update own" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Public app surfaces may read only non-sensitive profile attributes. Phone,
-- email and auth identifiers are never selectable through the client role.
REVOKE SELECT ON public.users FROM anon, authenticated;
GRANT SELECT (
  id,
  full_name,
  first_name,
  last_name,
  avatar_url,
  date_of_birth,
  gender,
  preferred_language,
  country,
  city,
  is_verified,
  rating,
  total_trips,
  created_at,
  updated_at,
  profile_prompt_dismissed_at
) ON public.users TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS SETOF public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_profile() TO authenticated;

-- Clients may update only non-sensitive profile fields. Verification and auth
-- identifiers remain owned by Supabase Auth and the database trigger above.
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (
  full_name,
  first_name,
  last_name,
  avatar_url,
  date_of_birth,
  gender,
  preferred_language,
  country,
  city,
  profile_prompt_dismissed_at,
  updated_at
) ON public.users TO authenticated;

-- ───────────────────────────────────────────────────────────────
-- 005_message_attachments.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- MESSAGE ATTACHMENTS (images, GIFs, voice notes)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Adds attachment columns to messages and a public 'chat-media' storage bucket.
-- Text messages keep using `content`; media-only messages send content = '' and
-- carry the file in attachment_url with type/meta describing it.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_type TEXT
    CHECK (attachment_type IN ('image', 'gif', 'audio')),
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_meta JSONB;

-- Allow media-only messages (empty text) without dropping the NOT NULL guard.
ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';

-- â”€â”€ Storage bucket for chat media â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  TRUE,
  26214400, -- 25 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','audio/m4a','audio/mp4','audio/mpeg','audio/aac','audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (bucket is public); only authenticated users can upload,
-- and each user may only write under their own <uid>/ prefix.
CREATE POLICY "chat-media read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');

CREATE POLICY "chat-media insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chat-media delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ───────────────────────────────────────────────────────────────
-- 006_reports.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- REPORTS (lost items, safety issues, reporting a person)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- A single table backs the "Help & safety" actions on a trip and the "Report"
-- action on a person's profile. `type` distinguishes the flow:
--   lost_item â†’ left something in the vehicle, tied to a booking
--   safety    â†’ a safety concern about a trip
--   user      â†’ reporting a specific driver / passenger
-- reported_user_id / booking_id are nullable so each flow only fills what it has.

CREATE TABLE IF NOT EXISTS public.reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  booking_id       UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  type             TEXT NOT NULL CHECK (type IN ('lost_item', 'safety', 'user')),
  reason           TEXT,
  description      TEXT NOT NULL,
  contact          TEXT,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS reports_reported_idx ON public.reports (reported_user_id);
CREATE INDEX IF NOT EXISTS reports_booking_idx  ON public.reports (booking_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- A user can file a report as themselves and read back only their own reports.
-- (Moderation/admin access is handled out-of-band via the service role.)
CREATE POLICY "Reports insert own" ON public.reports
  FOR INSERT
  WITH CHECK (
    reporter_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Reports select own" ON public.reports
  FOR SELECT
  USING (
    reporter_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );


-- ───────────────────────────────────────────────────────────────
-- 007_push_notifications.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 007_push_notifications.sql
-- Device push tokens + automatic Expo delivery for every notification row.
--
-- The client (registerForPushNotifications) stores an Expo push token on the
-- user's row. A trigger on notifications INSERT then delivers a push via the
-- Expo Push API using pg_net, so ANY code path that inserts a notification
-- (edge functions, future triggers) produces a device push automatically â€”
-- differentiated by the row's own type / title / body / data.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- pg_net lets Postgres make outbound HTTP calls (available on Supabase).
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- â”€â”€ Token storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_platform TEXT,
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

-- â”€â”€ Delivery trigger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.push_notification_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT push_token INTO v_token
  FROM public.users
  WHERE id = NEW.user_id;

  -- No registered device â†’ nothing to deliver (in-app row still stands).
  IF v_token IS NULL OR v_token = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept', 'application/json'
    ),
    body    := jsonb_build_object(
      'to', v_token,
      'title', NEW.title,
      'body', NEW.body,
      'sound', 'default',
      'channelId', 'default',
      -- Carry the type so the app can theme + route the tap (see routeFromData).
      'data', COALESCE(NEW.data, '{}'::jsonb) || jsonb_build_object('type', NEW.type)
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a delivery hiccup roll back the notification insert.
  RAISE WARNING 'push delivery failed for notification %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_notification ON public.notifications;
CREATE TRIGGER trg_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.push_notification_on_insert();


-- ───────────────────────────────────────────────────────────────
-- 008_broadcast_new_posts.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 008_broadcast_new_posts.sql
-- When a driver posts a trip or a passenger posts a ride request, fan a
-- notification out to every other active user. Because these rows land in
-- `notifications`, the push trigger from 007 also delivers them to devices â€”
-- so "new ride" / "new ride request" arrives both in-app and as a push.
--
-- Broadcasting must be SECURITY DEFINER: the notifications RLS policy only
-- lets a user insert rows for themselves, so a client can never notify others.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€ New trip (driver offering seats) â†’ tell everyone else â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.broadcast_new_trip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'posted' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    u.id,
    'ride_match',
    'New ride available',
    NEW.from_location || ' â†’ ' || NEW.to_location,
    jsonb_build_object(
      'trip_id', NEW.id,
      'from', NEW.from_location,
      'to', NEW.to_location
    )
  FROM public.users u
  WHERE u.id <> NEW.driver_id
    AND u.status = 'active';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_new_trip ON public.trips;
CREATE TRIGGER trg_broadcast_new_trip
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_new_trip();

-- â”€â”€ New ride request (passenger looking for a ride) â†’ tell everyone else â”€â”€
CREATE OR REPLACE FUNCTION public.broadcast_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    u.id,
    'request_match',
    'New ride request',
    NEW.from_location || ' â†’ ' || NEW.to_location,
    jsonb_build_object(
      'request_id', NEW.id,
      'from', NEW.from_location,
      'to', NEW.to_location
    )
  FROM public.users u
  WHERE u.id <> NEW.passenger_id
    AND u.status = 'active';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_new_request ON public.ride_requests;
CREATE TRIGGER trg_broadcast_new_request
  AFTER INSERT ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_new_request();


-- ───────────────────────────────────────────────────────────────
-- 009_alert_comment_media.sql
-- ───────────────────────────────────────────────────────────────
-- Allow image / GIF attachments on alert comments.
-- Images are uploaded to the public `chat-media` bucket (same as chat); GIFs are
-- stored as remote Giphy URLs. Either way we persist just the URL here.

ALTER TABLE public.alert_comments
  ADD COLUMN IF NOT EXISTS image_url TEXT;


-- ───────────────────────────────────────────────────────────────
-- 010_comment_likes.sql
-- ───────────────────────────────────────────────────────────────
-- Likes on individual alert comments. Mirrors the alert_reactions pattern:
-- a join table for who liked, plus a denormalised counter maintained by trigger.

ALTER TABLE public.alert_comments
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.alert_comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes(comment_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone may read (needed so a signed-in user can see which comments they liked);
-- users may only add/remove their own likes.
CREATE POLICY "Comment likes read" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Comment likes write own" ON public.comment_likes
  FOR ALL
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Keep alert_comments.likes_count in sync.
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.alert_comments
      SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.alert_comments
      SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_comment_likes
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_like_count();


-- ───────────────────────────────────────────────────────────────
-- 011_fix_media_upload_and_avatars.sql
-- ───────────────────────────────────────────────────────────────
-- Fix media uploads + add a dedicated avatars bucket.
--
-- Root cause of failing uploads: the client stores files under
--   <users.id>/<file>            (the PUBLIC profile id)
-- but the original chat-media storage policies compared the first folder to
-- auth.uid() (the AUTH id). Those two ids are never equal, so every image /
-- voice-note upload was rejected by RLS. We repoint the policies at the
-- caller's public users.id via the existing current_app_user_id() helper.

-- â”€â”€ chat-media: correct the owner check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DROP POLICY IF EXISTS "chat-media insert own" ON storage.objects;
CREATE POLICY "chat-media insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

DROP POLICY IF EXISTS "chat-media delete own" ON storage.objects;
CREATE POLICY "chat-media delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

-- â”€â”€ avatars: public bucket for profile pictures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

CREATE POLICY "avatars update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

CREATE POLICY "avatars delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );


-- ───────────────────────────────────────────────────────────────
-- 012_restore_users_auth_id_grant.sql
-- ───────────────────────────────────────────────────────────────
-- Fix widespread "permission denied for table users" (42501) â†’ 403 errors.
--
-- Migration 004 revoked SELECT on public.users and re-granted every profile
-- column EXCEPT auth_id. But almost every RLS policy scopes rows with:
--     (SELECT id FROM public.users WHERE auth_id = auth.uid())
-- (bookings, notifications, driver_profiles, payments, conversations, messages,
--  rides, ride_requests, alert_reactions, alert_comments, ratings, and the
--  current_app_user_id() helper used by the migration-003 tables).
--
-- Evaluating that subquery requires the caller to read users.auth_id. Without
-- the grant every such policy throws 42501, so all owner-scoped reads/writes
-- 403. Restoring SELECT on just auth_id unblocks them.
--
-- Security: auth_id is a non-secret link to auth.users. Knowing another user's
-- auth_id grants no access â€” RLS still keys on the caller's own JWT via
-- auth.uid(); phone and email remain hidden.
GRANT SELECT (auth_id) ON public.users TO authenticated;

-- Harden the shared helper so function-based policies no longer depend on the
-- caller's column privileges (defence in depth; also fixes it under any role).
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$;


-- ───────────────────────────────────────────────────────────────
-- 013_payment_escrow.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 013 â€” PAYMENT ESCROW
--
-- Kipita's ride-payment business model:
--   1. Passenger pays the full fare to the Kipita paybill (M-Pesa STK push).
--   2. Kipita HOLDS the funds in escrow (escrow_status = 'held').
--   3. When the driver ends the ride, Kipita RELEASES the funds to the
--      driver minus the Kipita platform fee (escrow_status = 'released').
--   4. If the trip is cancelled while held, the fare is refunded
--      (escrow_status = 'refunded').
--
-- This migration adds the escrow bookkeeping columns to `payments` and a
-- transactional `credit_wallet()` helper used when settling the driver.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€ Escrow lifecycle enum â”€â”€
DO $$ BEGIN
  CREATE TYPE escrow_status AS ENUM ('none', 'held', 'released', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- â”€â”€ Escrow bookkeeping on payments â”€â”€
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS escrow_status    escrow_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS platform_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_earning   NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS held_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_reference TEXT,
  ADD COLUMN IF NOT EXISTS payout_status    TEXT;   -- 'wallet' | 'paid' | 'failed'

CREATE INDEX IF NOT EXISTS idx_payments_escrow ON public.payments(escrow_status);

-- â”€â”€ Wallet credit helper â”€â”€
-- Upserts the user's wallet and records a transaction atomically, returning
-- the new balance. Used by release-escrow to settle the driver's earning and
-- by the refund path to return a passenger's fare.
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id     UUID,
  p_amount      NUMERIC,
  p_type        wallet_txn_type,
  p_reference   TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance   NUMERIC(12,2);
BEGIN
  -- Ensure the wallet exists (idempotent per user).
  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;

  UPDATE public.wallets
     SET balance    = balance + p_amount,
         updated_at = NOW()
   WHERE id = v_wallet_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_transactions (wallet_id, amount, type, reference, description)
  VALUES (v_wallet_id, p_amount, p_type, p_reference, p_description);

  RETURN v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT) TO service_role;


-- ───────────────────────────────────────────────────────────────
-- 014_refunds.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 014 â€” ADMIN-VERIFIED REFUNDS
--
-- Cancelling a paid ride does NOT auto-refund. Instead it opens a
-- `refund_request` (status 'pending') and moves the escrow to
-- 'refund_pending'. An admin then reviews it:
--   â€¢ APPROVE â†’ the fare is credited back to the passenger's Kipita wallet
--               and the escrow is marked 'refunded'.
--   â€¢ REJECT  â†’ the fare is released to the driver (wallet) as a normal
--               payout and the escrow is marked 'released'.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Admin flag (gates the refund review screens + resolve-refund fn).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Migration 004 uses column-level SELECT grants on public.users; the app + web
-- admin must be able to read is_admin for the caller's own row, so grant it.
GRANT SELECT (is_admin) ON public.users TO anon, authenticated;

-- Escrow gains a "waiting on admin" state.
ALTER TYPE escrow_status ADD VALUE IF NOT EXISTS 'refund_pending';

-- Refund request lifecycle.
DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id   UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  booking_id   UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.users(id),
  driver_id    UUID REFERENCES public.users(id),
  amount       NUMERIC(10,2) NOT NULL,
  reason       TEXT,
  status       refund_status NOT NULL DEFAULT 'pending',
  reviewed_by  UUID REFERENCES public.users(id),
  reviewed_at  TIMESTAMPTZ,
  review_note  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one open request per payment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_refund_pending_payment
  ON public.refund_requests(payment_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_refund_requests_status
  ON public.refund_requests(status, created_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Passengers see their own requestsâ€¦
DROP POLICY IF EXISTS "Passengers read own refunds" ON public.refund_requests;
CREATE POLICY "Passengers read own refunds" ON public.refund_requests
  FOR SELECT USING (
    passenger_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- â€¦admins read them all (drives the review screen). Writes go through the
-- service-role edge functions, so no INSERT/UPDATE policies are needed.
DROP POLICY IF EXISTS "Admins read refunds" ON public.refund_requests;
CREATE POLICY "Admins read refunds" ON public.refund_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );


-- ───────────────────────────────────────────────────────────────
-- 015_waitlist.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 015 â€” LANDING PAGE WAITLIST
--
-- Email capture for the pre-launch waitlist on the marketing site.
-- Anonymous visitors may INSERT their own email (nothing else); only
-- admins can read the list. Duplicate emails are collapsed to a single
-- row via a case-insensitive unique index.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per email, case-insensitive (so "You@x.com" == "you@x.com").
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_email
  ON public.waitlist (lower(email));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) may add themselves to the waitlist.
-- INSERT-only: they can't read the list back or see other signups.
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join the waitlist" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- Admins can read the full list (for an internal export/dashboard).
DROP POLICY IF EXISTS "Admins read waitlist" ON public.waitlist;
CREATE POLICY "Admins read waitlist" ON public.waitlist
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT SELECT ON public.waitlist TO authenticated;


-- ───────────────────────────────────────────────────────────────
-- 016_sync_auth_avatar_from_metadata.sql
-- ───────────────────────────────────────────────────────────────
-- Keep auth-provider avatars in sync for users who have not uploaded a
-- Kipita-managed avatar to the storage bucket.

CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_name TEXT;
  profile_avatar_url TEXT;
BEGIN
  profile_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(CONCAT_WS(' ', NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name')), ''),
    ''
  );

  profile_avatar_url := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'picture'), '')
  );

  INSERT INTO public.users (
    auth_id,
    full_name,
    first_name,
    last_name,
    phone,
    email,
    avatar_url,
    email_verified,
    phone_verified
  )
  VALUES (
    NEW.id,
    profile_name,
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'first_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'last_name'), ''),
    NEW.phone,
    NEW.email,
    profile_avatar_url,
    NEW.email_confirmed_at IS NOT NULL,
    NEW.phone_confirmed_at IS NOT NULL
  )
  ON CONFLICT (auth_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    email_verified = EXCLUDED.email_verified,
    phone_verified = EXCLUDED.phone_verified,
    full_name = CASE
      WHEN public.users.full_name = '' THEN EXCLUDED.full_name
      ELSE public.users.full_name
    END,
    avatar_url = CASE
      WHEN public.users.avatar_url IS NULL
        OR public.users.avatar_url = ''
        OR public.users.avatar_url NOT LIKE '%/storage/v1/object/public/avatars/%'
      THEN COALESCE(EXCLUDED.avatar_url, public.users.avatar_url)
      ELSE public.users.avatar_url
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

UPDATE public.users AS profile
SET avatar_url = source.avatar_url,
    updated_at = NOW()
FROM (
  SELECT
    id,
    COALESCE(
      NULLIF(TRIM(raw_user_meta_data ->> 'avatar_url'), ''),
      NULLIF(TRIM(raw_user_meta_data ->> 'picture'), '')
    ) AS avatar_url
  FROM auth.users
) AS source
WHERE profile.auth_id = source.id
  AND source.avatar_url IS NOT NULL
  AND (
    profile.avatar_url IS NULL
    OR profile.avatar_url = ''
    OR profile.avatar_url NOT LIKE '%/storage/v1/object/public/avatars/%'
  );

-- ───────────────────────────────────────────────────────────────
-- 017_faqs.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 017 â€” HELP CENTRE FAQ
--
-- Editable FAQ entries for the /help page. Anyone may read published
-- entries; only admins can read drafts or create / edit / delete. This
-- lets the help FAQ be maintained from the admin panel instead of code.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS public.faqs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per question (also makes the seed below idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS uq_faqs_question ON public.faqs (question);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Public (incl. anonymous) may read published FAQs.
DROP POLICY IF EXISTS "Anyone reads published FAQs" ON public.faqs;
CREATE POLICY "Anyone reads published FAQs" ON public.faqs
  FOR SELECT USING (is_published);

-- Admins may read everything, including unpublished drafts.
DROP POLICY IF EXISTS "Admins read all FAQs" ON public.faqs;
CREATE POLICY "Admins read all FAQs" ON public.faqs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

-- Admins may create / edit / delete.
DROP POLICY IF EXISTS "Admins manage FAQs" ON public.faqs;
CREATE POLICY "Admins manage FAQs" ON public.faqs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;

-- Keep updated_at fresh on every edit.
CREATE OR REPLACE FUNCTION public.faqs_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_faqs_updated_at ON public.faqs;
CREATE TRIGGER trg_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.faqs_touch_updated_at();

-- Seed the existing help-centre questions (no-op if they already exist).
INSERT INTO public.faqs (question, answer, sort_order) VALUES
  ('How does payment work?', 'You pay with M-Pesa when you book. Kipita holds the fare in escrow and only releases it to the driver once your trip is completed â€” so your money is protected.', 0),
  ('Is my ride safe?', 'Riders and drivers are verified, every trip is rated, and payments are escrow-protected. Share your trip details with a friend any time from the app.', 1),
  ('Can I sign up with my phone number?', 'Yes. Choose the Phone tab on sign in, enter your Kenyan number, and we''ll text you a 6-digit code to verify it.', 2),
  ('How do I become a driver?', 'Create an account, then submit your licence and ID for KYC verification from the app. Once approved, you can start offering seats.', 3),
  ('What if I need to cancel?', 'You can cancel from your bookings. Refunds follow our refund policy â€” escrow-held fares are returned when eligible.', 4),
  ('How do I change my email or phone?', 'Head to your profile, edit your details, and confirm the change via the code or link we send you.', 5)
ON CONFLICT (question) DO NOTHING;


-- ───────────────────────────────────────────────────────────────
-- 018_promotions.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 018 â€” PROMOTIONS (discounts & gift cards)
--
-- Admin-curated offers shown in the offers band on /home. Anyone may read
-- offers that are active and inside their date window; only admins can read
-- drafts, scheduled or expired rows, or create / edit / delete. Mirrors the
-- structure of 017_faqs.sql.
--
-- Display-only: nothing here grants or redeems value. Redemption needs a
-- payment surface the web app does not have â€” apps/web/lib/bookings.ts stops
-- at `pending_payment` and hands off to the mobile app.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

DO $$ BEGIN
  CREATE TYPE promotion_kind AS ENUM ('discount', 'gift_card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE promotion_value_type AS ENUM ('percent', 'amount');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.promotions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  blurb        TEXT NOT NULL,
  kind         promotion_kind NOT NULL DEFAULT 'discount',
  value_type   promotion_value_type NOT NULL DEFAULT 'percent',
  -- percent: 1-100. amount: whole KES (M-Pesa has no cents in practice).
  value_amount NUMERIC(10,2) NOT NULL,
  code         TEXT,
  -- Must be a member of ToneName in apps/web/lib/theme.ts â€” the CHECK below
  -- keeps the two lists honest. Add a tone there, add it here.
  tone         TEXT NOT NULL DEFAULT 'green',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  starts_at    TIMESTAMPTZ,   -- NULL = live immediately
  ends_at      TIMESTAMPTZ,   -- NULL = no expiry
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT promotions_value_range CHECK (
    (value_type = 'percent' AND value_amount > 0 AND value_amount <= 100)
    OR (value_type = 'amount' AND value_amount > 0)
  ),
  CONSTRAINT promotions_window CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
  ),
  CONSTRAINT promotions_tone CHECK (tone IN (
    'green','mint','tan','blue','amber','lav','deep','dark','surface',
    'forest','peach','lilac','lime'
  ))
);

-- One row per title (also makes the seed below idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS uq_promotions_title ON public.promotions (title);
-- One code per offer, when a code is used at all.
CREATE UNIQUE INDEX IF NOT EXISTS uq_promotions_code
  ON public.promotions (code) WHERE code IS NOT NULL;
-- The band's read path: live rows in display order.
CREATE INDEX IF NOT EXISTS idx_promotions_live
  ON public.promotions (sort_order, created_at DESC) WHERE is_active;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Public (incl. anonymous) may read live offers only.
DROP POLICY IF EXISTS "Anyone reads live promotions" ON public.promotions;
CREATE POLICY "Anyone reads live promotions" ON public.promotions
  FOR SELECT USING (
    is_active
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at   IS NULL OR ends_at   >  NOW())
  );

-- Admins may read everything, including drafts, scheduled and expired rows.
DROP POLICY IF EXISTS "Admins read all promotions" ON public.promotions;
CREATE POLICY "Admins read all promotions" ON public.promotions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

-- Admins may create / edit / delete.
DROP POLICY IF EXISTS "Admins manage promotions" ON public.promotions;
CREATE POLICY "Admins manage promotions" ON public.promotions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin)
  );

GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;

-- Keep updated_at fresh on every edit.
CREATE OR REPLACE FUNCTION public.promotions_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_promotions_updated_at ON public.promotions;
CREATE TRIGGER trg_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.promotions_touch_updated_at();

-- Seed two examples so the band renders on a fresh environment.
INSERT INTO public.promotions (title, blurb, kind, value_type, value_amount, code, tone, sort_order) VALUES
  ('First ride, 20% off', 'New to Kipita? Your first booked seat is 20% off, on any route.', 'discount', 'percent', 20, 'FIRSTRIDE', 'green', 0),
  ('KES 500 gift card', 'Send a friend a ride. They redeem it in the app at checkout.', 'gift_card', 'amount', 500, NULL, 'lilac', 1)
ON CONFLICT (title) DO NOTHING;


-- ───────────────────────────────────────────────────────────────
-- 019_alert_media.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 019 â€” ALERT MEDIA BUCKET
--
-- Storage for photos attached to road alerts (public.announcements.image_url).
--
-- Mirrors the `avatars` block in 011 exactly, including the one detail that
-- matters: the owner check compares the first folder to current_app_user_id()
-- (the PUBLIC users.id), NOT auth.uid(). Those two ids are never equal, and
-- comparing against auth.uid() is precisely what broke chat-media uploads
-- before 011 fixed them.
--
-- Objects are laid out as  <users.id>/<uuid>.<ext>.
--
-- Note: public.announcements has no DELETE policy, so an alert can never be
-- removed from a client â€” and neither, therefore, can its object be orphaned
-- by a delete. Cleanup of objects whose alert insert failed is left to the
-- uploader, which deletes on a failed insert.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'alert-media',
  'alert-media',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "alert-media read" ON storage.objects;
CREATE POLICY "alert-media read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'alert-media');

DROP POLICY IF EXISTS "alert-media insert own" ON storage.objects;
CREATE POLICY "alert-media insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'alert-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

DROP POLICY IF EXISTS "alert-media update own" ON storage.objects;
CREATE POLICY "alert-media update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'alert-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

DROP POLICY IF EXISTS "alert-media delete own" ON storage.objects;
CREATE POLICY "alert-media delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'alert-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );


-- ───────────────────────────────────────────────────────────────
-- 020_route_targeted_broadcasts.sql
-- ───────────────────────────────────────────────────────────────
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 020 â€” ROUTE-TARGETED BROADCASTS
--
-- 008 fanned every new trip / ride request out to EVERY active user, with no
-- rate limit, synchronously inside the poster's transaction. That was already
-- noisy; now that the web app can post too, it is a liability â€” at 10k users
-- one post is a 10k-row insert on the submit path.
--
-- This migration narrows the audience to people who actually care about the
-- route:
--   * a trip notifies passengers with an open matching ride request, plus
--     anyone who recently searched that route;
--   * a ride request notifies drivers with a matching posted trip, plus
--     anyone who recently searched it.
--
-- Route interest comes from `route_interests`, written by the web home page on
-- every search via record_route_interest(). Mobile does not write these rows
-- yet, so its searches do not attract notifications until that lands.
--
-- Also adds a modest per-user posting throttle. It lives in the database, not
-- in the server action, because `trips` RLS permits a direct PostgREST insert
-- with a session cookie â€” an application-level check is one curl away from
-- being bypassed.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€ Location matching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Locations are free text ("Nairobi", "nairobi cbd", "Nairobi CBD"), so match
-- case-insensitively in either containment direction. position() is used
-- rather than LIKE because user input routinely contains % and _, which LIKE
-- would treat as wildcards.
CREATE OR REPLACE FUNCTION public.loc_matches(a TEXT, b TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN a IS NULL OR b IS NULL THEN FALSE
    ELSE position(lower(btrim(b)) IN lower(btrim(a))) > 0
      OR position(lower(btrim(a)) IN lower(btrim(b))) > 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.route_matches(
  a_from TEXT, a_to TEXT, b_from TEXT, b_to TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.loc_matches(a_from, b_from) AND public.loc_matches(a_to, b_to);
$$;

-- â”€â”€ Route interest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- One row per user per route. Values are stored already normalised (trimmed,
-- lower-cased) because this table is a matching index, not display data.
CREATE TABLE IF NOT EXISTS public.route_interests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_location    TEXT NOT NULL,
  to_location      TEXT NOT NULL,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, from_location, to_location)
);

CREATE INDEX IF NOT EXISTS idx_route_interests_recent
  ON public.route_interests (last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_interests_user
  ON public.route_interests (user_id);

ALTER TABLE public.route_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Route interests own" ON public.route_interests;
CREATE POLICY "Route interests own" ON public.route_interests
  FOR ALL
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_interests TO authenticated;

-- Record (or refresh) the caller's interest in a route. SECURITY DEFINER so
-- the upsert, the users.id lookup and the normalisation all happen in one
-- place â€” the client just passes two strings.
CREATE OR REPLACE FUNCTION public.record_route_interest(p_from TEXT, p_to TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_from TEXT := lower(btrim(COALESCE(p_from, '')));
  v_to   TEXT := lower(btrim(COALESCE(p_to, '')));
BEGIN
  -- Ignore junk; a one-character "route" would match almost everything.
  IF length(v_from) < 2 OR length(v_to) < 2 THEN
    RETURN;
  END IF;

  SELECT id INTO v_user FROM public.users WHERE auth_id = auth.uid();
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.route_interests (user_id, from_location, to_location)
  VALUES (v_user, v_from, v_to)
  ON CONFLICT (user_id, from_location, to_location)
  DO UPDATE SET last_searched_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_route_interest(TEXT, TEXT) TO authenticated;

-- How far back a search still counts as interest.
-- (Inlined as an interval literal below; kept here as documentation.)

-- â”€â”€ New trip â†’ tell interested passengers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.broadcast_new_trip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'posted' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    u.id,
    'ride_match',
    'New ride available',
    NEW.from_location || ' â†’ ' || NEW.to_location,
    jsonb_build_object(
      'trip_id', NEW.id,
      'from', NEW.from_location,
      'to', NEW.to_location
    )
  FROM public.users u
  WHERE u.id <> NEW.driver_id
    AND u.status = 'active'
    AND (
      EXISTS (
        SELECT 1 FROM public.ride_requests r
        WHERE r.passenger_id = u.id
          AND r.status = 'pending'
          AND public.route_matches(
                r.from_location, r.to_location,
                NEW.from_location, NEW.to_location)
      )
      OR EXISTS (
        SELECT 1 FROM public.route_interests ri
        WHERE ri.user_id = u.id
          AND ri.last_searched_at > NOW() - INTERVAL '30 days'
          AND public.route_matches(
                ri.from_location, ri.to_location,
                NEW.from_location, NEW.to_location)
      )
    )
  LIMIT 500;

  RETURN NEW;
END;
$$;

-- â”€â”€ New ride request â†’ tell drivers running that route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.broadcast_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    u.id,
    'request_match',
    'New ride request',
    NEW.from_location || ' â†’ ' || NEW.to_location,
    jsonb_build_object(
      'request_id', NEW.id,
      'from', NEW.from_location,
      'to', NEW.to_location
    )
  FROM public.users u
  WHERE u.id <> NEW.passenger_id
    AND u.status = 'active'
    AND (
      EXISTS (
        SELECT 1 FROM public.trips t
        WHERE t.driver_id = u.id
          AND t.status IN ('posted', 'active')
          AND public.route_matches(
                t.from_location, t.to_location,
                NEW.from_location, NEW.to_location)
      )
      OR EXISTS (
        SELECT 1 FROM public.route_interests ri
        WHERE ri.user_id = u.id
          AND ri.last_searched_at > NOW() - INTERVAL '30 days'
          AND public.route_matches(
                ri.from_location, ri.to_location,
                NEW.from_location, NEW.to_location)
      )
    )
  LIMIT 500;

  RETURN NEW;
END;
$$;

-- Triggers themselves are unchanged from 008; re-created so this migration is
-- self-contained if 008 was never applied.
DROP TRIGGER IF EXISTS trg_broadcast_new_trip ON public.trips;
CREATE TRIGGER trg_broadcast_new_trip
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_new_trip();

DROP TRIGGER IF EXISTS trg_broadcast_new_request ON public.ride_requests;
CREATE TRIGGER trg_broadcast_new_request
  AFTER INSERT ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_new_request();

-- â”€â”€ Posting throttle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Five posts per hour per user. Generous for a real driver, ruinous for a
-- script. Raised as 54000 (program_limit_exceeded) so the app can recognise
-- it and show friendly copy instead of a raw Postgres error.
CREATE OR REPLACE FUNCTION public.throttle_new_trip()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_recent INT;
BEGIN
  SELECT count(*) INTO v_recent
  FROM public.trips
  WHERE driver_id = NEW.driver_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'Too many rides posted in the last hour'
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.throttle_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_recent INT;
BEGIN
  SELECT count(*) INTO v_recent
  FROM public.ride_requests
  WHERE passenger_id = NEW.passenger_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'Too many ride requests posted in the last hour'
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_new_trip ON public.trips;
CREATE TRIGGER trg_throttle_new_trip
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.throttle_new_trip();

DROP TRIGGER IF EXISTS trg_throttle_new_request ON public.ride_requests;
CREATE TRIGGER trg_throttle_new_request
  BEFORE INSERT ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.throttle_new_request();

-- The throttle's lookup, and the "my recent posts" reads the app does.
CREATE INDEX IF NOT EXISTS idx_trips_driver_created
  ON public.trips (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_passenger_created
  ON public.ride_requests (passenger_id, created_at DESC);


