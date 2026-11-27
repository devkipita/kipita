-- 093 down: puts the 26 functions back to their wording from before 093.
--
-- Each function below is the last version in the migration files, and its body was checked by md5
-- against the live function on 27 Nov, just before 093 was applied. Text only; no table is touched.
-- Not run. complete_trip is not here: it comes back with the 092 down file.

CREATE OR REPLACE FUNCTION public.accept_booking(
  p_booking_id UUID,
  p_hold_mins  INTEGER DEFAULT 30
) RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID;
  v_booking public.bookings%ROWTYPE;
  v_trip    public.trips%ROWTYPE;
  v_who     TEXT;
BEGIN
  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_booking FROM public.bookings b
   WHERE b.id = p_booking_id FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can accept this' USING ERRCODE = '42501';
  END IF;

  IF v_booking.status = 'pending_payment' THEN
    RETURN NEXT v_booking;
    RETURN;
  END IF;

  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'This request is no longer open' USING ERRCODE = '22023';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t
   WHERE t.id = v_booking.trip_id FOR UPDATE;

  IF v_trip.status NOT IN ('posted', 'active') THEN
    RAISE EXCEPTION 'This ride is no longer taking bookings' USING ERRCODE = '22023';
  END IF;

  IF v_trip.seats_available < v_booking.seats_booked THEN
    RAISE EXCEPTION 'Not enough seats left' USING ERRCODE = '53400';
  END IF;

  UPDATE public.trips t
     SET seats_available = t.seats_available - v_booking.seats_booked,
         updated_at = NOW()
   WHERE t.id = v_trip.id;

  UPDATE public.bookings b
     SET status = 'pending_payment',
         expires_at = NOW() + make_interval(mins => p_hold_mins),
         updated_at = NOW()
   WHERE b.id = p_booking_id
  RETURNING * INTO v_booking;

  SELECT COALESCE(NULLIF(btrim(u.full_name), ''), 'Your driver')
    INTO v_who
    FROM public.users u WHERE u.id = v_me;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_booking.passenger_id,
    'ride_match',
    'Your seat is held',
    COALESCE(v_who, 'Your driver') || ' accepted your request for ' ||
      v_trip.from_location || ' to ' || v_trip.to_location ||
      '. Pay within ' || p_hold_mins || ' minutes to confirm it.',
    jsonb_build_object(
      'booking_id', v_booking.id,
      'trip_id', v_trip.id,
      'expires_at', v_booking.expires_at
    )
  );

  RETURN NEXT v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_trip(
  p_trip_id UUID,
  p_reason  TEXT DEFAULT NULL
) RETURNS SETOF public.trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID;
  v_trip    public.trips%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_reason  TEXT;
  v_terms   JSONB;
  v_paid    INTEGER := 0;
  v_late    BOOLEAN := FALSE;
