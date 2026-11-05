-- ═══════════════════════════════════════════════════════════════════
-- A driver could publish a ride and never reach it again. The only read
-- path on /trips is bookings, so a trip nobody has booked was invisible,
-- and there was no transition that closed one. Passengers holding seats
-- on an abandoned ride would wait for a driver who was never coming.
--
-- cancel_trip closes the ride and every live booking on it in one
-- transaction, returning seats and money. The refund body is lifted out
-- of cancel_booking into refund_booking_payment so both paths move money
-- the same way.
--
-- Pilot policy: cancelling is free on both sides. A paid fare returns in
-- full whenever it is cancelled, with no share withheld for the driver.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

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

  PERFORM public.refund_booking_payment(p_booking_id);

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
    PERFORM public.refund_booking_payment(v_booking.id);

    UPDATE public.bookings b
       SET status = 'cancelled',
           cancel_reason = v_reason,
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

  RETURN NEXT v_trip;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_booking_payment(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trip(UUID, TEXT) TO authenticated;

COMMIT;
