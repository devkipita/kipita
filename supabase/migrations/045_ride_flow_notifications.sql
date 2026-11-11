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
      ' is under way. Your fare stays with Kipita until you arrive.',
    jsonb_build_object('booking_id', m.id, 'trip_id', p_trip_id)
  FROM moved m;

  GET DIAGNOSTICS v_count = ROW_COUNT;

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

  WITH moved AS (
    UPDATE public.bookings b
       SET status = 'completed', updated_at = NOW()
     WHERE b.trip_id = p_trip_id
       AND b.status IN ('confirmed', 'in_progress')
    RETURNING b.*
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    m.passenger_id,
    'trip_completed',
    'You have arrived',
    v_trip.from_location || ' to ' || v_trip.to_location ||
      ' is done. Your fare has been released to your driver. ' ||
      'Rate the trip to help the next passenger.',
    jsonb_build_object('booking_id', m.id, 'trip_id', p_trip_id)
  FROM moved m;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.request_seat(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_booking(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_booking(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_trip(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_trip(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.request_seat(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_booking(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_booking(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_trip(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_trip(UUID) TO authenticated, service_role;

COMMIT;
