-- 094: a seat request closes when its ride leaves.
--
-- Found on 27 Nov: four requests from 23 Nov were still "open" on rides that left on 24 to 26 Nov, so
-- the driver's list kept saying "Needs your answer". expire_departed_trips only closes requests when it
-- cancels the whole ride, and it skips a ride that has a paid passenger. Those requests were never
-- closed, and accept_booking had no "already left" check, so a driver could still accept one and hold
-- a seat on a ride that was gone.
--
-- 1. expire_departed_requests(): rejects every open request on a ride whose departure has passed, and
--    tells the passenger (same short wording as expire_departed_trips). The ride itself is not touched.
-- 2. accept_booking: refuses a ride that has already left, the same rule request_seat has.
-- 3. A cron job runs the new function every 5 minutes. The first run closes the four old requests.

BEGIN;

-- ── 1. Close open requests on rides that have left ───────────────────────────
CREATE OR REPLACE FUNCTION public.expire_departed_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_n INTEGER;
BEGIN
  WITH declined AS (
    UPDATE public.bookings b
       SET status = 'rejected',
           cancel_reason = 'The ride left before the request was answered.',
           updated_at = NOW()
      FROM public.trips t
     WHERE t.id = b.trip_id
       AND b.status = 'requested'
       AND public.trip_departs_at(t.departure_date, t.departure_time) <= NOW()
    RETURNING b.id, b.passenger_id, b.trip_id, t.from_location, t.to_location
  ), told AS (
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT d.passenger_id,
           'system',
           'That ride has left',
           COALESCE(d.from_location, 'That ride') ||
             CASE WHEN d.to_location IS NULL THEN '' ELSE ' to ' || d.to_location END ||
             '. Nothing was charged.',
           jsonb_build_object('trip_id', d.trip_id, 'booking_id', d.id)
      FROM declined d
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM declined;

  RETURN v_n;
END;
$function$;

REVOKE ALL ON FUNCTION public.expire_departed_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_departed_requests() TO service_role;

-- ── 2. accept_booking: not after the ride has left ───────────────────────────
CREATE OR REPLACE FUNCTION public.accept_booking(
  p_booking_id UUID,
  p_hold_mins  INTEGER DEFAULT 30
) RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF public.trip_departs_at(v_trip.departure_date, v_trip.departure_time) <= NOW() THEN
    RAISE EXCEPTION 'This ride has already left' USING ERRCODE = '22023';
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
    'Seat held',
    COALESCE(v_who, 'Your driver') || ' accepted. Pay within ' || p_hold_mins || ' min.',
    jsonb_build_object(
      'booking_id', v_booking.id,
      'trip_id', v_trip.id,
      'expires_at', v_booking.expires_at
    )
  );

  RETURN NEXT v_booking;
END;
$function$;

-- ── 3. Run the new function every 5 minutes ──────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname = 'kipita-expire-departed-requests';

  PERFORM cron.schedule(
    'kipita-expire-departed-requests',
    '*/5 * * * *',
    'SELECT public.expire_departed_requests()'
  );
END $$;

COMMIT;