BEGIN
  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t
   WHERE t.id = p_trip_id FOR UPDATE;

  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_trip.driver_id <> v_me AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not your ride' USING ERRCODE = '42501';
  END IF;

  IF v_trip.status = 'cancelled' THEN
    RAISE EXCEPTION 'This ride is already cancelled' USING ERRCODE = '22023';
  END IF;

  IF v_trip.status = 'completed' THEN
    RAISE EXCEPTION 'This ride is already finished' USING ERRCODE = '22023';
  END IF;

  IF v_trip.status = 'in_progress' THEN
    RAISE EXCEPTION 'This ride is under way. Contact support to stop it.'
      USING ERRCODE = '22023';
  END IF;

  v_reason := COALESCE(NULLIF(trim(COALESCE(p_reason, '')), ''),
                       'The driver cancelled this ride.');

  FOR v_booking IN
    SELECT b.* FROM public.bookings b
     WHERE b.trip_id = p_trip_id
       AND b.status NOT IN ('completed', 'cancelled', 'rejected')
     FOR UPDATE
  LOOP
    v_terms := public.cancellation_terms(v_booking.id, 'driver');

    IF v_terms->>'tier' <> 'nothing_held' THEN
      v_paid := v_paid + 1;
      v_late := v_late OR COALESCE((v_terms->>'late_for_driver')::BOOLEAN, FALSE);
    END IF;

    PERFORM public.settle_cancellation(v_booking.id, v_terms);

    UPDATE public.bookings b
       SET status = 'cancelled',
           cancel_reason = v_reason,
           cancelled_by = v_me,
           cancel_tier = v_terms->>'tier',
           expires_at = NULL,
           updated_at = NOW()
     WHERE b.id = v_booking.id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_booking.passenger_id,
      'system',
      'Your ride was cancelled',
      v_trip.from_location || ' to ' || v_trip.to_location ||
        ' is off. ' || v_reason,
      jsonb_build_object('trip_id', p_trip_id, 'booking_id', v_booking.id)
    );
  END LOOP;

  UPDATE public.trips t
     SET status = 'cancelled',
         updated_at = NOW()
   WHERE t.id = p_trip_id
  RETURNING * INTO v_trip;

  -- An admin stopping a ride does not count against the driver.
  IF v_trip.driver_id = v_me THEN
    PERFORM public.record_driver_cancellation(v_trip.driver_id, p_trip_id, NULL, v_paid, v_late);
  END IF;

  RETURN NEXT v_trip;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_referral(
  p_referee_id UUID,
  p_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral       public.referrals%ROWTYPE;
  v_joined         INT;
  v_referrer_award NUMERIC(10,2);
  v_referee_award  NUMERIC(10,2) := 100;
BEGIN
  SELECT * INTO v_referral
    FROM public.referrals
   WHERE referee_id = p_referee_id AND status = 'pending'
     FOR UPDATE;

  IF v_referral.id IS NULL THEN RETURN FALSE; END IF;

  SELECT COUNT(*) INTO v_joined
    FROM public.referrals
   WHERE referrer_id = v_referral.referrer_id AND status = 'rewarded';

  v_referrer_award := CASE
                        WHEN v_joined >= 10 THEN 300
                        WHEN v_joined >= 3  THEN 250
                        ELSE 200
                      END;

  UPDATE public.referrals
     SET status          = 'rewarded',
         referrer_reward = v_referrer_award,
         referee_reward  = v_referee_award,
         booking_id      = COALESCE(p_booking_id, booking_id),
         rewarded_at     = NOW()
   WHERE id = v_referral.id AND status = 'pending';

  IF NOT FOUND THEN RETURN FALSE; END IF;

  PERFORM public.credit_wallet(
    v_referral.referrer_id, v_referrer_award, 'referral',
    v_referral.id::TEXT, 'Referral bonus', p_booking_id
  );

  PERFORM public.credit_wallet(
    v_referral.referee_id, v_referee_award, 'referral',
    v_referral.id::TEXT, 'Welcome bonus', p_booking_id
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_referral.referrer_id, 'payment_success', 'Referral Paid',
    'KES ' || v_referrer_award || ' added to your wallet — your invite took their first ride.',
    jsonb_build_object('referral_id', v_referral.id)
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_booking(
  p_booking_id UUID,
  p_reason     TEXT DEFAULT NULL
) RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID;
  v_booking public.bookings%ROWTYPE;
  v_trip    public.trips%ROWTYPE;
BEGIN
  v_me := public.current_app_user_id();

  SELECT b.* INTO v_booking FROM public.bookings b
   WHERE b.id = p_booking_id FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can decline this' USING ERRCODE = '42501';
  END IF;

  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'This request is no longer open' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings b
     SET status = 'rejected',
         cancel_reason = p_reason,
         updated_at = NOW()
   WHERE b.id = p_booking_id
  RETURNING * INTO v_booking;

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = v_booking.trip_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_booking.passenger_id,
    'system',
    'That seat was not available',
    'Your request for ' || COALESCE(v_trip.from_location, 'that ride') ||
      CASE WHEN v_trip.to_location IS NULL THEN ''
           ELSE ' to ' || v_trip.to_location END ||
      ' was declined. ' ||
      COALESCE(NULLIF(btrim(p_reason), '') || ' ', '') ||
      'Nothing was charged. Other rides on this route are still open.',
    jsonb_build_object('trip_id', v_booking.trip_id)
  );

  RETURN NEXT v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispute_no_show(p_booking_id UUID, p_note TEXT)
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_hours NUMERIC := public.setting_numeric('no_show_dispute_hours', 24);
  v_note  TEXT := left(trim(COALESCE(p_note, '')), 500);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.passenger_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;
  IF v_b.cancel_tier IS DISTINCT FROM 'no_show' OR v_b.no_show_marked_at IS NULL THEN
    RAISE EXCEPTION 'This booking was not reported as a no-show' USING ERRCODE = '22023';
  END IF;
  IF v_b.no_show_disputed_at IS NOT NULL THEN
    RAISE EXCEPTION 'You have already sent this for review' USING ERRCODE = '22023';
  END IF;
  IF NOW() > v_b.no_show_marked_at + v_hours::DOUBLE PRECISION * INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'The time to dispute this has passed' USING ERRCODE = 'KP003';
  END IF;
  IF v_note = '' THEN
    RAISE EXCEPTION 'Say what happened' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings b
     SET no_show_disputed_at = NOW(),
         no_show_dispute_note = v_note,
         updated_at = NOW()
   WHERE b.id = p_booking_id
  RETURNING * INTO v_b;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'system', 'No-show to review',
         'A passenger disputes a no-show report. The fare is on hold until you decide.',
         jsonb_build_object('booking_id', p_booking_id)
    FROM public.users u
   WHERE u.is_admin = TRUE;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES
    (v_b.passenger_id, 'system', 'We are looking into it',
     'Your fare stays on hold while we review this. We will tell you what we decide.',
     jsonb_build_object('booking_id', p_booking_id)),
    (v_b.driver_id, 'system', 'No-show under review',
     'The passenger disputes the no-show report. The fare stays on hold while we review it.',
     jsonb_build_object('booking_id', p_booking_id));

  RETURN NEXT v_b;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_departed_trips()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_grace NUMERIC := public.setting_numeric('trip_expiry_grace_hours', 3);
  v_trip  RECORD;
  v_n     INTEGER := 0;
BEGIN
  FOR v_trip IN
    SELECT t.id, t.from_location, t.to_location
      FROM public.trips t
     WHERE t.status IN ('posted', 'active', 'awaiting_approval')
       AND t.departure_date IS NOT NULL
       AND public.trip_departs_at(t.departure_date, t.departure_time)
           + v_grace::DOUBLE PRECISION * INTERVAL '1 hour' <= NOW()
       AND NOT EXISTS (
         SELECT 1 FROM public.bookings b
          WHERE b.trip_id = t.id
            AND b.status IN ('pending_payment', 'confirmed', 'in_progress')
       )
     FOR UPDATE OF t SKIP LOCKED
  LOOP
    WITH declined AS (
      UPDATE public.bookings b
         SET status = 'rejected',
             cancel_reason = 'The ride left before the request was answered.',
             updated_at = NOW()
       WHERE b.trip_id = v_trip.id
         AND b.status = 'requested'
      RETURNING b.id, b.passenger_id
    )
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT d.passenger_id,
           'system',
           'That ride has left',
           COALESCE(v_trip.from_location, 'That ride') ||
             CASE WHEN v_trip.to_location IS NULL THEN '' ELSE ' to ' || v_trip.to_location END ||
             ' left before your request was answered. Nothing was charged. ' ||
             'Other rides on this route are still open.',
           jsonb_build_object('trip_id', v_trip.id, 'booking_id', d.id)
      FROM declined d;

    UPDATE public.trips t
       SET status = 'cancelled',
           updated_at = NOW()
     WHERE t.id = v_trip.id;

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_boarded_manually(p_booking_id UUID, p_note TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_trip  public.trips%ROWTYPE;
  v_pc    public.booking_pickup_codes%ROWTYPE;
  v_max   INTEGER := public.setting_numeric('pickup_code_max_tries', 5)::INTEGER;
  v_note  TEXT := left(btrim(COALESCE(p_note, '')), 200);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can board passengers' USING ERRCODE = '42501';
  END IF;

  IF v_b.boarded_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', TRUE, 'already', TRUE) || public.boarding_counts(v_b.trip_id);
  END IF;

  IF v_b.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only a paid booking can be boarded' USING ERRCODE = '22023';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = v_b.trip_id;
  IF v_trip.status NOT IN ('posted', 'active') THEN
    RAISE EXCEPTION 'This ride has already started' USING ERRCODE = '22023';
  END IF;

  -- The by-hand route opens only once the code has failed the allowed number of times, or when there is
  -- no code to enter. Otherwise a driver could skip the code by saying the passenger's phone is off.
  SELECT pc.* INTO v_pc FROM public.booking_pickup_codes pc WHERE pc.booking_id = p_booking_id;
  IF FOUND AND v_pc.wrong_tries < v_max THEN
    RAISE EXCEPTION 'Enter the pickup code.' USING ERRCODE = '22023';
  END IF;

  IF v_note = '' THEN
    RAISE EXCEPTION 'Give a reason.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings b
     SET boarded_at = NOW(), boarded_method = 'manual', boarded_note = v_note, updated_at = NOW()
   WHERE b.id = p_booking_id;

  INSERT INTO public.booking_problems (booking_id, source, reported_by, kind, note)
  VALUES (p_booking_id, 'manual_board', v_me, 'manual_board', v_note)
  ON CONFLICT (booking_id, source) WHERE status = 'open' DO NOTHING;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_b.passenger_id, 'system', 'You were marked on board',
    'Your driver did it without your code. Not right? Report a problem on your booking.',
    jsonb_build_object('booking_id', p_booking_id)
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'system', 'Passenger boarded by hand',
         'Fare on hold until you clear it.',
         jsonb_build_object('booking_id', p_booking_id)
    FROM public.users u
   WHERE u.is_admin = TRUE;

  RETURN jsonb_build_object('ok', TRUE) || public.boarding_counts(v_b.trip_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_no_show(p_booking_id UUID)
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID := public.current_app_user_id();
  v_b       public.bookings%ROWTYPE;
  v_departs TIMESTAMPTZ;
  v_wait    NUMERIC := public.setting_numeric('no_show_wait_minutes', 15);
  v_hours   NUMERIC := public.setting_numeric('no_show_dispute_hours', 24);
  v_paid    UUID;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can report a no-show' USING ERRCODE = '42501';
  END IF;
  IF v_b.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only a paid booking that has not started can be reported' USING ERRCODE = '22023';
  END IF;
  IF v_b.boarded_at IS NOT NULL THEN
    RAISE EXCEPTION 'This passenger is already on board' USING ERRCODE = '22023';
  END IF;

  v_departs := public.trip_departs_at(v_b.trip_id);
  IF NOW() < v_departs + v_wait::DOUBLE PRECISION * INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Too early to report a no-show' USING ERRCODE = 'KP002';
  END IF;

  SELECT p.id INTO v_paid
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status = 'held'
   ORDER BY p.created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF v_paid IS NULL THEN
    RAISE EXCEPTION 'No fare is held for this booking' USING ERRCODE = '22023';
  END IF;

  -- Park the fare. Nothing can release or refund it until it is settled or resolved.
  UPDATE public.payments
     SET escrow_status = 'refund_pending', updated_at = NOW()
   WHERE id = v_paid;

  UPDATE public.bookings b
     SET status = 'cancelled',
         cancel_reason = 'The passenger did not show up',
         cancelled_by = v_me,
         cancel_tier = 'no_show',
         no_show_marked_at = NOW(),
         expires_at = NULL,
         updated_at = NOW()
   WHERE b.id = p_booking_id
  RETURNING * INTO v_b;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_b.passenger_id, 'system', 'Your driver says you didn''t show up',
    'Not right? Tell us within ' || v_hours::INTEGER || ' hours, or your fare goes to the driver.',
    jsonb_build_object('booking_id', v_b.id, 'no_show', TRUE)
  );

  RETURN NEXT v_b;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_booking_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := public.current_app_user_id();
  v_trip  public.trips%ROWTYPE;
  v_name  TEXT;
  v_route TEXT;
BEGIN
  SELECT * INTO v_trip FROM public.trips WHERE id = NEW.trip_id;
  v_route := COALESCE(v_trip.from_location, 'Your ride') || ' to ' || COALESCE(v_trip.to_location, '');
  SELECT split_part(COALESCE(full_name, ''), ' ', 1) INTO v_name FROM public.users WHERE id = NEW.passenger_id;
  v_name := COALESCE(NULLIF(v_name, ''), 'Your passenger');

  IF NEW.cancel_reason = 'Payment hold expired' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data) VALUES
      (NEW.passenger_id, 'system', 'Your seat hold ran out',
       v_route || ' was not paid in time, so the seat was released. Nothing was charged.',
       jsonb_build_object('booking_id', NEW.id, 'trip_id', NEW.trip_id)),
      (NEW.driver_id, 'system', v_name || ' didn''t pay in time',
       'The ' || CASE WHEN NEW.seats_booked = 1 THEN 'seat' ELSE 'seats' END ||
       ' on ' || v_route || ' are back on sale.',
       jsonb_build_object('booking_id', NEW.id, 'trip_id', NEW.trip_id));
    RETURN NEW;
  END IF;

  IF v_actor IS NOT NULL AND v_actor = NEW.passenger_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.driver_id, 'system', v_name || ' cancelled',
      v_route || ' · ' || NEW.seats_booked ||
        CASE WHEN NEW.seats_booked = 1 THEN ' seat is' ELSE ' seats are' END ||
        ' back on sale.' ||
        COALESCE(' Reason: ' || NULLIF(btrim(NEW.cancel_reason), ''), ''),
      jsonb_build_object('booking_id', NEW.id, 'trip_id', NEW.trip_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_driver_trip_posted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waiting BOOLEAN := NEW.status = 'awaiting_approval';
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.driver_id,
    'system',
    CASE WHEN v_waiting THEN 'Ride saved' ELSE 'Ride published' END,
    NEW.from_location || ' → ' || NEW.to_location || ' · ' ||
      CASE
        WHEN v_waiting THEN 'it goes live as soon as verification clears'
        ELSE 'passengers can book a seat now'
      END,
    jsonb_build_object(
      'trip_id', NEW.id,
      'status', NEW.status,
      'from', NEW.from_location,
      'to', NEW.to_location,
      'departure_date', NEW.departure_date,
      'departure_time', NEW.departure_time
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_trip_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_who   UUID;
  v_role  TEXT;
  v_count INTEGER;
  v_title TEXT;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  FOREACH v_who IN ARRAY ARRAY[NEW.passenger_id, NEW.driver_id] LOOP
    v_role := CASE WHEN v_who = NEW.driver_id THEN 'driver' ELSE 'passenger' END;

    SELECT COUNT(*) INTO v_count
      FROM public.bookings b
     WHERE b.status = 'completed'
       AND (CASE WHEN v_role = 'driver' THEN b.driver_id ELSE b.passenger_id END) = v_who;

    IF v_count NOT IN (1, 5, 10, 25, 50, 100, 250, 500) THEN
      CONTINUE;
    END IF;

    v_title := CASE
      WHEN v_count = 1 AND v_role = 'driver' THEN 'Your first passenger, delivered'
      WHEN v_count = 1 THEN 'Your first Kipita ride'
      WHEN v_role = 'driver' THEN v_count || ' passengers delivered'
      ELSE v_count || ' rides with Kipita'
    END;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_who,
      'trip_completed',
      v_title,
      CASE WHEN v_role = 'driver'
        THEN 'Every seat you share puts a car''s empty space to work.'
        ELSE 'Every shared seat is one less car on the road.'
      END,
      jsonb_build_object('booking_id', NEW.id, 'milestone', v_count, 'role', v_role)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_booking_with_wallet(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID := public.current_app_user_id();
  v_b       public.bookings%ROWTYPE;
  v_amount  NUMERIC(10, 2);
  v_pct     NUMERIC;
  v_fee     NUMERIC(10, 2);
  v_payment UUID;
  v_ref     TEXT;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR v_me IS NULL OR v_b.passenger_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;
  IF v_b.status <> 'pending_payment' THEN
    RAISE EXCEPTION 'This booking is not waiting for payment' USING ERRCODE = '22023';
  END IF;
  IF v_b.expires_at IS NOT NULL AND v_b.expires_at < NOW() THEN
    RAISE EXCEPTION 'The hold on this seat has run out' USING ERRCODE = '22023';
  END IF;

  v_amount := v_b.total_price;
  v_pct := public.setting_numeric('platform_fee_percent', 12);
  v_fee := COALESCE(v_b.service_fee, ROUND(v_amount * v_pct / 100, 2));
  v_ref := COALESCE(v_b.booking_reference, LEFT(v_b.id::TEXT, 8));

  PERFORM public.debit_wallet(
    v_me, v_amount, 'escrow_hold', 'wallet:' || v_b.id::TEXT,
    'Fare held for booking ' || v_ref, v_b.id
  );

  INSERT INTO public.payments (
    booking_id, user_id, payer_id, amount, currency, method, status,
    escrow_status, platform_fee, driver_earning, fee_percent,
    held_at, paid_at, idempotency_key
  ) VALUES (
    v_b.id, v_me, v_me, v_amount, 'KES', 'wallet', 'completed',
    'held', v_fee, v_amount - v_fee, v_pct,
    NOW(), NOW(), 'wallet:' || v_b.id::TEXT
  )
  RETURNING id INTO v_payment;

  UPDATE public.bookings
     SET status = 'confirmed',
         payment_id = v_payment,
         expires_at = NULL,
         updated_at = NOW()
   WHERE id = v_b.id
     AND status = 'pending_payment';

  PERFORM public.increment_trip_count(v_b.passenger_id);
  PERFORM public.increment_trip_count(v_b.driver_id);

  INSERT INTO public.notifications (user_id, type, title, body, data) VALUES
    (v_b.passenger_id, 'payment_success', 'Payment held securely',
     'KES ' || v_amount || ' from your Kipita wallet is held until your ride ends.',
     jsonb_build_object('booking_id', v_b.id, 'payment_id', v_payment)),
    (v_b.driver_id, 'payment_success', 'Seat paid',
     'A passenger paid for their seat. The fare is held until the ride ends.',
     jsonb_build_object('booking_id', v_b.id, 'payment_id', v_payment));

  RETURN v_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_driver_cancellation(
  p_driver_id UUID,
  p_trip_id   UUID,
  p_booking_id UUID,
  p_paid      INTEGER,
  p_late      BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_late_count INTEGER;
BEGIN
  -- Cancelling a ride nobody paid for harms nobody.
  IF COALESCE(p_paid, 0) <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.driver_cancellations (driver_id, trip_id, booking_id, paid_bookings, late)
  VALUES (p_driver_id, p_trip_id, p_booking_id, p_paid, p_late);

  IF p_late THEN
    SELECT count(*) INTO v_late_count
      FROM public.driver_cancellations c
     WHERE c.driver_id = p_driver_id
       AND c.late
       AND c.created_at >= NOW() - INTERVAL '30 days';

    IF v_late_count >= 2 THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        p_driver_id, 'system', 'Late cancellations',
        'You have cancelled paid rides at short notice ' || v_late_count
          || ' times in the last 30 days. Passengers rely on these rides, and repeated late cancellations can lead to your account being paused.',
        jsonb_build_object('late_cancellations', v_late_count)
      );
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_booking_payment(
  p_booking_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_payment public.payments%ROWTYPE;
BEGIN
  SELECT b.* INTO v_booking FROM public.bookings b WHERE b.id = p_booking_id;
  IF v_booking.id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT p.* INTO v_payment
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status = 'held'
   ORDER BY p.created_at DESC
   LIMIT 1;

  IF v_payment.id IS NULL THEN
    RETURN FALSE;
  END IF;

  PERFORM public.credit_wallet(
    v_booking.passenger_id,
    v_payment.amount,
    'refund',
    v_payment.id::TEXT,
    'Refund for cancelled booking ' ||
      COALESCE(v_booking.booking_reference, left(v_booking.id::TEXT, 8)),
    v_booking.id
  );

  UPDATE public.payments p
     SET escrow_status = 'refunded',
         status = 'refunded',
         refunded_at = NOW(),
         updated_at = NOW()
   WHERE p.id = v_payment.id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_booking.passenger_id,
    'system',
    'Refunded to your wallet',
    'Your fare is back in your Kipita wallet in full. You can book another ride now.',
    jsonb_build_object('booking_id', v_booking.id, 'amount', v_payment.amount)
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_late_payment(p_payment_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_ref     TEXT;
BEGIN
  -- Lock the payment first so two callers (confirm-payment and the sweep) cannot both refund it.
  SELECT p.* INTO v_payment
    FROM public.payments p
   WHERE p.id = p_payment_id
     FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RETURN 'not_found';
  END IF;

  IF v_payment.status = 'refunded' OR v_payment.escrow_status = 'refunded' THEN
    RETURN 'already_refunded';
  END IF;

  -- Taken and held (or released): the cancellation policy and the escrow release own it, not this function.
  IF v_payment.status = 'completed' OR v_payment.escrow_status <> 'none' THEN
    RETURN 'completed';
  END IF;

  SELECT b.* INTO v_booking
    FROM public.bookings b
   WHERE b.id = v_payment.booking_id;

  IF v_booking.id IS NULL OR v_booking.status <> 'cancelled' THEN
    RETURN 'booking_live';
  END IF;

  -- No receipt stored: no money arrived. Same result as before this migration.
  IF v_payment.transaction_reference IS NULL AND v_payment.paid_at IS NULL THEN
    IF v_payment.status <> 'failed' THEN
      UPDATE public.payments p
         SET status = 'failed',
             updated_at = NOW()
       WHERE p.id = v_payment.id;
    END IF;
    RETURN 'no_money';
  END IF;

  v_ref := v_payment.id::TEXT || ':late';

  -- Second lock on the same fact: a refund entry for this payment already exists.
  IF EXISTS (
    SELECT 1
      FROM public.wallet_transactions wt
      JOIN public.wallets w ON w.id = wt.wallet_id
     WHERE w.user_id = v_booking.passenger_id
       AND wt.type = 'refund'
       AND wt.reference = v_ref
  ) THEN
    RETURN 'already_refunded';
  END IF;

  PERFORM public.credit_wallet(
    v_booking.passenger_id,
    v_payment.amount,
    'refund',
    v_ref,
    'Refund for late payment, booking ' ||
      COALESCE(v_booking.booking_reference, left(v_booking.id::TEXT, 8)),
    v_booking.id
  );

  -- The trigger on escrow_status stamps the booking (refunded_amount, refunded_at, refund_to = wallet).
  UPDATE public.payments p
     SET status = 'refunded',
         escrow_status = 'refunded',
         refunded_at = NOW(),
         updated_at = NOW()
   WHERE p.id = v_payment.id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_booking.passenger_id,
    'system',
    'Payment refunded to your wallet',
    'Your hold had ended before you paid. KES ' || trim_scale(v_payment.amount)::TEXT ||
      ' is back in your wallet.',
    jsonb_build_object('booking_id', v_booking.id, 'payment_id', v_payment.id, 'amount', v_payment.amount)
  );

  RETURN 'refunded';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_booking_payment(p_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p    public.payments%ROWTYPE;
  v_b    public.bookings%ROWTYPE;
  v_fee  NUMERIC(10, 2);
  v_earn NUMERIC(10, 2);
  v_ref  TEXT;
BEGIN
  SELECT p.* INTO v_p FROM public.payments p WHERE p.id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_p.status <> 'completed' OR v_p.escrow_status <> 'held' THEN
    RETURN FALSE;
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = v_p.booking_id FOR UPDATE;
  IF NOT FOUND OR v_b.status <> 'completed' OR v_b.boarded_at IS NULL THEN
    RETURN FALSE;
  END IF;

  v_fee  := v_p.platform_fee;
  v_earn := CASE WHEN v_p.driver_earning > 0 THEN v_p.driver_earning ELSE v_p.amount - v_p.platform_fee END;
  v_ref  := COALESCE(v_b.booking_reference, LEFT(v_b.id::TEXT, 8));

  UPDATE public.payments p
     SET escrow_status = 'released',
         released_at = NOW(),
         driver_earning = v_earn,
         payout_status = 'wallet',
         payout_reference = NULL,
         updated_at = NOW()
   WHERE p.id = v_p.id;

  PERFORM public.credit_wallet(
    v_b.driver_id, v_earn, 'payout', v_p.id::TEXT,
    'Ride earning for ' || v_ref, v_b.id
  );

  PERFORM public.record_wallet_entry(
    v_b.passenger_id, v_p.amount, 'escrow_release', v_p.id::TEXT,
    'Fare released to your driver for ' || v_ref, v_b.id
  );

  PERFORM public.convert_referral(v_b.passenger_id, v_b.id);

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_b.driver_id, 'payment_success', 'Fare released',
    'KES ' || trim_scale(v_earn) || ' was added to your Kipita wallet. Paid out to M-Pesa each morning.',
    jsonb_build_object('booking_id', v_b.id, 'payment_id', v_p.id)
  );

  RETURN TRUE;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.request_seat(p_trip_id UUID, p_seats INTEGER)
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_me       UUID;
  v_trip     public.trips%ROWTYPE;
  v_existing public.bookings%ROWTYPE;
  v_booking  public.bookings%ROWTYPE;
  v_clash    UUID;
  v_who      TEXT;
BEGIN
  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF p_seats < 1 OR p_seats > 8 THEN
    RAISE EXCEPTION 'Seats must be between 1 and 8' USING ERRCODE = '22023';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = p_trip_id;

  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_trip.driver_id = v_me THEN
    RAISE EXCEPTION 'This is your own ride' USING ERRCODE = '42501';
  END IF;

  IF v_trip.status NOT IN ('posted', 'active') THEN
    RAISE EXCEPTION 'This ride is no longer taking bookings' USING ERRCODE = '22023';
  END IF;

  IF public.trip_departs_at(v_trip.departure_date, v_trip.departure_time) <= NOW() THEN
    RAISE EXCEPTION 'This ride has already left' USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO v_existing
    FROM public.bookings b
   WHERE b.trip_id = p_trip_id AND b.passenger_id = v_me;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status IN ('rejected', 'cancelled') THEN
      DELETE FROM public.bookings b WHERE b.id = v_existing.id;
    ELSE
      RETURN NEXT v_existing;
      RETURN;
    END IF;
  END IF;

  SELECT b.id INTO v_clash
    FROM public.bookings b
   WHERE b.passenger_id = v_me AND b.status = 'in_progress'
   LIMIT 1;

  IF v_clash IS NOT NULL THEN
    RAISE EXCEPTION 'You are on a ride right now. Finish it before booking another.'
      USING ERRCODE = '55006';
  END IF;

  SELECT b.id INTO v_clash
    FROM public.bookings b
    JOIN public.trips t ON t.id = b.trip_id
   WHERE b.passenger_id = v_me
     AND b.status IN ('requested', 'pending_payment', 'confirmed')
     AND t.departure_date = v_trip.departure_date
     AND abs(
           EXTRACT(EPOCH FROM (t.departure_time - v_trip.departure_time))
         ) < 10800
   LIMIT 1;

  IF v_clash IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a seat around that time. You cannot be in two places at once.'
      USING ERRCODE = '55006';
  END IF;

  IF v_trip.seats_available < p_seats THEN
    RAISE EXCEPTION 'Not enough seats left' USING ERRCODE = '53400';
  END IF;

  INSERT INTO public.bookings (
    trip_id, passenger_id, driver_id, seats_booked, total_price, status
  ) VALUES (
    p_trip_id, v_me, v_trip.driver_id, p_seats,
    v_trip.price_per_seat * p_seats, 'requested'
  )
  RETURNING * INTO v_booking;

  SELECT COALESCE(NULLIF(btrim(u.full_name), ''), 'A passenger')
    INTO v_who
    FROM public.users u WHERE u.id = v_me;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_trip.driver_id,
    'request_match',
    'New seat request',
    COALESCE(v_who, 'A passenger') || ' wants ' || p_seats ||
      CASE WHEN p_seats = 1 THEN ' seat on ' ELSE ' seats on ' END ||
      v_trip.from_location || ' to ' || v_trip.to_location ||
      '. Accept to hold the seat and ask for payment.',
    jsonb_build_object(
      'booking_id', v_booking.id,
      'trip_id', v_trip.id,
      'seats', p_seats
    )
  );

  RETURN NEXT v_booking;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_booking_problem(
  p_problem_id UUID,
  p_outcome    TEXT,
  p_note       TEXT DEFAULT NULL
) RETURNS SETOF public.booking_problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me   UUID := public.current_app_user_id();
  v_pr   public.booking_problems%ROWTYPE;
  v_b    public.bookings%ROWTYPE;
  v_note TEXT := NULLIF(left(btrim(COALESCE(p_note, '')), 500), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  IF p_outcome IS NULL OR p_outcome NOT IN ('clear', 'refund') THEN
    RAISE EXCEPTION 'Choose clear or refund' USING ERRCODE = '22023';
  END IF;

  SELECT pr.* INTO v_pr FROM public.booking_problems pr WHERE pr.id = p_problem_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Problem not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_pr.status <> 'open' THEN
    RAISE EXCEPTION 'This problem is already resolved' USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = v_pr.booking_id FOR UPDATE;

  IF p_outcome = 'refund' THEN
    IF NOT public.refund_booking_payment(v_pr.booking_id) THEN
      RAISE EXCEPTION 'No fare is held for this booking' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.booking_problems pr
     SET status = 'resolved', outcome = p_outcome, resolved_by = v_me,
         resolved_note = v_note, resolved_at = NOW()
   WHERE pr.booking_id = v_pr.booking_id AND pr.status = 'open';

  -- A decision that can move money goes in the audit log, like the other admin actions.
  PERFORM public.record_admin_action(
    'problem.' || p_outcome, 'bookings', v_pr.booking_id::TEXT,
    jsonb_build_object('problem_id', p_problem_id, 'source', v_pr.source, 'kind', v_pr.kind, 'note', v_note)
  );

  IF p_outcome = 'refund' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_b.driver_id, 'system', 'A report was upheld',
            'The fare was refunded to the passenger.',
            jsonb_build_object('booking_id', v_b.id));
  ELSIF v_pr.source = 'passenger' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_b.passenger_id, 'system', 'We looked into your report',
            'We found no problem, so the fare goes to your driver. Disagree? Contact support.',
            jsonb_build_object('booking_id', v_b.id));
  END IF;

  RETURN QUERY SELECT pr.* FROM public.booking_problems pr WHERE pr.id = p_problem_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_no_show(
  p_booking_id UUID,
  p_upheld     BOOLEAN,
  p_note       TEXT DEFAULT NULL
) RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b     public.bookings%ROWTYPE;
  v_terms JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.cancel_tier IS DISTINCT FROM 'no_show' THEN
    RAISE EXCEPTION 'This booking is not a reported no-show' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.payments p
     WHERE p.booking_id = p_booking_id AND p.escrow_status = 'refund_pending'
  ) THEN
    RAISE EXCEPTION 'This no-show is already settled' USING ERRCODE = '22023';
  END IF;

  IF p_upheld THEN
    v_terms := public.cancellation_terms(p_booking_id, 'no_show');
    PERFORM public.settle_cancellation(p_booking_id, v_terms);

    UPDATE public.bookings b
       SET driver_compensation = NULLIF((v_terms->>'driver_gets')::NUMERIC, 0),
           updated_at = NOW()
     WHERE b.id = p_booking_id
    RETURNING * INTO v_b;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES
      (v_b.driver_id, 'payment_success', 'No-show confirmed',
       'KES ' || trim_scale((v_terms->>'driver_gets')::NUMERIC) || ' was added to your Kipita wallet.',
       jsonb_build_object('booking_id', p_booking_id)),
      (v_b.passenger_id, 'system', 'We reviewed your dispute',
       'We could not confirm you were at the pickup, so your fare stays with the driver.',
       jsonb_build_object('booking_id', p_booking_id));
  ELSE
    -- Put the fare back to 'held' so the ordinary refund path can return all of it.
    PERFORM public.close_legacy_refund(p_booking_id);
    UPDATE public.payments
       SET escrow_status = 'held', updated_at = NOW()
     WHERE booking_id = p_booking_id AND escrow_status = 'refund_pending';

    PERFORM public.refund_booking_payment(p_booking_id);

    UPDATE public.bookings b
       SET cancel_tier = 'free',
           cancel_reason = 'No-show report was not upheld',
           updated_at = NOW()
     WHERE b.id = p_booking_id
    RETURNING * INTO v_b;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_b.driver_id, 'system', 'No-show not confirmed',
      'We reviewed the no-show report and refunded the passenger.',
      jsonb_build_object('booking_id', p_booking_id)
    );
  END IF;

  PERFORM public.record_admin_action(
    'no_show.resolve', 'bookings', p_booking_id::TEXT,
    jsonb_build_object('upheld', p_upheld, 'note', p_note)
  );

  RETURN NEXT v_b;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay    INTEGER;
  v_depart INTEGER;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    b.passenger_id,
    'system',
    '10 minutes left to pay',
    COALESCE(t.from_location, 'Your ride') || ' to ' || COALESCE(t.to_location, '') ||
      '. Pay now or the seat goes back on sale.',
    jsonb_build_object(
      'booking_id', b.id,
      'trip_id', b.trip_id,
      'expires_at', b.expires_at,
      'reminder', 'pay'
    )
  FROM public.bookings b
  JOIN public.trips t ON t.id = b.trip_id
  WHERE b.status = 'pending_payment'
    AND b.expires_at > NOW()
    AND b.expires_at <= NOW() + INTERVAL '10 minutes'
  ON CONFLICT (user_id, (data->>'booking_id'), (data->>'reminder')) WHERE data ? 'reminder'
  DO NOTHING;
  GET DIAGNOSTICS v_pay = ROW_COUNT;

  WITH due AS (
    SELECT b.id, b.trip_id, b.passenger_id, b.driver_id, t.from_location, t.to_location,
           to_char(t.departure_date + t.departure_time, 'FMHH12:MI am') AS leaves
      FROM public.bookings b
      JOIN public.trips t ON t.id = b.trip_id
     WHERE b.status = 'confirmed'
       AND (t.departure_date + t.departure_time) AT TIME ZONE 'Africa/Nairobi'
           BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT who.user_id,
         'system',
         'Your ride leaves at ' || d.leaves,
         d.from_location || ' to ' || d.to_location ||
           CASE WHEN who.user_id = d.driver_id
             THEN '. Your passenger has paid and is waiting.'
             ELSE '. Be at the pickup a few minutes early.'
           END,
         jsonb_build_object('booking_id', d.id, 'trip_id', d.trip_id, 'reminder', 'departure')
    FROM due d
    CROSS JOIN LATERAL (VALUES (d.passenger_id), (d.driver_id)) AS who(user_id)
  ON CONFLICT (user_id, (data->>'booking_id'), (data->>'reminder')) WHERE data ? 'reminder'
  DO NOTHING;
  GET DIAGNOSTICS v_depart = ROW_COUNT;

  RETURN v_pay + v_depart;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_cancel_window_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_h  NUMERIC := public.setting_numeric('cancel_free_hours', 12);
  v_grace_m NUMERIC := public.setting_numeric('cancel_grace_minutes', 30);
  v_late_pc NUMERIC := public.setting_numeric('cancel_late_refund_percent', 50);
  v_n       INTEGER;
BEGIN
  WITH due AS (
    SELECT b.id, b.trip_id, b.passenger_id, t.from_location, t.to_location,
           (t.departure_date + t.departure_time) AT TIME ZONE 'Africa/Nairobi'
             - v_free_h::DOUBLE PRECISION * INTERVAL '1 hour' AS closes_at,
           b.paid_at
      FROM public.bookings b
      JOIN public.trips t ON t.id = b.trip_id
     WHERE b.status = 'confirmed'
       AND b.paid_at IS NOT NULL
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT d.passenger_id,
         'system',
         'Free cancellation ends in about an hour',
         d.from_location || ' to ' || d.to_location ||
           '. After that, cancelling returns ' || v_late_pc::INTEGER || '% of the seat price.',
         jsonb_build_object('booking_id', d.id, 'trip_id', d.trip_id, 'reminder', 'free_ends')
    FROM due d
   WHERE d.closes_at BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
     -- the lead cutoff, not the grace period, is what ends the free window
     AND d.paid_at + v_grace_m::DOUBLE PRECISION * INTERVAL '1 minute' <= d.closes_at
  ON CONFLICT (user_id, (data->>'booking_id'), (data->>'reminder')) WHERE data ? 'reminder'
  DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_driver_approval(p_user_id uuid, p_status kyc_status)
 RETURNS kyc_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old   public.kyc_status;
  v_live  INTEGER := 0;
  v_gone  INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT d.approval_status INTO v_old
    FROM public.driver_profiles d WHERE d.user_id = p_user_id;

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'No driver application for that user' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.driver_profiles d
     SET approval_status  = p_status,
         license_verified = (p_status = 'approved'),
         updated_at       = NOW()
   WHERE d.user_id = p_user_id;

  UPDATE public.users u
     SET is_verified = (p_status = 'approved'),
         updated_at  = NOW()
   WHERE u.id = p_user_id;

  IF p_status = 'approved' THEN
    UPDATE public.trips t
       SET status = 'cancelled', updated_at = NOW()
     WHERE t.driver_id = p_user_id
       AND t.status = 'awaiting_approval'
       AND public.trip_departs_at(t.departure_date, t.departure_time) <= NOW();
    GET DIAGNOSTICS v_gone = ROW_COUNT;

    UPDATE public.trips t
       SET status = 'posted', updated_at = NOW()
     WHERE t.driver_id = p_user_id
       AND t.status = 'awaiting_approval';
    GET DIAGNOSTICS v_live = ROW_COUNT;
  ELSIF p_status = 'rejected' THEN
    UPDATE public.trips t
       SET status = 'cancelled', updated_at = NOW()
     WHERE t.driver_id = p_user_id
       AND t.status = 'awaiting_approval';
    GET DIAGNOSTICS v_gone = ROW_COUNT;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'system',
    CASE WHEN p_status = 'approved' THEN 'You are verified' ELSE 'Driver verification update' END,
    CASE
      WHEN p_status = 'approved' AND v_live = 1 THEN 'Your details check out, and your saved ride is now live.'
      WHEN p_status = 'approved' AND v_live > 1 THEN 'Your details check out, and your ' || v_live || ' saved rides are now live.'
      WHEN p_status = 'approved' THEN 'Your details check out. You can publish rides now.'
      ELSE 'We could not verify your details. Open Kipita to send them again.'
    END,
    jsonb_build_object('approval_status', p_status, 'rides_live', v_live, 'rides_cancelled', v_gone)
  );

  PERFORM public.record_admin_action(
    'driver.approval', 'driver_profiles', p_user_id::TEXT,
    jsonb_build_object('from', v_old, 'to', p_status, 'rides_live', v_live, 'rides_cancelled', v_gone)
  );

  RETURN p_status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_cancellation(
  p_booking_id UUID,
  p_terms      JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT := p_terms->>'tier';
  v_pass NUMERIC := COALESCE((p_terms->>'passenger_gets')::NUMERIC, 0);
  v_drv  NUMERIC := COALESCE((p_terms->>'driver_gets')::NUMERIC, 0);
  v_kip  NUMERIC := COALESCE((p_terms->>'kipita_keeps')::NUMERIC, 0);
  v_b    public.bookings%ROWTYPE;
  v_p    public.payments%ROWTYPE;
  v_ref  TEXT;
  v_free NUMERIC := public.setting_numeric('cancel_free_hours', 12);
BEGIN
  IF v_tier IS NULL OR v_tier = 'nothing_held' THEN
    RETURN;
  END IF;

  PERFORM public.close_legacy_refund(p_booking_id);

  IF v_tier IN ('free', 'driver') THEN
    PERFORM public.refund_booking_payment(p_booking_id);
    RETURN;
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT p.* INTO v_p
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status IN ('held', 'refund_pending')
   ORDER BY p.created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF v_p.id IS NULL THEN
    RETURN;
  END IF;

  v_ref := COALESCE(v_b.booking_reference, left(v_b.id::TEXT, 8));

  IF v_pass > 0 THEN
    PERFORM public.credit_wallet(
      v_b.passenger_id, v_pass, 'refund', v_p.id::TEXT || ':part',
      'Part refund for cancelled booking ' || v_ref, v_b.id
    );
  END IF;

  IF v_drv > 0 THEN
    PERFORM public.credit_wallet(
      v_b.driver_id, v_drv, 'payout', v_p.id::TEXT || ':cancel',
      CASE WHEN v_tier = 'no_show'
           THEN 'Passenger did not show up for booking ' || v_ref
           ELSE 'Late cancellation for booking ' || v_ref END,
      v_b.id
    );
  END IF;

  -- Statement line for the passenger, same as release-escrow writes. Moves no money.
  PERFORM public.record_wallet_entry(
    v_b.passenger_id, v_drv + v_kip, 'escrow_release', v_p.id::TEXT,
    CASE WHEN v_tier = 'no_show'
         THEN 'Fare kept after you did not show up for ' || v_ref
         ELSE 'Kept after a late cancellation of ' || v_ref END,
    v_b.id
  );

  UPDATE public.payments p
     SET escrow_status  = 'released',
         platform_fee   = v_kip,
         driver_earning = v_drv,
         refunded_part  = v_pass,
         payout_status  = 'wallet',
         released_at    = NOW(),
         updated_at     = NOW()
   WHERE p.id = v_p.id;

  IF v_tier = 'late' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES
      (v_b.passenger_id, 'system', 'Booking cancelled',
       CASE WHEN v_pass > 0
            THEN 'KES ' || trim_scale(v_pass) || ' is back in your Kipita wallet. The rest of the seat price goes to your driver and the service fee is not refunded, because the ride was less than '
                 || v_free::INTEGER || ' hours away.'
            ELSE 'Because the ride was less than ' || v_free::INTEGER
                 || ' hours away, the seat price went to your driver.' END,
       jsonb_build_object('booking_id', v_b.id, 'amount', v_pass)),
      (v_b.driver_id, 'payment_success', 'Late cancellation',
       'A passenger cancelled less than ' || v_free::INTEGER || ' hours before the ride. KES ' || trim_scale(v_drv)
         || ' was added to your Kipita wallet.',
       jsonb_build_object('booking_id', v_b.id, 'amount', v_drv));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_no_shows()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours NUMERIC := public.setting_numeric('no_show_dispute_hours', 24);
  v_b     public.bookings%ROWTYPE;
  v_terms JSONB;
  v_n     INTEGER := 0;
BEGIN
  FOR v_b IN
    SELECT b.* FROM public.bookings b
     WHERE b.cancel_tier = 'no_show'
       AND b.no_show_marked_at IS NOT NULL
       AND b.no_show_disputed_at IS NULL
       AND b.no_show_marked_at + v_hours::DOUBLE PRECISION * INTERVAL '1 hour' <= NOW()
       AND EXISTS (
         SELECT 1 FROM public.payments p
          WHERE p.booking_id = b.id AND p.escrow_status = 'refund_pending'
       )
     FOR UPDATE OF b SKIP LOCKED
  LOOP
    v_terms := public.cancellation_terms(v_b.id, 'no_show');
    PERFORM public.settle_cancellation(v_b.id, v_terms);

    UPDATE public.bookings b
       SET driver_compensation = NULLIF((v_terms->>'driver_gets')::NUMERIC, 0),
           updated_at = NOW()
     WHERE b.id = v_b.id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES
      (v_b.driver_id, 'payment_success', 'No-show paid',
       'KES ' || trim_scale((v_terms->>'driver_gets')::NUMERIC) || ' was added to your Kipita wallet.',
       jsonb_build_object('booking_id', v_b.id)),
      (v_b.passenger_id, 'system', 'Your fare went to the driver',
       'You did not dispute the no-show report in time, so the seat price went to your driver.',
       jsonb_build_object('booking_id', v_b.id));

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_trip(p_trip_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID;
  v_trip    public.trips%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_count   INTEGER;
  v_waiting INTEGER;
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
    RAISE EXCEPTION 'Only the driver can start this ride' USING ERRCODE = '42501';
  END IF;

  IF v_trip.status = 'in_progress' THEN
    RAISE EXCEPTION 'This ride is already under way' USING ERRCODE = '22023';
  END IF;

  IF v_trip.status NOT IN ('posted', 'active') THEN
    RAISE EXCEPTION 'This ride can no longer be started' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.trips t
     WHERE t.driver_id = v_me AND t.status = 'in_progress' AND t.id <> p_trip_id
  ) THEN
    RAISE EXCEPTION 'You already have a ride under way.' USING ERRCODE = '55006';
  END IF;

  -- Every paid passenger must be on board, or reported as a no-show (a no-show is no longer "confirmed").
  SELECT COUNT(*) INTO v_waiting
    FROM public.bookings b
   WHERE b.trip_id = p_trip_id
     AND b.status = 'confirmed'
     AND b.boarded_at IS NULL;

  IF v_waiting > 0 THEN
    RAISE EXCEPTION '% still to board.', CASE WHEN v_waiting = 1 THEN '1 passenger' ELSE v_waiting || ' passengers' END
      USING ERRCODE = 'KP005';
  END IF;

  FOR v_booking IN
    SELECT b.* FROM public.bookings b
     WHERE b.trip_id = p_trip_id
       AND b.status IN ('requested', 'pending_payment')
     FOR UPDATE
  LOOP
    IF v_booking.status = 'pending_payment' THEN
      PERFORM public.release_seats(p_trip_id, v_booking.seats_booked);
    END IF;

    UPDATE public.bookings b
       SET status = 'cancelled',
           cancel_reason = 'The ride left before this seat was paid for.',
           expires_at = NULL,
           updated_at = NOW()
     WHERE b.id = v_booking.id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_booking.passenger_id,
      'system',
      'That ride has left',
      v_trip.from_location || ' to ' || v_trip.to_location ||
        ' started before your seat was paid for, so it was released. ' ||
        'Nothing was charged.',
      jsonb_build_object('trip_id', p_trip_id)
    );
  END LOOP;

  UPDATE public.trips t SET status = 'in_progress', updated_at = NOW()
   WHERE t.id = p_trip_id;

  WITH moved AS (
    UPDATE public.bookings b
       SET status = 'in_progress', updated_at = NOW()
     WHERE b.trip_id = p_trip_id AND b.status = 'confirmed'
    RETURNING b.*
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    m.passenger_id,
    'trip_started',
    'Your ride has started',
    v_trip.from_location || ' to ' || v_trip.to_location ||
      ' is under way. Something wrong? Report a problem on your booking.',
    jsonb_build_object('booking_id', m.id, 'trip_id', p_trip_id)
  FROM moved m;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;
