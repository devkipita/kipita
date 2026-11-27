-- 092 down: puts the database back as it was after 091 (the car shared from 20 minutes before a paid
-- ride, a pickup pin for passengers). Use it only if 092 has to be undone.
--
-- What is lost: every arrival record written after 092 (arrived_at, arrived_by, arrived_lat,
-- arrived_lng, arrived_position_at), and the function mark_arrived. The pickup pin table comes back
-- empty (it held no rows when 092 was applied). The web code that calls mark_arrived must be put back
-- first. Notification wording from 093 is not touched here; 093 has its own down file.

-- 1. The 091 objects: pickup pin table, its functions, trigger and realtime entry, and the 091 versions
--    of share_trip_location and purge_trip_locations.

CREATE TABLE IF NOT EXISTS public.pickup_locations (
  booking_id   UUID PRIMARY KEY REFERENCES public.bookings (id) ON DELETE CASCADE,
  trip_id      UUID NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.users (id),
  lat          DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng          DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  accuracy_m   REAL CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pickup_locations_trip_idx ON public.pickup_locations (trip_id);

ALTER TABLE public.pickup_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pickup location readable by passenger and driver" ON public.pickup_locations;
CREATE POLICY "Pickup location readable by passenger and driver" ON public.pickup_locations
  FOR SELECT TO authenticated
  USING (
    passenger_id = (SELECT public.current_app_user_id())
    OR EXISTS (
      SELECT 1 FROM public.trips t
       WHERE t.id = pickup_locations.trip_id
         AND t.driver_id = (SELECT public.current_app_user_id())
    )
  );

REVOKE ALL ON public.pickup_locations FROM anon;
GRANT SELECT ON public.pickup_locations TO authenticated;

CREATE OR REPLACE FUNCTION public.share_pickup_location(
  p_booking_id UUID,
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_accuracy_m REAL DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me     UUID := public.current_app_user_id();
  v_trip   UUID;
  v_leaves TIMESTAMPTZ;
BEGIN
  SELECT b.trip_id, public.trip_departs_at(t.departure_date, t.departure_time)
    INTO v_trip, v_leaves
    FROM public.bookings b
    JOIN public.trips t ON t.id = b.trip_id
   WHERE b.id = p_booking_id
     AND b.passenger_id = v_me
     AND b.status IN ('confirmed', 'in_progress')
     AND t.status IN ('posted', 'active', 'in_progress');

  IF v_trip IS NULL THEN
    RAISE EXCEPTION 'Only a paid passenger on this ride can share their location' USING ERRCODE = '42501';
  END IF;

  IF NOW() < v_leaves - INTERVAL '20 minutes' THEN
    RAISE EXCEPTION 'Location sharing starts 20 minutes before the ride' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.pickup_locations (booking_id, trip_id, passenger_id, lat, lng, accuracy_m, updated_at)
  VALUES (p_booking_id, v_trip, v_me, p_lat, p_lng, p_accuracy_m, NOW())
  ON CONFLICT (booking_id) DO UPDATE
     SET lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         accuracy_m = EXCLUDED.accuracy_m,
         updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.share_pickup_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_pickup_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_pickup_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pickup_locations WHERE booking_id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_pickup_location() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bookings_clear_pickup_location ON public.bookings;
CREATE TRIGGER trg_bookings_clear_pickup_location
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status::TEXT NOT IN ('confirmed', 'in_progress'))
  EXECUTE FUNCTION public.clear_pickup_location();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pickup_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_locations;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.share_trip_location(
  p_trip_id   UUID,
  p_lat       DOUBLE PRECISION,
  p_lng       DOUBLE PRECISION,
  p_heading   REAL DEFAULT NULL,
  p_speed_kmh REAL DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := public.current_app_user_id();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.trips t
     WHERE t.id = p_trip_id
       AND t.driver_id = v_me
       AND (
         t.status = 'in_progress'
         OR (
           t.status IN ('posted', 'active')
           AND NOW() >= public.trip_departs_at(t.departure_date, t.departure_time) - INTERVAL '20 minutes'
           AND EXISTS (
             SELECT 1 FROM public.bookings b
              WHERE b.trip_id = t.id AND b.status = 'confirmed'
           )
         )
       )
  ) THEN
    RAISE EXCEPTION 'Location sharing starts 20 minutes before a ride with a paid passenger' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.trip_locations (trip_id, driver_id, lat, lng, heading, speed_kmh, updated_at)
  VALUES (p_trip_id, v_me, p_lat, p_lng, p_heading, p_speed_kmh, NOW())
  ON CONFLICT (trip_id) DO UPDATE
     SET lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         heading = EXCLUDED.heading,
         speed_kmh = EXCLUDED.speed_kmh,
         updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.share_trip_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL, REAL) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_trip_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL, REAL) TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_trip_locations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INTEGER;
  v_p INTEGER;
