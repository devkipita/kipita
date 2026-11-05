BEGIN;

DO $$ BEGIN
  CREATE TYPE load_size AS ENUM ('small_parcel', 'boot', 'pickup_load', 'large_heavy');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_class AS ENUM ('car', 'suv', 'pickup', 'closed_van', 'truck');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE send_status AS ENUM (
    'open', 'matched', 'collected', 'in_transit', 'delivered', 'cancelled', 'disputed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.send_capacity (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id      UUID REFERENCES public.vehicles(id),
  from_location   TEXT NOT NULL,
  to_location     TEXT NOT NULL,
  depart_date     DATE NOT NULL,
  depart_time     TIME,
  vehicle_type    vehicle_class NOT NULL DEFAULT 'car',
  max_load        load_size NOT NULL DEFAULT 'boot',
  capacity_note   TEXT,
  price_from      NUMERIC(10,2),
  quote_only      BOOLEAN NOT NULL DEFAULT FALSE,
  status          send_status NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (quote_only OR price_from IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_send_capacity_route
  ON public.send_capacity (from_location, to_location, depart_date)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.send_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_location   TEXT NOT NULL,
  to_location     TEXT NOT NULL,
  ready_date      DATE NOT NULL,
  load_size       load_size NOT NULL DEFAULT 'small_parcel',
  item_category   TEXT NOT NULL,
  item_description TEXT NOT NULL,
  declared_value  NUMERIC(10,2),
  photo_urls      TEXT[] NOT NULL DEFAULT '{}',
  recipient_name  TEXT,
  recipient_phone TEXT,
  status          send_status NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_send_requests_route
  ON public.send_requests (from_location, to_location, ready_date)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.send_bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES public.send_requests(id) ON DELETE CASCADE,
  capacity_id     UUID NOT NULL REFERENCES public.send_capacity(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.users(id),
  driver_id       UUID NOT NULL REFERENCES public.users(id),
  price           NUMERIC(10,2) NOT NULL CHECK (price > 0),
  reference       TEXT UNIQUE DEFAULT ('KPS-' || upper(substr(md5(random()::text), 1, 8))),
  pickup_code     TEXT NOT NULL DEFAULT lpad((floor(random() * 1000000))::int::text, 6, '0'),
  delivery_code   TEXT NOT NULL DEFAULT lpad((floor(random() * 1000000))::int::text, 6, '0'),
  collected_at    TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  status          send_status NOT NULL DEFAULT 'matched',
  payment_id      UUID REFERENCES public.payments(id),
  dispute_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id)
);

CREATE TABLE IF NOT EXISTS public.send_prohibited_items (
  id         SERIAL PRIMARY KEY,
  label      TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO public.send_prohibited_items (label, sort_order) VALUES
  ('Cash or bank cards', 0),
  ('Weapons or ammunition', 1),
  ('Illegal goods of any kind', 2),
  ('Hazardous or flammable materials', 3),
  ('Live animals', 4),
  ('Jewellery or other high-value items', 5),
  ('Anything leaving Kenya', 6)
ON CONFLICT (label) DO NOTHING;

ALTER TABLE public.send_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_prohibited_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Capacity readable" ON public.send_capacity;
CREATE POLICY "Capacity readable" ON public.send_capacity
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Capacity owned by driver" ON public.send_capacity;
CREATE POLICY "Capacity owned by driver" ON public.send_capacity
  FOR UPDATE USING (driver_id = public.current_app_user_id())
  WITH CHECK (driver_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Requests readable by owner" ON public.send_requests;
CREATE POLICY "Requests readable by owner" ON public.send_requests
  FOR SELECT USING (
    sender_id = public.current_app_user_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS "Send bookings readable by parties" ON public.send_bookings;
CREATE POLICY "Send bookings readable by parties" ON public.send_bookings
  FOR SELECT USING (
    sender_id = public.current_app_user_id()
    OR driver_id = public.current_app_user_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Prohibited items readable" ON public.send_prohibited_items;
CREATE POLICY "Prohibited items readable" ON public.send_prohibited_items
  FOR SELECT USING (true);

GRANT SELECT ON public.send_capacity TO anon, authenticated;
GRANT SELECT ON public.send_requests TO authenticated;
GRANT SELECT ON public.send_bookings TO authenticated;
GRANT SELECT ON public.send_prohibited_items TO anon, authenticated;
GRANT UPDATE (status, capacity_note, price_from, updated_at)
  ON public.send_capacity TO authenticated;

CREATE OR REPLACE FUNCTION public.list_return_capacity(
  p_from_location TEXT,
  p_to_location   TEXT,
  p_depart_date   DATE,
  p_depart_time   TIME DEFAULT NULL,
  p_vehicle_type  vehicle_class DEFAULT 'car',
  p_max_load      load_size DEFAULT 'boot',
  p_price_from    NUMERIC DEFAULT NULL,
  p_capacity_note TEXT DEFAULT NULL,
  p_vehicle_id    UUID DEFAULT NULL
) RETURNS SETOF public.send_capacity
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me  UUID;
  v_kyc public.kyc_status;
  v_row public.send_capacity%ROWTYPE;
BEGIN
  IF NOT public.flag_enabled('send') THEN
    RAISE EXCEPTION 'Kipita Send is not available yet' USING ERRCODE = '22023';
  END IF;

  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT d.approval_status INTO v_kyc
    FROM public.driver_profiles d WHERE d.user_id = v_me;

  IF v_kyc IS NULL OR v_kyc <> 'approved' THEN
    RAISE EXCEPTION 'Only verified drivers can offer space' USING ERRCODE = '42501';
  END IF;

  IF p_depart_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'That date has passed' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.send_capacity (
    driver_id, vehicle_id, from_location, to_location, depart_date, depart_time,
    vehicle_type, max_load, capacity_note, price_from, quote_only
  ) VALUES (
    v_me, p_vehicle_id, btrim(p_from_location), btrim(p_to_location),
    p_depart_date, p_depart_time, p_vehicle_type, p_max_load,
    p_capacity_note, p_price_from, p_price_from IS NULL
  )
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_send_request(
  p_from_location    TEXT,
  p_to_location      TEXT,
  p_ready_date       DATE,
  p_load_size        load_size,
  p_item_category    TEXT,
  p_item_description TEXT,
  p_declared_value   NUMERIC DEFAULT NULL,
  p_recipient_name   TEXT DEFAULT NULL,
  p_recipient_phone  TEXT DEFAULT NULL,
  p_photo_urls       TEXT[] DEFAULT '{}'
) RETURNS SETOF public.send_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me  UUID;
  v_row public.send_requests%ROWTYPE;
BEGIN
  IF NOT public.flag_enabled('send') THEN
    RAISE EXCEPTION 'Kipita Send is not available yet' USING ERRCODE = '22023';
  END IF;

  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF length(btrim(p_item_description)) < 3 THEN
    RAISE EXCEPTION 'Describe what you are sending' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.send_requests (
    sender_id, from_location, to_location, ready_date, load_size,
    item_category, item_description, declared_value,
    recipient_name, recipient_phone, photo_urls
  ) VALUES (
    v_me, btrim(p_from_location), btrim(p_to_location), p_ready_date, p_load_size,
    btrim(p_item_category), btrim(p_item_description), p_declared_value,
    p_recipient_name, p_recipient_phone, COALESCE(p_photo_urls, '{}')
  )
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_send_handover(
  p_booking_id UUID,
  p_code       TEXT,
  p_leg        TEXT
) RETURNS SETOF public.send_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me  UUID;
  v_row public.send_bookings%ROWTYPE;
BEGIN
  v_me := public.current_app_user_id();

  SELECT b.* INTO v_row FROM public.send_bookings b
   WHERE b.id = p_booking_id FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Shipment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can confirm a handover' USING ERRCODE = '42501';
  END IF;

  IF p_leg = 'pickup' THEN
    IF v_row.pickup_code <> btrim(p_code) THEN
      RAISE EXCEPTION 'That pickup code does not match' USING ERRCODE = '22023';
    END IF;
    UPDATE public.send_bookings b
       SET status = 'in_transit', collected_at = NOW(), updated_at = NOW()
     WHERE b.id = p_booking_id RETURNING * INTO v_row;

  ELSIF p_leg = 'delivery' THEN
    IF v_row.delivery_code <> btrim(p_code) THEN
      RAISE EXCEPTION 'That delivery code does not match' USING ERRCODE = '22023';
    END IF;
    IF v_row.collected_at IS NULL THEN
      RAISE EXCEPTION 'This parcel has not been collected yet' USING ERRCODE = '22023';
    END IF;
    UPDATE public.send_bookings b
       SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
     WHERE b.id = p_booking_id RETURNING * INTO v_row;

  ELSE
    RAISE EXCEPTION 'Unknown handover leg' USING ERRCODE = '22023';
  END IF;

  RETURN NEXT v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.list_return_capacity(TEXT, TEXT, DATE, TIME, vehicle_class, load_size, NUMERIC, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_send_request(TEXT, TEXT, DATE, load_size, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_send_handover(UUID, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_return_capacity(TEXT, TEXT, DATE, TIME, vehicle_class, load_size, NUMERIC, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_send_request(TEXT, TEXT, DATE, load_size, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_send_handover(UUID, TEXT, TEXT) TO authenticated, service_role;

COMMIT;
