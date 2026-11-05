BEGIN;

CREATE OR REPLACE FUNCTION public.request_seat(
  p_trip_id UUID,
  p_seats   INTEGER
) RETURNS SETOF public.bookings
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

  IF v_trip.seats_available < p_seats THEN
    RAISE EXCEPTION 'Not enough seats left' USING ERRCODE = '53400';
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

  INSERT INTO public.bookings (
    trip_id, passenger_id, driver_id, seats_booked, total_price, status
  ) VALUES (
    p_trip_id, v_me, v_trip.driver_id, p_seats,
    v_trip.price_per_seat * p_seats, 'requested'
  )
  RETURNING * INTO v_booking;

  RETURN NEXT v_booking;
END;
$$;

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

  RETURN NEXT v_booking;
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

  RETURN NEXT v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(
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
BEGIN
  v_me := public.current_app_user_id();

  SELECT b.* INTO v_booking FROM public.bookings b
   WHERE b.id = p_booking_id FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.passenger_id <> v_me AND v_booking.driver_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  IF v_booking.status IN ('completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'This booking is already closed' USING ERRCODE = '22023';
  END IF;

  IF v_booking.status IN ('pending_payment', 'confirmed', 'in_progress') THEN
    PERFORM public.release_seats(v_booking.trip_id, v_booking.seats_booked);
  END IF;

  UPDATE public.bookings b
     SET status = 'cancelled',
         cancel_reason = p_reason,
         expires_at = NULL,
         updated_at = NOW()
   WHERE b.id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN NEXT v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_trip(p_trip_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID;
  v_trip  public.trips%ROWTYPE;
  v_count INTEGER;
BEGIN
  v_me := public.current_app_user_id();

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = p_trip_id FOR UPDATE;

  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_trip.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can start this ride' USING ERRCODE = '42501';
  END IF;

  UPDATE public.trips t SET status = 'in_progress', updated_at = NOW()
   WHERE t.id = p_trip_id;

  WITH moved AS (
    UPDATE public.bookings b
       SET status = 'in_progress', updated_at = NOW()
     WHERE b.trip_id = p_trip_id AND b.status = 'confirmed'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM moved;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_trip(p_trip_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID;
  v_trip  public.trips%ROWTYPE;
  v_count INTEGER;
BEGIN
  v_me := public.current_app_user_id();

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = p_trip_id FOR UPDATE;

  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_trip.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can complete this ride' USING ERRCODE = '42501';
  END IF;

  UPDATE public.trips t SET status = 'completed', updated_at = NOW()
   WHERE t.id = p_trip_id;

  WITH moved AS (
    UPDATE public.bookings b
       SET status = 'completed', updated_at = NOW()
     WHERE b.trip_id = p_trip_id
       AND b.status IN ('confirmed', 'in_progress')
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM moved;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_trip(
  p_from_location  TEXT,
  p_to_location    TEXT,
  p_departure_date DATE,
  p_departure_time TIME,
  p_seats_total    INTEGER,
  p_price_per_seat NUMERIC,
  p_preferences    JSONB DEFAULT '{}'::jsonb,
  p_vehicle_id     UUID  DEFAULT NULL,
  p_pickup_point   TEXT  DEFAULT NULL,
  p_dropoff_point  TEXT  DEFAULT NULL
) RETURNS SETOF public.trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me   UUID;
  v_kyc  public.kyc_status;
  v_trip public.trips%ROWTYPE;
BEGIN
  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT d.approval_status INTO v_kyc
    FROM public.driver_profiles d WHERE d.user_id = v_me;

  IF v_kyc IS NULL OR v_kyc = 'not_submitted' THEN
    RAISE EXCEPTION 'Finish driver verification first' USING ERRCODE = '42501';
  END IF;

  IF p_seats_total < 1 OR p_seats_total > 8 THEN
    RAISE EXCEPTION 'Seats must be between 1 and 8' USING ERRCODE = '22023';
  END IF;

  IF p_price_per_seat <= 0 THEN
    RAISE EXCEPTION 'Fare must be greater than zero' USING ERRCODE = '22023';
  END IF;

  IF (p_departure_date + p_departure_time) < NOW() THEN
    RAISE EXCEPTION 'That departure is in the past' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.trips (
    driver_id, vehicle_id, from_location, to_location,
    departure_date, departure_time, seats_total, seats_available,
    price_per_seat, preferences, pickup_point, dropoff_point, status
  ) VALUES (
    v_me, p_vehicle_id, btrim(p_from_location), btrim(p_to_location),
    p_departure_date, p_departure_time, p_seats_total, p_seats_total,
    p_price_per_seat, COALESCE(p_preferences, '{}'::jsonb),
    p_pickup_point, p_dropoff_point, 'posted'
  )
  RETURNING * INTO v_trip;

  RETURN NEXT v_trip;
END;
$$;

DROP FUNCTION IF EXISTS public.hold_seat(UUID, INTEGER, INTEGER);

REVOKE ALL ON FUNCTION public.request_seat(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_booking(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decline_booking(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_booking(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_trip(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_trip(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_trip(TEXT, TEXT, DATE, TIME, INTEGER, NUMERIC, JSONB, UUID, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_seat(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_booking(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_booking(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_trip(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_trip(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.publish_trip(TEXT, TEXT, DATE, TIME, INTEGER, NUMERIC, JSONB, UUID, TEXT, TEXT) TO authenticated, service_role;

COMMIT;
