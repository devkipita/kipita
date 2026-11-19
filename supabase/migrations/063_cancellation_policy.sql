-- 063_cancellation_policy.sql
-- Cancellation rule for paid bookings, replacing "every cancellation refunds in full".
--
-- Passenger cancels
--   Nothing held (request not accepted, or accepted but unpaid)  nothing is charged.
--   Free window: from paying until the LATER of
--       cancel_grace_minutes after paying,  and  cancel_free_hours before departure.
--     Everything goes back to the passenger's wallet, fee included.
--   After the free window, up to departure ("late")
--     cancel_late_refund_percent of the seat price goes back. The rest goes to the driver's
--     wallet. Kipita keeps its fee.
--   No-show: the driver marks it once no_show_wait_minutes have passed after departure. The
--     fare is parked (escrow_status = 'refund_pending'). If the passenger does not dispute it
--     within no_show_dispute_hours, the driver gets the seat price and Kipita keeps its fee. A
--     dispute holds the money until an admin decides (resolve_no_show).
-- Driver cancels (one booking, or the whole ride)
--     The passenger always gets everything back. A cancellation with a paid passenger inside
--     the free window is recorded as a late driver cancellation in driver_cancellations, and
--     the second one in 30 days sends the driver a warning. Suspension is still an admin step.
--
-- The rule is specified in packages/shared/src/cancellation.ts and tested there. If you change
-- the numbers or the tiers, change both.
--
-- Also adds a reminder sent to the passenger about an hour before free cancellation closes.
--
-- Run after 062. Safe to run more than once. Test on a Supabase branch or a restored backup
-- before production: none of this has been executed against a database yet.

BEGIN;

-- ── Settings ─────────────────────────────────────────────────────────────────

INSERT INTO public.platform_settings (key, value, label, is_public) VALUES
  ('cancel_free_hours',          '12'::jsonb, 'Free cancellation closes this many hours before departure', TRUE),
  ('cancel_grace_minutes',       '30'::jsonb, 'Minutes after paying when a passenger can always cancel free', TRUE),
  ('cancel_late_refund_percent', '50'::jsonb, 'Share of the seat price returned when a passenger cancels after the free window', TRUE),
  ('no_show_wait_minutes',       '15'::jsonb, 'Minutes after departure before a driver can mark a passenger as a no-show', TRUE),
  ('no_show_dispute_hours',      '24'::jsonb, 'Hours a passenger has to dispute a no-show before the driver is paid', TRUE)
ON CONFLICT (key) DO NOTHING;

-- A value saved from the admin console before this ran would have been stored as not public.
UPDATE public.platform_settings
   SET is_public = TRUE
 WHERE key IN ('cancel_free_hours', 'cancel_grace_minutes', 'cancel_late_refund_percent',
               'no_show_wait_minutes', 'no_show_dispute_hours');

-- ── Columns ──────────────────────────────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_by         UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS cancel_tier          TEXT,
  ADD COLUMN IF NOT EXISTS driver_compensation  NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS no_show_marked_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_disputed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_dispute_note TEXT;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_cancel_tier_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_cancel_tier_check
  CHECK (cancel_tier IS NULL OR cancel_tier IN ('nothing_held', 'free', 'late', 'no_show', 'driver'));

COMMENT ON COLUMN public.bookings.cancel_tier IS
  'How the cancellation was settled: nothing_held, free (all back), late (part back), no_show, driver (all back).';
COMMENT ON COLUMN public.bookings.driver_compensation IS
  'What the driver was paid because the passenger cancelled late or did not show up.';

