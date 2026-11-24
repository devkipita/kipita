-- 086: six hours again, chat from acceptance, no live pickup location, no public meeting spot.
-- Decided 24 Nov (CEO). Undoes parts of 081-084 (PR #12) that were applied to the live database on 23 Nov.

UPDATE public.platform_settings
   SET value = '6'::jsonb,
       updated_at = NOW()
 WHERE key = 'release_window_hours';

-- Back to the 070 text.
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

-- Back to the 070 text, grants unchanged.
CREATE OR REPLACE FUNCTION public.report_problem(p_booking_id UUID, p_kind TEXT, p_note TEXT)
RETURNS SETOF public.booking_problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_pay   public.payments%ROWTYPE;
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

  SELECT p.* INTO v_pay
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status = 'held'
   ORDER BY p.created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The fare for this ride is no longer held' USING ERRCODE = '22023';
  END IF;

  IF v_pay.release_due_at IS NOT NULL AND NOW() > v_pay.release_due_at THEN
    RAISE EXCEPTION 'The time to report a problem has passed' USING ERRCODE = 'KP006';
  END IF;

  IF v_note = '' THEN
    RAISE EXCEPTION 'Say what happened' USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO public.booking_problems (booking_id, source, reported_by, kind, note)
    VALUES (p_booking_id, 'passenger', v_me, p_kind, v_note)
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already reported a problem with this ride' USING ERRCODE = '22023';
  END;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'system', 'Problem reported',
         'Passenger report. Fare on hold until you decide.',
         jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id)
    FROM public.users u
   WHERE u.is_admin = TRUE;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES
    (v_b.passenger_id, 'system', 'We are looking into it',
     'Your fare is on hold. We will tell you what we decide.',
     jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id)),
    (v_b.driver_id, 'system', 'A problem was reported',
     'The fare is on hold while we review it.',
     jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id));

  RETURN NEXT v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.report_problem(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_problem(UUID, TEXT, TEXT) TO authenticated;

-- Chat opens when the driver accepts (pending_payment), then as 073 has it. Not on a plain request.
CREATE OR REPLACE FUNCTION public.booking_chat_open(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.bookings b
     WHERE b.id = p_booking_id
       AND (
         b.status::TEXT = 'pending_payment'
         OR public.booking_contact_state(b.id) = 'open'
       )
  );
$$;

REVOKE ALL ON FUNCTION public.booking_chat_open(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.conversation_open(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
       AND public.booking_chat_open(b.id)
  );
$$;

REVOKE ALL ON FUNCTION public.conversation_open(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_open(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.booking_conversation(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_conv  UUID;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_me IS NULL OR v_me NOT IN (v_b.passenger_id, v_b.driver_id) THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  IF v_b.status::TEXT = 'requested' THEN
    RAISE EXCEPTION 'Chat opens once the driver accepts.' USING ERRCODE = '22023';
  ELSIF NOT public.booking_chat_open(p_booking_id) THEN
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
$$;

REVOKE ALL ON FUNCTION public.booking_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_conversation(UUID) TO authenticated;

-- No live pickup location (084 taken out).
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

-- No public meeting spot: never stored on a trip.
CREATE OR REPLACE FUNCTION public.trips_no_meeting_spot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.pickup_point := NULL;
  NEW.dropoff_point := NULL;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trips_no_meeting_spot() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_trips_no_meeting_spot ON public.trips;
CREATE TRIGGER trg_trips_no_meeting_spot
  BEFORE INSERT OR UPDATE OF pickup_point, dropoff_point ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trips_no_meeting_spot();

UPDATE public.trips
   SET pickup_point = NULL, dropoff_point = NULL
 WHERE pickup_point IS NOT NULL OR dropoff_point IS NOT NULL;
