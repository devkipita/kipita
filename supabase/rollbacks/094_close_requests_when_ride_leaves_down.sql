-- 094 down: puts accept_booking back as it was after 093 and removes the new function and its cron job.
--
-- What is lost: the 5-minute job that closes open requests on rides that have left. Requests that 094
-- already rejected stay rejected (their status is not changed back). Not run.

BEGIN;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname = 'kipita-expire-departed-requests';
END $$;

DROP FUNCTION IF EXISTS public.expire_departed_requests();

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

COMMIT;
