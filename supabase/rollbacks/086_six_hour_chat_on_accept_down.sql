-- Down for 086: puts back what was live before it (081-084 from PR #12), so use it only if 086 breaks something.
-- That means instant payout, reports for 7 days, chat from a plain request and the live pickup location again.
-- The 085 index is not touched.

-- 1. Instant payout and the 7-day report window (082), window setting 0 (081).
UPDATE public.platform_settings
   SET value = '0'::jsonb,
       updated_at = NOW()
 WHERE key = 'release_window_hours';

CREATE OR REPLACE FUNCTION public.complete_trip(p_trip_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me     UUID;
  v_trip   public.trips%ROWTYPE;
  v_count  INTEGER;
  v_left   public.bookings%ROWTYPE;
  v_pay    UUID;
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
  due AS (
    UPDATE public.payments p
       SET release_due_at = NOW(),
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
      ' is done. Rate the trip to help the next passenger. Something wrong? Report it from your trip.',
    jsonb_build_object('booking_id', m.id, 'trip_id', p_trip_id)
  FROM moved m;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  FOR v_pay IN
    SELECT p.id
      FROM public.payments p
      JOIN public.bookings b ON b.id = p.booking_id
     WHERE b.trip_id = p_trip_id
       AND b.status = 'completed'
       AND b.boarded_at IS NOT NULL
       AND p.status = 'completed'
       AND p.escrow_status = 'held'
       AND NOT EXISTS (
         SELECT 1 FROM public.booking_problems bp
          WHERE bp.booking_id = b.id AND bp.status = 'open'
       )
  LOOP
    BEGIN
      PERFORM public.release_booking_payment(v_pay);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'complete_trip: payment % left for the release job: %', v_pay, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.report_problem(p_booking_id uuid, p_kind text, p_note text)
 RETURNS SETOF booking_problems
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_pay   public.payments%ROWTYPE;
  v_held  BOOLEAN;
  v_row   public.booking_problems%ROWTYPE;
  v_note  TEXT := left(btrim(COALESCE(p_note, '')), 500);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF p_kind IS NULL OR p_kind NOT IN ('never_picked_up', 'not_dropped_off', 'unsafe_driving', 'asked_for_cash', 'other') THEN
    RAISE EXCEPTION 'Pick what went wrong' USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR v_b.passenger_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  IF v_b.status NOT IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'You can report a problem once your ride has started' USING ERRCODE = '22023';
  END IF;

  IF v_b.status = 'completed' AND v_b.completed_at IS NOT NULL AND NOW() > v_b.completed_at + INTERVAL '7 days' THEN
    RAISE EXCEPTION 'The time to report a problem has passed' USING ERRCODE = 'KP006';
  END IF;

  IF v_note = '' THEN
    RAISE EXCEPTION 'Say what happened' USING ERRCODE = '22023';
  END IF;

  SELECT p.* INTO v_pay
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status = 'held'
   ORDER BY p.created_at DESC
   LIMIT 1
   FOR UPDATE;
  v_held := FOUND;

  BEGIN
    INSERT INTO public.booking_problems (booking_id, source, reported_by, kind, note)
    VALUES (p_booking_id, 'passenger', v_me, p_kind, v_note)
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already reported a problem with this ride' USING ERRCODE = '22023';
  END;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'system', 'Problem reported',
         CASE WHEN v_held
           THEN 'Passenger report. Fare on hold until you decide.'
           ELSE 'Passenger report after the fare was paid out.'
         END,
         jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id)
    FROM public.users u
   WHERE u.is_admin = TRUE;

  IF v_held THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES
      (v_b.passenger_id, 'system', 'We are looking into it',
       'Your fare is on hold. We will tell you what we decide.',
       jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id)),
      (v_b.driver_id, 'system', 'A problem was reported',
       'The fare is on hold while we review it.',
       jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id));
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES
      (v_b.passenger_id, 'system', 'We are looking into it',
       'Thanks for telling us. We will tell you what we decide.',
       jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id));
  END IF;

  RETURN NEXT v_row;
END;
$function$;

UPDATE public.platform_settings
   SET value = '0'::jsonb,
       updated_at = NOW()
 WHERE key = 'release_window_hours';

-- 2. Chat from a plain request (083).
CREATE OR REPLACE FUNCTION public.booking_conversation(p_booking_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_conv  UUID;
  v_state TEXT;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_me IS NULL OR v_me NOT IN (v_b.passenger_id, v_b.driver_id) THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  v_state := public.booking_contact_state(p_booking_id);
  IF v_state NOT IN ('open', 'unpaid') THEN
    RAISE EXCEPTION 'Chat is closed.' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_conv
    FROM public.conversations
   WHERE ride_id = v_b.trip_id
     AND participant_ids @> ARRAY[v_b.passenger_id, v_b.driver_id]
     AND cardinality(participant_ids) = 2
   LIMIT 1;

  IF v_conv IS NULL THEN
    INSERT INTO public.conversations (participant_ids, ride_id)
    VALUES (ARRAY[v_b.passenger_id, v_b.driver_id], v_b.trip_id)
    RETURNING id INTO v_conv;
  END IF;

  RETURN v_conv;
END;
$function$;

CREATE OR REPLACE FUNCTION public.conversation_open(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.conversations c
      JOIN public.bookings b
        ON b.trip_id = c.ride_id
       AND b.passenger_id = ANY (c.participant_ids)
       AND b.driver_id    = ANY (c.participant_ids)
     WHERE c.id = p_conversation_id
       AND cardinality(c.participant_ids) = 2
       AND public.current_app_user_id() = ANY (c.participant_ids)
       AND public.booking_contact_state(b.id) IN ('open', 'unpaid')
  );
$function$;

-- 3. Live pickup location (084).
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
  SELECT b.trip_id,
         ((t.departure_date + COALESCE(t.departure_time, TIME '00:00')) AT TIME ZONE 'Africa/Nairobi')
    INTO v_trip, v_leaves
    FROM public.bookings b
    JOIN public.trips t ON t.id = b.trip_id
   WHERE b.id = p_booking_id
     AND b.passenger_id = v_me
     AND b.status = 'confirmed'
     AND b.boarded_at IS NULL
     AND t.status IN ('posted', 'active');

  IF v_trip IS NULL THEN
    RAISE EXCEPTION 'Only a paid passenger waiting for pickup can share their location' USING ERRCODE = '42501';
  END IF;

  IF NOW() < v_leaves - INTERVAL '30 minutes' THEN
    RAISE EXCEPTION 'Location sharing starts 30 minutes before the ride' USING ERRCODE = '22023';
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
  AFTER UPDATE OF status, boarded_at ON public.bookings
  FOR EACH ROW
  WHEN (NEW.boarded_at IS NOT NULL OR NEW.status::TEXT <> 'confirmed')
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

-- 4. Remove what 086 added.
DROP TRIGGER IF EXISTS trg_trips_no_meeting_spot ON public.trips;
DROP FUNCTION IF EXISTS public.trips_no_meeting_spot();
DROP FUNCTION IF EXISTS public.booking_chat_open(UUID);
