ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'wallet';

BEGIN;

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

REVOKE ALL ON FUNCTION public.pay_booking_with_wallet(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_booking_with_wallet(UUID) TO authenticated;

COMMIT;