-- The part of a payment that went back to the passenger when the rest was released to the driver.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunded_part NUMERIC(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.payments.refunded_part IS
  'Returned to the passenger on a late cancellation. amount = refunded_part + driver_earning + platform_fee.';

CREATE TABLE IF NOT EXISTS public.driver_cancellations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID NOT NULL REFERENCES public.users(id),
  trip_id     UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  booking_id  UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  paid_bookings INTEGER NOT NULL DEFAULT 1,
  late        BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_cancellations_driver
  ON public.driver_cancellations (driver_id, created_at DESC);

ALTER TABLE public.driver_cancellations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers read own cancellations" ON public.driver_cancellations;
CREATE POLICY "Drivers read own cancellations" ON public.driver_cancellations
  FOR SELECT USING (driver_id = public.current_app_user_id() OR public.is_admin());

GRANT SELECT ON public.driver_cancellations TO authenticated;

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- Departure as a point in time. Rides are entered in Nairobi time (same as send_booking_reminders).
CREATE OR REPLACE FUNCTION public.trip_departs_at(p_trip_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (t.departure_date + t.departure_time) AT TIME ZONE 'Africa/Nairobi'
    FROM public.trips t
   WHERE t.id = p_trip_id
$$;

REVOKE ALL ON FUNCTION public.trip_departs_at(UUID) FROM PUBLIC, anon, authenticated;

-- What a cancellation would do, without doing it. Mirrors quoteCancellation() in
-- packages/shared/src/cancellation.ts. p_mode is 'passenger', 'driver' or 'no_show'.
CREATE OR REPLACE FUNCTION public.cancellation_terms(
  p_booking_id UUID,
  p_mode       TEXT,
  p_now        TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b        public.bookings%ROWTYPE;
  v_p        public.payments%ROWTYPE;
  v_departs  TIMESTAMPTZ;
  v_free_h   NUMERIC := public.setting_numeric('cancel_free_hours', 12);
  v_grace_m  NUMERIC := public.setting_numeric('cancel_grace_minutes', 30);
  v_late_pc  NUMERIC := public.setting_numeric('cancel_late_refund_percent', 50);
  v_paid_at  TIMESTAMPTZ;
  v_until    TIMESTAMPTZ;
  v_seat     NUMERIC;
  v_fee      NUMERIC;
  v_total    NUMERIC;
  v_back     NUMERIC;
  v_tier     TEXT;
  v_pass     NUMERIC := 0;
  v_drv      NUMERIC := 0;
  v_kip      NUMERIC := 0;
  v_late_drv BOOLEAN := FALSE;
BEGIN
  IF p_mode NOT IN ('passenger', 'driver', 'no_show') THEN
    RAISE EXCEPTION 'Unknown cancellation mode %', p_mode USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  v_departs := public.trip_departs_at(v_b.trip_id);

  -- A fare parked for a no-show is 'refund_pending'; an ordinary held fare is 'held'.
  SELECT p.* INTO v_p
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status IN ('held', 'refund_pending')
   ORDER BY p.created_at DESC
   LIMIT 1;

  IF v_p.id IS NULL THEN
    RETURN jsonb_build_object(
      'tier', 'nothing_held', 'mode', p_mode,
      'passenger_gets', 0, 'driver_gets', 0, 'kipita_keeps', 0,
      'free_until', NULL, 'late_for_driver', FALSE, 'departs_at', v_departs
    );
  END IF;

  v_total := v_p.amount;
  IF v_p.driver_earning > 0 THEN
    v_seat := v_p.driver_earning;
    v_fee  := v_p.platform_fee;
  ELSE
    -- Older payments without a stored split: same fallback release-escrow uses.
    v_fee  := ROUND(v_total * COALESCE(NULLIF(v_p.fee_percent, 0),
                                       public.setting_numeric('platform_fee_percent', 12)) / 100, 2);
    v_seat := v_total - v_fee;
  END IF;

  v_paid_at := COALESCE(v_p.paid_at, v_p.held_at, v_b.paid_at, v_p.created_at);
  v_until := GREATEST(
    v_paid_at + v_grace_m::DOUBLE PRECISION * INTERVAL '1 minute',
    v_departs - v_free_h::DOUBLE PRECISION * INTERVAL '1 hour'
  );

  IF p_mode = 'driver' THEN
    v_tier := 'driver';
    v_pass := v_total;
    v_late_drv := p_now > v_until;
  ELSIF p_mode = 'no_show' THEN
    v_tier := 'no_show';
    v_drv := v_seat;
    v_kip := v_fee;
  ELSIF p_now <= v_until THEN
    v_tier := 'free';
    v_pass := v_total;
  ELSE
    v_tier := 'late';
    v_back := LEAST(v_seat, ROUND(v_seat * v_late_pc / 100));
    v_pass := v_back;
    v_drv := v_seat - v_back;
    v_kip := v_fee;
  END IF;

  RETURN jsonb_build_object(
    'tier', v_tier, 'mode', p_mode,
    'passenger_gets', v_pass, 'driver_gets', v_drv, 'kipita_keeps', v_kip,
    'free_until', v_until, 'late_for_driver', v_late_drv, 'departs_at', v_departs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancellation_terms(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

-- Moves the money for a cancellation, as decided by cancellation_terms().
-- 'free' and 'driver' go through refund_booking_payment (everything back, same as before).
-- 'late' and 'no_show' split the fare: part to the passenger, part to the driver, fee kept.
CREATE OR REPLACE FUNCTION public.settle_cancellation(
  p_booking_id UUID,
  p_terms      JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT := p_terms->>'tier';
  v_pass NUMERIC := COALESCE((p_terms->>'passenger_gets')::NUMERIC, 0);
  v_drv  NUMERIC := COALESCE((p_terms->>'driver_gets')::NUMERIC, 0);
  v_kip  NUMERIC := COALESCE((p_terms->>'kipita_keeps')::NUMERIC, 0);
  v_b    public.bookings%ROWTYPE;
  v_p    public.payments%ROWTYPE;
  v_ref  TEXT;
  v_free NUMERIC := public.setting_numeric('cancel_free_hours', 12);
BEGIN
  IF v_tier IS NULL OR v_tier = 'nothing_held' THEN
    RETURN;
  END IF;

  IF v_tier IN ('free', 'driver') THEN
    PERFORM public.refund_booking_payment(p_booking_id);
    RETURN;
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT p.* INTO v_p
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status IN ('held', 'refund_pending')
   ORDER BY p.created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF v_p.id IS NULL THEN
    RETURN;
  END IF;

  v_ref := COALESCE(v_b.booking_reference, left(v_b.id::TEXT, 8));

  IF v_pass > 0 THEN
    PERFORM public.credit_wallet(
      v_b.passenger_id, v_pass, 'refund', v_p.id::TEXT || ':part',
      'Part refund for cancelled booking ' || v_ref, v_b.id
    );
  END IF;

  IF v_drv > 0 THEN
    PERFORM public.credit_wallet(
      v_b.driver_id, v_drv, 'payout', v_p.id::TEXT || ':cancel',
      CASE WHEN v_tier = 'no_show'
           THEN 'Passenger did not show up for booking ' || v_ref
           ELSE 'Late cancellation for booking ' || v_ref END,
      v_b.id
    );
  END IF;

  -- Statement line for the passenger, same as release-escrow writes. Moves no money.
  PERFORM public.record_wallet_entry(
    v_b.passenger_id, v_drv + v_kip, 'escrow_release', v_p.id::TEXT,
    CASE WHEN v_tier = 'no_show'
         THEN 'Fare kept after you did not show up for ' || v_ref
         ELSE 'Kept after a late cancellation of ' || v_ref END,
    v_b.id
  );

  UPDATE public.payments p
     SET escrow_status  = 'released',
         platform_fee   = v_kip,
         driver_earning = v_drv,
         refunded_part  = v_pass,
         payout_status  = 'wallet',
         released_at    = NOW(),
         updated_at     = NOW()
   WHERE p.id = v_p.id;

  IF v_tier = 'late' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES
      (v_b.passenger_id, 'system', 'Booking cancelled',
       CASE WHEN v_pass > 0
            THEN 'KES ' || trim_scale(v_pass) || ' is back in your Kipita wallet. The rest went to your driver because the ride was less than '
                 || v_free::INTEGER || ' hours away.'
            ELSE 'Because the ride was less than ' || v_free::INTEGER
                 || ' hours away, the seat price went to your driver.' END,
       jsonb_build_object('booking_id', v_b.id, 'amount', v_pass)),
      (v_b.driver_id, 'payment_success', 'Late cancellation',
       'A passenger cancelled less than ' || v_free::INTEGER || ' hours before the ride. KES ' || trim_scale(v_drv)
         || ' was added to your Kipita wallet.',
       jsonb_build_object('booking_id', v_b.id, 'amount', v_drv));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_cancellation(UUID, JSONB) FROM PUBLIC, anon, authenticated;

-- ── Driver cancellation record ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.record_driver_cancellation(
  p_driver_id UUID,
  p_trip_id   UUID,
  p_booking_id UUID,
  p_paid      INTEGER,
  p_late      BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_late_count INTEGER;
BEGIN
  -- Cancelling a ride nobody paid for harms nobody.
  IF COALESCE(p_paid, 0) <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.driver_cancellations (driver_id, trip_id, booking_id, paid_bookings, late)
  VALUES (p_driver_id, p_trip_id, p_booking_id, p_paid, p_late);

  IF p_late THEN
    SELECT count(*) INTO v_late_count
      FROM public.driver_cancellations c
     WHERE c.driver_id = p_driver_id
       AND c.late
       AND c.created_at >= NOW() - INTERVAL '30 days';

    IF v_late_count >= 2 THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        p_driver_id, 'system', 'Late cancellations',
        'You have cancelled paid rides at short notice ' || v_late_count
          || ' times in the last 30 days. Passengers rely on these rides, and repeated late cancellations can lead to your account being paused.',
        jsonb_build_object('late_cancellations', v_late_count)
      );
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_driver_cancellation(UUID, UUID, UUID, INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.driver_late_cancels(p_driver_id UUID, p_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::INTEGER
    FROM public.driver_cancellations c
   WHERE c.driver_id = p_driver_id
     AND c.late
     AND c.created_at >= NOW() - make_interval(days => GREATEST(p_days, 1))
$$;

REVOKE ALL ON FUNCTION public.driver_late_cancels(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.driver_late_cancels(UUID, INTEGER) TO authenticated;

-- ── What the screen shows before cancelling ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancellation_quote(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := public.current_app_user_id();
  v_b  public.bookings%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.passenger_id <> v_me AND v_b.driver_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  RETURN public.cancellation_terms(
    p_booking_id,
    CASE WHEN v_b.driver_id = v_me THEN 'driver' ELSE 'passenger' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancellation_quote(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancellation_quote(UUID) TO authenticated;

-- ── cancel_booking ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_reason     TEXT DEFAULT NULL
) RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID;
  v_b     public.bookings%ROWTYPE;
  v_mode  TEXT;
  v_terms JSONB;
  v_pass  NUMERIC;
  v_drv   NUMERIC;
BEGIN
  v_me := public.current_app_user_id();

  SELECT b.* INTO v_b FROM public.bookings b
   WHERE b.id = p_booking_id FOR UPDATE;

  IF v_b.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_b.passenger_id <> v_me AND v_b.driver_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  IF v_b.status IN ('completed', 'cancelled', 'rejected') THEN
    RAISE EXCEPTION 'This booking is already closed' USING ERRCODE = '22023';
  END IF;

  v_mode := CASE WHEN v_b.driver_id = v_me THEN 'driver' ELSE 'passenger' END;

  -- A passenger cannot walk away from a ride that is under way.
  IF v_mode = 'passenger' AND v_b.status = 'in_progress' THEN
    RAISE EXCEPTION 'This ride is under way' USING ERRCODE = 'KP001';
  END IF;

  v_terms := public.cancellation_terms(p_booking_id, v_mode);
  v_pass := COALESCE((v_terms->>'passenger_gets')::NUMERIC, 0);
  v_drv  := COALESCE((v_terms->>'driver_gets')::NUMERIC, 0);

  IF v_b.status IN ('pending_payment', 'confirmed', 'in_progress') THEN
    PERFORM public.release_seats(v_b.trip_id, v_b.seats_booked);
  END IF;

  PERFORM public.settle_cancellation(p_booking_id, v_terms);

  UPDATE public.bookings b
     SET status = 'cancelled',
         cancel_reason = p_reason,
         cancelled_by = v_me,
         cancel_tier = v_terms->>'tier',
         driver_compensation = NULLIF(v_drv, 0),
         -- A full refund is stamped by trg_payments_stamp_refund. A part refund is stamped here.
         refunded_amount = CASE WHEN v_terms->>'tier' = 'late' AND v_pass > 0 THEN v_pass ELSE b.refunded_amount END,
         refunded_at     = CASE WHEN v_terms->>'tier' = 'late' AND v_pass > 0 THEN NOW() ELSE b.refunded_at END,
         refund_to       = CASE WHEN v_terms->>'tier' = 'late' AND v_pass > 0 THEN 'wallet' ELSE b.refund_to END,
         expires_at = NULL,
         updated_at = NOW()
   WHERE b.id = p_booking_id
  RETURNING * INTO v_b;

  IF v_mode = 'driver' THEN
    PERFORM public.record_driver_cancellation(
      v_b.driver_id, v_b.trip_id, v_b.id,
      CASE WHEN v_terms->>'tier' = 'nothing_held' THEN 0 ELSE 1 END,
      COALESCE((v_terms->>'late_for_driver')::BOOLEAN, FALSE)
    );
  END IF;

  RETURN NEXT v_b;
END;
$$;

-- ── cancel_trip ──────────────────────────────────────────────────────────────
-- Same as 044, plus: every booking is settled through the same terms ('driver': all back),
-- and one driver_cancellations row is written when anyone had paid.

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
  v_terms   JSONB;
  v_paid    INTEGER := 0;
  v_late    BOOLEAN := FALSE;
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
    v_terms := public.cancellation_terms(v_booking.id, 'driver');

    IF v_terms->>'tier' <> 'nothing_held' THEN
      v_paid := v_paid + 1;
      v_late := v_late OR COALESCE((v_terms->>'late_for_driver')::BOOLEAN, FALSE);
    END IF;

    PERFORM public.settle_cancellation(v_booking.id, v_terms);

    UPDATE public.bookings b
       SET status = 'cancelled',
           cancel_reason = v_reason,
           cancelled_by = v_me,
           cancel_tier = v_terms->>'tier',
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

  -- An admin stopping a ride does not count against the driver.
  IF v_trip.driver_id = v_me THEN
    PERFORM public.record_driver_cancellation(v_trip.driver_id, p_trip_id, NULL, v_paid, v_late);
  END IF;

  RETURN NEXT v_trip;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_trip(UUID, TEXT) TO authenticated;

-- ── No-show ──────────────────────────────────────────────────────────────────

-- The driver reports that the passenger did not turn up. The fare is parked, not paid.
CREATE OR REPLACE FUNCTION public.mark_no_show(p_booking_id UUID)
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID := public.current_app_user_id();
  v_b       public.bookings%ROWTYPE;
  v_departs TIMESTAMPTZ;
  v_wait    NUMERIC := public.setting_numeric('no_show_wait_minutes', 15);
  v_hours   NUMERIC := public.setting_numeric('no_show_dispute_hours', 24);
  v_paid    UUID;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can report a no-show' USING ERRCODE = '42501';
  END IF;
  IF v_b.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only a paid booking that has not started can be reported' USING ERRCODE = '22023';
  END IF;

  v_departs := public.trip_departs_at(v_b.trip_id);
  IF NOW() < v_departs + v_wait::DOUBLE PRECISION * INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Too early to report a no-show' USING ERRCODE = 'KP002';
  END IF;

  SELECT p.id INTO v_paid
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status = 'held'
   ORDER BY p.created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF v_paid IS NULL THEN
    RAISE EXCEPTION 'No fare is held for this booking' USING ERRCODE = '22023';
  END IF;

  -- Park the fare. Nothing can release or refund it until it is settled or resolved.
  UPDATE public.payments
     SET escrow_status = 'refund_pending', updated_at = NOW()
   WHERE id = v_paid;

  UPDATE public.bookings b
     SET status = 'cancelled',
         cancel_reason = 'The passenger did not show up',
         cancelled_by = v_me,
         cancel_tier = 'no_show',
         no_show_marked_at = NOW(),
         expires_at = NULL,
         updated_at = NOW()
   WHERE b.id = p_booking_id
  RETURNING * INTO v_b;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_b.passenger_id, 'system', 'Your driver says you didn''t show up',
    'If that is wrong, tell us within ' || v_hours::INTEGER
      || ' hours. Otherwise your fare goes to the driver and is not refunded.',
    jsonb_build_object('booking_id', v_b.id, 'no_show', TRUE)
  );

  RETURN NEXT v_b;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_no_show(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_no_show(UUID) TO authenticated;

-- The passenger says the no-show report is wrong. Support decides.
CREATE OR REPLACE FUNCTION public.dispute_no_show(p_booking_id UUID, p_note TEXT)
RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_hours NUMERIC := public.setting_numeric('no_show_dispute_hours', 24);
  v_note  TEXT := left(trim(COALESCE(p_note, '')), 500);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.passenger_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;
  IF v_b.cancel_tier IS DISTINCT FROM 'no_show' OR v_b.no_show_marked_at IS NULL THEN
    RAISE EXCEPTION 'This booking was not reported as a no-show' USING ERRCODE = '22023';
  END IF;
  IF v_b.no_show_disputed_at IS NOT NULL THEN
    RAISE EXCEPTION 'You have already sent this for review' USING ERRCODE = '22023';
  END IF;
  IF NOW() > v_b.no_show_marked_at + v_hours::DOUBLE PRECISION * INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'The time to dispute this has passed' USING ERRCODE = 'KP003';
  END IF;
  IF v_note = '' THEN
    RAISE EXCEPTION 'Say what happened' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings b
     SET no_show_disputed_at = NOW(),
         no_show_dispute_note = v_note,
         updated_at = NOW()
   WHERE b.id = p_booking_id
  RETURNING * INTO v_b;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'system', 'No-show to review',
         'A passenger disputes a no-show report. The fare is on hold until you decide.',
         jsonb_build_object('booking_id', p_booking_id)
    FROM public.users u
   WHERE u.is_admin = TRUE;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES
    (v_b.passenger_id, 'system', 'We are looking into it',
     'Your fare stays on hold while we review this. We will tell you what we decide.',
     jsonb_build_object('booking_id', p_booking_id)),
    (v_b.driver_id, 'system', 'No-show under review',
     'The passenger disputes the no-show report. The fare stays on hold while we review it.',
     jsonb_build_object('booking_id', p_booking_id));

  RETURN NEXT v_b;
END;
$$;

REVOKE ALL ON FUNCTION public.dispute_no_show(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispute_no_show(UUID, TEXT) TO authenticated;

-- An admin decides a disputed no-show. p_upheld = TRUE: the driver is paid. FALSE: the passenger
-- gets everything back.
CREATE OR REPLACE FUNCTION public.resolve_no_show(
  p_booking_id UUID,
  p_upheld     BOOLEAN,
  p_note       TEXT DEFAULT NULL
) RETURNS SETOF public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b     public.bookings%ROWTYPE;
  v_terms JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.cancel_tier IS DISTINCT FROM 'no_show' THEN
    RAISE EXCEPTION 'This booking is not a reported no-show' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.payments p
     WHERE p.booking_id = p_booking_id AND p.escrow_status = 'refund_pending'
  ) THEN
    RAISE EXCEPTION 'This no-show is already settled' USING ERRCODE = '22023';
  END IF;

  IF p_upheld THEN
    v_terms := public.cancellation_terms(p_booking_id, 'no_show');
    PERFORM public.settle_cancellation(p_booking_id, v_terms);

    UPDATE public.bookings b
       SET driver_compensation = NULLIF((v_terms->>'driver_gets')::NUMERIC, 0),
           updated_at = NOW()
     WHERE b.id = p_booking_id
    RETURNING * INTO v_b;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES
      (v_b.driver_id, 'payment_success', 'No-show confirmed',
       'KES ' || trim_scale((v_terms->>'driver_gets')::NUMERIC) || ' was added to your Kipita wallet.',
       jsonb_build_object('booking_id', p_booking_id)),
      (v_b.passenger_id, 'system', 'We reviewed your dispute',
       'We could not confirm you were at the pickup, so your fare stays with the driver.',
       jsonb_build_object('booking_id', p_booking_id));
  ELSE
    -- Put the fare back to 'held' so the ordinary refund path can return all of it.
    UPDATE public.payments
       SET escrow_status = 'held', updated_at = NOW()
     WHERE booking_id = p_booking_id AND escrow_status = 'refund_pending';

    PERFORM public.refund_booking_payment(p_booking_id);

    UPDATE public.bookings b
       SET cancel_tier = 'free',
           cancel_reason = 'No-show report was not upheld',
           updated_at = NOW()
     WHERE b.id = p_booking_id
    RETURNING * INTO v_b;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_b.driver_id, 'system', 'No-show not confirmed',
      'We reviewed the no-show report and refunded the passenger.',
      jsonb_build_object('booking_id', p_booking_id)
    );
  END IF;

  PERFORM public.record_admin_action(
    'no_show.resolve', 'bookings', p_booking_id::TEXT,
    jsonb_build_object('upheld', p_upheld, 'note', p_note)
  );

  RETURN NEXT v_b;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_no_show(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_no_show(UUID, BOOLEAN, TEXT) TO authenticated;

-- Pays the driver for every no-show nobody disputed in time.
CREATE OR REPLACE FUNCTION public.settle_no_shows()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours NUMERIC := public.setting_numeric('no_show_dispute_hours', 24);
  v_b     public.bookings%ROWTYPE;
  v_terms JSONB;
  v_n     INTEGER := 0;
BEGIN
  FOR v_b IN
    SELECT b.* FROM public.bookings b
     WHERE b.cancel_tier = 'no_show'
       AND b.no_show_marked_at IS NOT NULL
       AND b.no_show_disputed_at IS NULL
       AND b.no_show_marked_at + v_hours::DOUBLE PRECISION * INTERVAL '1 hour' <= NOW()
       AND EXISTS (
         SELECT 1 FROM public.payments p
          WHERE p.booking_id = b.id AND p.escrow_status = 'refund_pending'
       )
     FOR UPDATE OF b SKIP LOCKED
  LOOP
    v_terms := public.cancellation_terms(v_b.id, 'no_show');
    PERFORM public.settle_cancellation(v_b.id, v_terms);

    UPDATE public.bookings b
       SET driver_compensation = NULLIF((v_terms->>'driver_gets')::NUMERIC, 0),
           updated_at = NOW()
     WHERE b.id = v_b.id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES
      (v_b.driver_id, 'payment_success', 'No-show paid',
       'KES ' || trim_scale((v_terms->>'driver_gets')::NUMERIC) || ' was added to your Kipita wallet.',
       jsonb_build_object('booking_id', v_b.id)),
      (v_b.passenger_id, 'system', 'Your fare went to the driver',
       'You did not dispute the no-show report in time, so the seat price went to your driver.',
       jsonb_build_object('booking_id', v_b.id));

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_no_shows() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_no_shows() TO service_role;

-- ── Reminder: free cancellation is about to close ────────────────────────────

CREATE OR REPLACE FUNCTION public.send_cancel_window_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_h  NUMERIC := public.setting_numeric('cancel_free_hours', 12);
  v_grace_m NUMERIC := public.setting_numeric('cancel_grace_minutes', 30);
  v_late_pc NUMERIC := public.setting_numeric('cancel_late_refund_percent', 50);
  v_n       INTEGER;
BEGIN
  WITH due AS (
    SELECT b.id, b.trip_id, b.passenger_id, t.from_location, t.to_location,
           (t.departure_date + t.departure_time) AT TIME ZONE 'Africa/Nairobi'
             - v_free_h::DOUBLE PRECISION * INTERVAL '1 hour' AS closes_at,
           b.paid_at
      FROM public.bookings b
      JOIN public.trips t ON t.id = b.trip_id
     WHERE b.status = 'confirmed'
       AND b.paid_at IS NOT NULL
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT d.passenger_id,
         'system',
         'Free cancellation ends in about an hour',
         d.from_location || ' to ' || d.to_location ||
           '. After that, cancelling returns ' || v_late_pc::INTEGER || '% of the seat price.',
         jsonb_build_object('booking_id', d.id, 'trip_id', d.trip_id, 'reminder', 'free_ends')
    FROM due d
   WHERE d.closes_at BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
     -- the lead cutoff, not the grace period, is what ends the free window
     AND d.paid_at + v_grace_m::DOUBLE PRECISION * INTERVAL '1 minute' <= d.closes_at
  ON CONFLICT (user_id, (data->>'booking_id'), (data->>'reminder')) WHERE data ? 'reminder'
  DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.send_cancel_window_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_cancel_window_reminders() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job
   WHERE jobname IN ('kipita-settle-no-shows', 'kipita-cancel-window-reminders');

  PERFORM cron.schedule('kipita-settle-no-shows', '*/10 * * * *', 'SELECT public.settle_no_shows()');
  PERFORM cron.schedule('kipita-cancel-window-reminders', '*/5 * * * *', 'SELECT public.send_cancel_window_reminders()');
END $$;

COMMIT;
