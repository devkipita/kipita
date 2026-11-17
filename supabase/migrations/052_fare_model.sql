-- 052_fare_model.sql
-- Fare model: EPRA fuel price history, vehicle classes, pricing settings, and the Kipita fee
-- charged ON TOP of the seat price.
--
--  * public.fuel_prices        one row per EPRA period, fuel type and town. Admin-entered.
--  * public.vehicle_classes    km per litre by class. Admin-editable.
--  * public.platform_settings  new keys: fee_on_top, fee_min_kes, fee_vat_percent,
--                              fare_wear_per_km, fare_min_seat_price, fare_round_step.
--                              Existing: platform_fee_percent, fare_margin_percent (the cap).
--                              fuel_cost_per_km is no longer used.
--  * public.bookings.service_fee   the fee added on top at booking time. NULL on bookings made
--                              before this migration or while fee_on_top = 0 (old behaviour:
--                              the fee is deducted from the driver at payment).
--  * bookings_set_price()      BEFORE INSERT trigger. The database, not the client, decides
--                              total_price: seat price x seats, plus the fee when fee_on_top = 1.
--
-- Rollback switch: set fee_on_top to 0 in Admin > Pricing. New bookings then behave as before.

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ───────────────────────────── settings ─────────────────────────────

INSERT INTO public.platform_settings (key, value, label, is_public) VALUES
  ('fee_on_top',          '1'::jsonb,  'Kipita fee added on top of the seat price (1) or deducted from the driver (0)', TRUE),
  ('fee_min_kes',         '0'::jsonb,  'Smallest Kipita fee per booking, in KES',                                       TRUE),
  ('fee_vat_percent',     '16'::jsonb, 'VAT rate used to split the fee into net and VAT for reports',                   TRUE),
  ('fare_wear_per_km',    '3'::jsonb,  'Wear and tear per km added to fuel cost, in KES',                               TRUE),
  ('fare_min_seat_price', '100'::jsonb,'Lowest seat price a driver can list, in KES',                                   TRUE),
  ('fare_round_step',     '10'::jsonb, 'Seat prices snap to this step, in KES',                                         TRUE)
ON CONFLICT (key) DO NOTHING;

UPDATE public.platform_settings
   SET label = 'Not used. Fuel cost now comes from the EPRA price history (fuel_prices).'
 WHERE key = 'fuel_cost_per_km';

UPDATE public.platform_settings
   SET label = 'Headroom above the cost share a driver may ask, percent (the price cap)'
 WHERE key = 'fare_margin_percent';

-- ───────────────────────────── fuel prices ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.fuel_prices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type      TEXT          NOT NULL CHECK (fuel_type IN ('petrol', 'diesel')),
  region         TEXT          NOT NULL CHECK (region <> '' AND region = lower(region)),
  price_kes      NUMERIC(7, 2) NOT NULL CHECK (price_kes >= 50 AND price_kes < 1000),
  effective_from DATE          NOT NULL,
  effective_to   DATE          NOT NULL,
  source         TEXT          NOT NULL DEFAULT 'EPRA',
  note           TEXT,
  created_by     UUID REFERENCES public.users (id),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CHECK (effective_to >= effective_from),
  -- two prices for the same fuel and town can never cover the same day
  CONSTRAINT fuel_prices_no_overlap
    EXCLUDE USING gist (
      fuel_type WITH =,
      region WITH =,
      daterange(effective_from, effective_to, '[]') WITH &&
    )
);

CREATE INDEX IF NOT EXISTS idx_fuel_prices_lookup
  ON public.fuel_prices (fuel_type, region, effective_from DESC);

ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Fuel prices readable" ON public.fuel_prices;
CREATE POLICY "Fuel prices readable" ON public.fuel_prices
  FOR SELECT TO anon, authenticated USING (TRUE);