BEGIN
  DELETE FROM public.trip_locations l
   USING public.trips t
   WHERE t.id = l.trip_id
     AND (t.status NOT IN ('posted', 'active', 'in_progress') OR l.updated_at < NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS v_n = ROW_COUNT;

  DELETE FROM public.pickup_locations p
   USING public.bookings b
   WHERE b.id = p.booking_id
     AND (b.status NOT IN ('confirmed', 'in_progress') OR p.updated_at < NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS v_p = ROW_COUNT;

  RETURN v_n + v_p;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_trip_locations() FROM PUBLIC, anon, authenticated;

-- 2. complete_trip and anonymise_old_records as they were before 092 (086 and 054 versions).

CREATE OR REPLACE FUNCTION public.complete_trip(p_trip_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me     UUID;
  v_trip   public.trips%ROWTYPE;
  v_count  INTEGER;
  v_hours  NUMERIC := public.setting_numeric('release_window_hours', 6);
  v_left   public.bookings%ROWTYPE;
BEGIN
  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = p_trip_id FOR UPDATE;

  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_trip.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can complete this ride' USING ERRCODE = '42501';
  END IF;

  IF v_trip.status = 'completed' THEN
    RAISE EXCEPTION 'This ride is already finished' USING ERRCODE = '22023';
  END IF;

  IF v_trip.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Start this ride before you end it' USING ERRCODE = '22023';
  END IF;

  UPDATE public.trips t SET status = 'completed', updated_at = NOW()
   WHERE t.id = p_trip_id;

  -- start_trip keeps this from happening. If it ever does, the passenger was not on board: they get
  -- everything back and the driver is not paid for them.
  FOR v_left IN
    SELECT b.* FROM public.bookings b
     WHERE b.trip_id = p_trip_id AND b.status = 'confirmed'
     FOR UPDATE
  LOOP
    PERFORM public.refund_booking_payment(v_left.id);

    UPDATE public.bookings b
       SET status = 'cancelled',
           cancel_reason = 'You were not on board when the ride ended.',
           cancel_tier = 'free',
           expires_at = NULL,
           updated_at = NOW()
     WHERE b.id = v_left.id;
  END LOOP;

  WITH moved AS (
    UPDATE public.bookings b
       SET status = 'completed',
           boarded_at = COALESCE(b.boarded_at, b.started_at, NOW()),
           boarded_method = COALESCE(b.boarded_method, 'legacy'),
           updated_at = NOW()
     WHERE b.trip_id = p_trip_id
       AND b.status = 'in_progress'
    RETURNING b.*
  ),
  windowed AS (
    UPDATE public.payments p
       SET release_due_at = NOW() + v_hours::DOUBLE PRECISION * INTERVAL '1 hour',
           updated_at = NOW()
      FROM moved m
     WHERE p.booking_id = m.id
       AND p.status = 'completed'
       AND p.escrow_status = 'held'
    RETURNING p.booking_id
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    m.passenger_id,
    'trip_completed',
    'You have arrived',
    v_trip.from_location || ' to ' || v_trip.to_location ||
      ' is done. Anything wrong? Report it within ' || trim_scale(v_hours) || ' hours. ' ||
      'Rate the trip to help the next passenger.',
    jsonb_build_object('booking_id', m.id, 'trip_id', p_trip_id)
  FROM moved m;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.anonymise_old_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cut   TIMESTAMPTZ := NOW() - INTERVAL '3 years';
  v_count INTEGER := 0;
  v_n     INTEGER;
BEGIN
  UPDATE public.bookings
     SET cancel_reason = NULL,
         pickup_location = NULL,
         dropoff_location = NULL,
         anonymised_at = NOW()
   WHERE created_at < v_cut AND anonymised_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_count := v_count + v_n;

  UPDATE public.trips
     SET description = NULL,
         from_lat = NULL, from_lng = NULL,
         to_lat = NULL, to_lng = NULL,
         anonymised_at = NOW()
   WHERE created_at < v_cut AND anonymised_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_count := v_count + v_n;

  UPDATE public.wallet_topups SET phone = NULL WHERE created_at < v_cut AND phone IS NOT NULL;
  UPDATE public.wallet_withdrawals SET phone = '', failure_reason = NULL WHERE created_at < v_cut AND phone <> '';
  UPDATE public.ratings SET comment = NULL WHERE created_at < v_cut AND comment IS NOT NULL;

  IF to_regclass('public.send_requests') IS NOT NULL THEN
    UPDATE public.send_requests
       SET recipient_name = NULL, recipient_phone = NULL, photo_urls = '{}'
     WHERE created_at < v_cut AND (recipient_phone IS NOT NULL OR recipient_name IS NOT NULL);
  END IF;

  DELETE FROM public.messages m
   USING public.conversations c
   WHERE m.conversation_id = c.id
     AND m.created_at < v_cut;

  DELETE FROM public.conversations c
   WHERE COALESCE(c.last_message_at, c.created_at) < v_cut
     AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id = c.id);

  RETURN v_count;
END;
$$;

-- 3. Riders read the car while their booking is confirmed or in progress (as before 092).

DROP POLICY IF EXISTS "Trip location readable by riders" ON public.trip_locations;
CREATE POLICY "Trip location readable by riders" ON public.trip_locations
  FOR SELECT TO authenticated
  USING (
    driver_id = (SELECT public.current_app_user_id())
    OR EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.trip_id = trip_locations.trip_id
         AND b.passenger_id = (SELECT public.current_app_user_id())
         AND b.status IN ('confirmed', 'in_progress')
    )
  );

-- 4. Take out the arrival record.

DROP FUNCTION IF EXISTS public.mark_arrived(UUID);

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_arrived_check;
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS arrived_at,
  DROP COLUMN IF EXISTS arrived_by,
  DROP COLUMN IF EXISTS arrived_lat,
  DROP COLUMN IF EXISTS arrived_lng,
  DROP COLUMN IF EXISTS arrived_position_at;
