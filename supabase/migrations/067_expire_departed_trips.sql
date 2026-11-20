-- 067_expire_departed_trips.sql
-- A ride that has left no longer stays open, and nothing leaves it "posted" forever.
--
-- Until now a ride past its departure date was only hidden from the search lists. It stayed "posted",
-- it could still be booked from a saved link (request_seat only checked the status), and on 20 Nov
-- 2026 473 of the 491 posted rides were already in the past. Two changes:
--
--   1. request_seat refuses a ride whose departure time has passed (Kenya time, like the reminders in
--      060). The error keeps SQLSTATE 22023, which the web and mobile apps already show as "this ride
--      is no longer taking bookings".
--
--   2. expire_departed_trips(), run every 10 minutes, closes rides that left more than
--      platform_settings.trip_expiry_grace_hours ago (default 3) and have nobody on board:
--        - a ride with a paid, held or running booking (pending_payment, confirmed, in_progress) is
--          left alone: the journey, no-show and hold-expiry code owns it
--        - requests nobody answered are declined, the same outcome as the driver saying no, and the
--          passenger is told nothing was charged (nothing had been)
--        - the ride is set to "cancelled", the closest existing status. This does not count against
--          the driver: driver cancellations are only recorded by cancel_trip.
--      Rides still awaiting driver approval are closed the same way once their date has passed.
--
-- Safe to run more than once.

BEGIN;

-- ── The moment a ride leaves, in Kenya time ──────────────────────────────────
-- departure_date and departure_time are stored without a zone and mean Kenya time. A ride with no time
-- is treated as open until the end of its day.
CREATE OR REPLACE FUNCTION public.trip_departs_at(p_date DATE, p_time TIME)
RETURNS TIMESTAMPTZ
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_date + COALESCE(p_time, TIME '23:59:59')) AT TIME ZONE 'Africa/Nairobi'
$$;

REVOKE ALL ON FUNCTION public.trip_departs_at(DATE, TIME) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trip_departs_at(DATE, TIME) TO service_role;

-- ── 1. No new requests on a ride that has left ───────────────────────────────
-- Same body as before, plus the departure check after the status check.
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

-- ── 2. Close rides that have left ────────────────────────────────────────────
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

REVOKE ALL ON FUNCTION public.expire_departed_trips() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_departed_trips() TO service_role;

-- ── 3. Run it every 10 minutes ───────────────────────────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname = 'kipita-expire-departed-trips';

  PERFORM cron.schedule(
    'kipita-expire-departed-trips',
    '*/10 * * * *',
    'SELECT public.expire_departed_trips()'
  );
END $$;

COMMIT;
