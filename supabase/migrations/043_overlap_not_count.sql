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

  IF EXISTS (
    SELECT 1 FROM public.trips t
     WHERE t.driver_id = v_me AND t.status = 'in_progress' AND t.id <> p_trip_id
  ) THEN
    RAISE EXCEPTION 'You already have a ride under way.' USING ERRCODE = '55006';
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

COMMIT;
