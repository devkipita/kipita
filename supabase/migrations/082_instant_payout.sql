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
