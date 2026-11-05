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
  v_clash    RECORD;
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

  SELECT b.id, b.status INTO v_clash
    FROM public.bookings b
   WHERE b.passenger_id = v_me
     AND b.status IN ('requested', 'pending_payment')
   LIMIT 1;

  IF v_clash.id IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a seat waiting. Pay for it or cancel it first.'
      USING ERRCODE = '55006';
  END IF;

  SELECT b.id INTO v_clash
    FROM public.bookings b
   WHERE b.passenger_id = v_me AND b.status = 'in_progress'
   LIMIT 1;

  IF v_clash.id IS NOT NULL THEN
    RAISE EXCEPTION 'You are on a ride right now. Finish it before booking another.'
      USING ERRCODE = '55006';
  END IF;

  SELECT b.id INTO v_clash
    FROM public.bookings b
    JOIN public.trips t ON t.id = b.trip_id
   WHERE b.passenger_id = v_me
     AND b.status = 'confirmed'
     AND t.departure_date = v_trip.departure_date
     AND abs(
           EXTRACT(EPOCH FROM (t.departure_time - v_trip.departure_time))
         ) < 10800
   LIMIT 1;

  IF v_clash.id IS NOT NULL THEN
    RAISE EXCEPTION 'You already have a seat booked around that time.'
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
  v_payment public.payments%ROWTYPE;
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

  SELECT p.* INTO v_payment
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status = 'held'
   ORDER BY p.created_at DESC
   LIMIT 1;

  IF v_payment.id IS NOT NULL THEN
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
      'Your fare is back in your Kipita wallet. You can book another ride now.',
      jsonb_build_object('booking_id', v_booking.id, 'amount', v_payment.amount)
    );
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

COMMIT;
