-- 092: the car is shared only while a ride is under way, and each passenger's arrival is recorded.
--
-- Decided 25 Nov:
--   1. No live location before the driver starts the ride. 091's early sharing (20 minutes before
--      departure) and the passenger pickup pin go. A driver who runs late tells riders in the chat.
--   2. While the ride is under way riders see the car's dot. The driver sees his own until he ends it.
--   3. A passenger can tap "I've arrived" while the ride is under way. That saves the time and where
--      the car was at that moment. Passenger phones send nothing: the position is the driver's phone.
--   4. A passenger who does not tap gets the same record when the driver ends the ride.
--   5. Their six hours to report a problem, and the payout clock, run from that time. The fare is
--      still paid only after the driver has ended the ride.
--
-- Safe to run whether or not 091 has been applied. The pickup pin table held two test rows.

-- ── 1. Car position: back to "ride under way" only ───────────────────────────────

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
    SELECT 1 FROM public.trips
     WHERE id = p_trip_id AND driver_id = v_me AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'Only the driver of a ride under way can share its location' USING ERRCODE = '42501';
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
BEGIN
  DELETE FROM public.trip_locations l
   USING public.trips t
   WHERE t.id = l.trip_id
     AND (t.status <> 'in_progress' OR l.updated_at < NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_trip_locations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_trip_locations() TO service_role;

-- ── 2. No passenger pickup pin ───────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_bookings_clear_pickup_location ON public.bookings;
DROP FUNCTION IF EXISTS public.clear_pickup_location();
DROP FUNCTION IF EXISTS public.share_pickup_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pickup_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.pickup_locations;
  END IF;
END $$;

DROP TABLE IF EXISTS public.pickup_locations;

-- ── 3. Where and when each passenger's ride ended ────────────────────────────────
-- arrived_by: 'passenger' (they tapped) or 'trip_end' (the driver ended the ride first).
-- The position is the car's last point from the driver's phone; arrived_position_at says how old it
-- was, so a screen can call it approximate when the signal had dropped.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS arrived_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrived_by          TEXT,
  ADD COLUMN IF NOT EXISTS arrived_lat         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS arrived_lng         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS arrived_position_at TIMESTAMPTZ;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_arrived_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_arrived_check CHECK (
  (arrived_by IS NULL OR arrived_by IN ('passenger', 'trip_end'))
  AND ((arrived_at IS NULL) = (arrived_by IS NULL))
  AND ((arrived_lat IS NULL) = (arrived_lng IS NULL))
  AND (arrived_lat IS NULL OR arrived_lat BETWEEN -90 AND 90)
  AND (arrived_lng IS NULL OR arrived_lng BETWEEN -180 AND 180)
);

COMMENT ON COLUMN public.bookings.arrived_at IS
  'When this passenger''s ride ended: their own tap, or the moment the driver ended the whole ride.';

-- A passenger who has arrived stops seeing the car. Riders see it only while their ride is under way.
DROP POLICY IF EXISTS "Trip location readable by riders" ON public.trip_locations;
CREATE POLICY "Trip location readable by riders" ON public.trip_locations
  FOR SELECT TO authenticated
  USING (
    driver_id = (SELECT public.current_app_user_id())
    OR EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.trip_id = trip_locations.trip_id
         AND b.passenger_id = (SELECT public.current_app_user_id())
         AND b.status = 'in_progress'
         AND b.arrived_at IS NULL
    )
  );

-- ── 4. "I've arrived" ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_arrived(p_booking_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me  UUID := public.current_app_user_id();
  v_b   public.bookings%ROWTYPE;
  v_loc public.trip_locations%ROWTYPE;
  v_at  TIMESTAMPTZ := NOW();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR v_b.passenger_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  -- Tapping twice changes nothing.
  IF v_b.arrived_at IS NOT NULL THEN
    RETURN v_b.arrived_at;
  END IF;

  IF v_b.status <> 'in_progress' THEN
    RAISE EXCEPTION 'You can say you have arrived once your ride is under way' USING ERRCODE = '22023';
  END IF;

  SELECT l.* INTO v_loc FROM public.trip_locations l WHERE l.trip_id = v_b.trip_id;

  UPDATE public.bookings b
     SET arrived_at = v_at,
         arrived_by = 'passenger',
         arrived_lat = v_loc.lat,
         arrived_lng = v_loc.lng,
         arrived_position_at = v_loc.updated_at,
         updated_at = NOW()
   WHERE b.id = p_booking_id;

  RETURN v_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_arrived(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_arrived(UUID) TO authenticated;

-- ── 5. Ending the ride fills in the rest, and the clock starts at arrival ────────

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
  v_loc    public.trip_locations%ROWTYPE;
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

  -- The car's last point, read before the ride is closed. Passengers who did not tap "I've arrived"
  -- get it as the place their ride ended.
  SELECT l.* INTO v_loc FROM public.trip_locations l WHERE l.trip_id = p_trip_id;

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
           arrived_at = COALESCE(b.arrived_at, NOW()),
           arrived_by = COALESCE(b.arrived_by, 'trip_end'),
           arrived_lat = CASE WHEN b.arrived_at IS NULL THEN v_loc.lat ELSE b.arrived_lat END,
           arrived_lng = CASE WHEN b.arrived_at IS NULL THEN v_loc.lng ELSE b.arrived_lng END,
           arrived_position_at = CASE WHEN b.arrived_at IS NULL THEN v_loc.updated_at ELSE b.arrived_position_at END,
           updated_at = NOW()
     WHERE b.trip_id = p_trip_id
       AND b.status = 'in_progress'
    RETURNING b.*
  ),
  windowed AS (
    UPDATE public.payments p
       SET release_due_at = m.arrived_at + v_hours::DOUBLE PRECISION * INTERVAL '1 hour',
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
    CASE WHEN m.arrived_by = 'passenger' THEN 'Ride ended' ELSE 'You have arrived' END,
    v_trip.from_location || ' to ' || v_trip.to_location || ' is done. ' ||
      CASE WHEN m.arrived_by = 'passenger'
           THEN ''
           ELSE 'Anything wrong? Report it within ' || trim_scale(v_hours) || ' hours. '
      END ||
      'Rate the trip to help the next passenger.',
    jsonb_build_object('booking_id', m.id, 'trip_id', p_trip_id)
  FROM moved m;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- ── 6. Records kept three years, like the rest of the booking ────────────────────

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
         arrived_lat = NULL,
         arrived_lng = NULL,
         arrived_position_at = NULL,
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
