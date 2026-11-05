BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_expiring
  ON public.bookings (expires_at)
  WHERE status = 'pending_payment';

CREATE OR REPLACE FUNCTION public.release_seats(p_trip_id UUID, p_seats INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total     INTEGER;
  v_available INTEGER;
BEGIN
  SELECT t.seats_total, t.seats_available INTO v_total, v_available
    FROM public.trips t WHERE t.id = p_trip_id FOR UPDATE;

  IF v_total IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.trips t
     SET seats_available = LEAST(v_available + p_seats, v_total),
         updated_at = NOW()
   WHERE t.id = p_trip_id;

  RETURN TRUE;
END;
$$;

DROP FUNCTION IF EXISTS public.hold_seat(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.hold_seat(
  p_trip_id   UUID,
  p_seats     INTEGER,
  p_hold_mins INTEGER DEFAULT 30
) RETURNS TABLE (
  id                UUID,
  booking_reference TEXT,
  seats_booked      INTEGER,
  total_price       NUMERIC,
  status            booking_status,
  expires_at        TIMESTAMPTZ,
  was_existing      BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me       UUID;
  v_trip     public.trips%ROWTYPE;
  v_existing public.bookings%ROWTYPE;
  v_booking  public.bookings%ROWTYPE;
BEGIN
  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF p_seats < 1 OR p_seats > 8 THEN
    RAISE EXCEPTION 'Seats must be between 1 and 8' USING ERRCODE = '22023';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = p_trip_id FOR UPDATE;

  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_trip.driver_id = v_me THEN
    RAISE EXCEPTION 'This is your own ride' USING ERRCODE = '42501';
  END IF;

  IF v_trip.status NOT IN ('posted', 'active') THEN
    RAISE EXCEPTION 'This ride is no longer taking bookings' USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO v_existing
    FROM public.bookings b
   WHERE b.trip_id = p_trip_id AND b.passenger_id = v_me;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status = 'pending_payment'
       AND v_existing.expires_at IS NOT NULL
       AND v_existing.expires_at <= NOW() THEN
      PERFORM public.release_seats(p_trip_id, v_existing.seats_booked);
      DELETE FROM public.bookings b WHERE b.id = v_existing.id;
      SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = p_trip_id FOR UPDATE;
    ELSE
      RETURN QUERY SELECT
        v_existing.id,
        v_existing.booking_reference,
        v_existing.seats_booked,
        v_existing.total_price,
        v_existing.status,
        v_existing.expires_at,
        TRUE;
      RETURN;
    END IF;
  END IF;

  IF v_trip.seats_available < p_seats THEN
    RAISE EXCEPTION 'Not enough seats left' USING ERRCODE = '53400';
  END IF;

  UPDATE public.trips t
     SET seats_available = t.seats_available - p_seats,
         updated_at = NOW()
   WHERE t.id = p_trip_id;

  INSERT INTO public.bookings (
    trip_id, passenger_id, driver_id, seats_booked, total_price, status, expires_at
  ) VALUES (
    p_trip_id,
    v_me,
    v_trip.driver_id,
    p_seats,
    v_trip.price_per_seat * p_seats,
    'pending_payment',
    NOW() + make_interval(mins => p_hold_mins)
  )
  RETURNING * INTO v_booking;

  RETURN QUERY SELECT
    v_booking.id,
    v_booking.booking_reference,
    v_booking.seats_booked,
    v_booking.total_price,
    v_booking.status,
    v_booking.expires_at,
    FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row   RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT b.id, b.trip_id, b.seats_booked
      FROM public.bookings b
     WHERE b.status = 'pending_payment'
       AND b.expires_at IS NOT NULL
       AND b.expires_at <= NOW()
     FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_seats(v_row.trip_id, v_row.seats_booked);

    UPDATE public.bookings b
       SET status = 'cancelled',
           cancel_reason = 'Payment hold expired',
           updated_at = NOW()
     WHERE b.id = v_row.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.release_seats(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hold_seat(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_stale_bookings() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.release_seats(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.hold_seat(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_bookings() TO service_role;

COMMIT;