-- ───────────────────────────── vehicle classes ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.vehicle_classes (
  code         TEXT PRIMARY KEY CHECK (code ~ '^[a-z0-9_]+$'),
  label        TEXT          NOT NULL,
  km_per_litre NUMERIC(4, 1) NOT NULL CHECK (km_per_litre > 0 AND km_per_litre < 60),
  fuel_type    TEXT          NOT NULL CHECK (fuel_type IN ('petrol', 'diesel')),
  active       BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order   INTEGER       NOT NULL DEFAULT 0,
  updated_by   UUID REFERENCES public.users (id),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicle_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vehicle classes readable" ON public.vehicle_classes;
CREATE POLICY "Vehicle classes readable" ON public.vehicle_classes
  FOR SELECT TO anon, authenticated USING (TRUE);

-- Starting assumptions for real-world consumption, not measured data. Calibrate with driver reports.
INSERT INTO public.vehicle_classes (code, label, km_per_litre, fuel_type, sort_order) VALUES
  ('hatch',      'Small car (Vitz, Passo, Demio)',          15, 'petrol', 1),
  ('sedan',      'Sedan or wagon (Axio, Premio, Fielder)',  13, 'petrol', 2),
  ('suv_petrol', 'SUV, petrol (CX-5, Forester, Harrier)',   10, 'petrol', 3),
  ('suv_diesel', 'SUV, diesel (Prado, Fortuner)',            9, 'diesel', 4),
  ('minivan',    'Minivan (Noah, Voxy)',                     9, 'petrol', 5)
ON CONFLICT (code) DO NOTHING;

-- EPRA maximum pump prices, KES per litre, include 8% VAT. Sources: epra.go.ke/pump-prices and
-- press reports of the 14 Sep and 14 Oct 2026 reviews. Confirm against EPRA before go-live.
-- The next review is on 14 Nov 2026: enter the new prices in Admin > Pricing on the 14th or 15th.
INSERT INTO public.fuel_prices (fuel_type, region, price_kes, effective_from, effective_to, note) VALUES
  ('petrol', 'nairobi', 214.03, '2026-09-15', '2026-10-14', 'EPRA review 14 Sep 2026'),
  ('diesel', 'nairobi', 217.86, '2026-09-15', '2026-10-14', 'EPRA review 14 Sep 2026'),
  ('petrol', 'nairobi', 226.96, '2026-10-15', '2026-11-14', 'EPRA review 14 Oct 2026'),
  ('diesel', 'nairobi', 227.76, '2026-10-15', '2026-11-14', 'EPRA review 14 Oct 2026'),
  ('petrol', 'mombasa', 223.81, '2026-10-15', '2026-11-14', 'EPRA review 14 Oct 2026')
ON CONFLICT DO NOTHING;

-- ───────────────────────────── admin RPCs ─────────────────────────────
-- Writes go through these functions, which check is_admin() and log to admin_actions,
-- the same pattern as set_setting().

CREATE OR REPLACE FUNCTION public.admin_add_fuel_prices(
  p_region TEXT,
  p_from   DATE,
  p_to     DATE,
  p_petrol NUMERIC,
  p_diesel NUMERIC,
  p_note   TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_region TEXT := lower(btrim(p_region));
  v_me     UUID := public.current_app_user_id();
  v_count  INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF v_region = '' THEN
    RAISE EXCEPTION 'Pick a town' USING ERRCODE = '22023';
  END IF;
  IF p_to < p_from THEN
    RAISE EXCEPTION 'The period must end on or after the day it starts' USING ERRCODE = '22023';
  END IF;

  IF p_petrol IS NOT NULL THEN
    INSERT INTO public.fuel_prices (fuel_type, region, price_kes, effective_from, effective_to, note, created_by)
    VALUES ('petrol', v_region, p_petrol, p_from, p_to, p_note, v_me);
    v_count := v_count + 1;
  END IF;
  IF p_diesel IS NOT NULL THEN
    INSERT INTO public.fuel_prices (fuel_type, region, price_kes, effective_from, effective_to, note, created_by)
    VALUES ('diesel', v_region, p_diesel, p_from, p_to, p_note, v_me);
    v_count := v_count + 1;
  END IF;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Enter at least one price' USING ERRCODE = '22023';
  END IF;

  PERFORM public.record_admin_action(
    'fuel.add', 'fuel_prices', v_region,
    jsonb_build_object('from', p_from, 'to', p_to, 'petrol', p_petrol, 'diesel', p_diesel)
  );
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_vehicle_class(
  p_code         TEXT,
  p_km_per_litre NUMERIC,
  p_active       BOOLEAN DEFAULT TRUE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old NUMERIC;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT km_per_litre INTO v_old FROM public.vehicle_classes WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown vehicle class' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.vehicle_classes
     SET km_per_litre = p_km_per_litre,
         active = COALESCE(p_active, active),
         updated_by = public.current_app_user_id(),
         updated_at = NOW()
   WHERE code = p_code;

  PERFORM public.record_admin_action(
    'vehicle_class.update', 'vehicle_classes', p_code,
    jsonb_build_object('from', v_old, 'to', p_km_per_litre, 'active', p_active)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_fuel_prices(TEXT, DATE, DATE, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_vehicle_class(TEXT, NUMERIC, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_fuel_prices(TEXT, DATE, DATE, NUMERIC, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_vehicle_class(TEXT, NUMERIC, BOOLEAN) TO authenticated, service_role;

-- ───────────────────────────── fee on top ─────────────────────────────

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10, 2);

COMMENT ON COLUMN public.bookings.service_fee IS
  'Kipita fee added on top of the seat subtotal when the booking was created. NULL on older bookings, where the fee is deducted from the driver at payment.';

-- The fee for a seat subtotal, in whole KES, at the current settings. Mirrors bookingAmounts() in packages/shared/src/fare.ts.
CREATE OR REPLACE FUNCTION public.service_fee_for(p_subtotal NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    ROUND(p_subtotal * public.setting_numeric('platform_fee_percent', 12) / 100),
    public.setting_numeric('fee_min_kes', 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.bookings_set_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price    NUMERIC;
  v_subtotal NUMERIC;
BEGIN
  SELECT t.price_per_seat INTO v_price FROM public.trips t WHERE t.id = NEW.trip_id;
  IF v_price IS NULL THEN
    RETURN NEW; -- unknown trip: let the foreign key reject the row
  END IF;

  v_subtotal := v_price * NEW.seats_booked;

  IF public.setting_numeric('fee_on_top', 1) = 1 THEN
    NEW.service_fee := public.service_fee_for(v_subtotal);
    NEW.total_price := v_subtotal + NEW.service_fee;
  ELSE
    NEW.service_fee := NULL;
    NEW.total_price := v_subtotal;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_set_price ON public.bookings;
CREATE TRIGGER trg_bookings_set_price
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_set_price();

REVOKE ALL ON FUNCTION public.service_fee_for(NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.service_fee_for(NUMERIC) TO authenticated, service_role;

COMMIT;
