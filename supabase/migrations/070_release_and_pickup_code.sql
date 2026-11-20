-- 070_release_and_pickup_code.sql
-- Fares are released by the server, not by the driver's app, and only for passengers who boarded.
--
-- What changes
--   Pickup code   Every booking that becomes "confirmed" (paid, by M-Pesa or wallet) gets a 4-digit
--                 code. The passenger reads it from their booking (my_pickup_code). The driver types
--                 it in (mark_boarded) to mark that passenger as on board. Five wrong codes for one
--                 booking lock code entry (pickup_code_max_tries). Only then can the driver mark that
--                 passenger on board by hand (mark_boarded_manually); before that the database refuses
--                 it, so nobody can skip the code by saying a phone is off. A manual boarding is written
--                 to booking_problems and holds that fare until an admin clears it.
--   Start trip    start_trip refuses while any paid passenger is neither on board nor reported as a
--                 no-show (SQLSTATE KP005). Unpaid requests are still released at start, as before.
--   Complete trip complete_trip no longer says the fare "has been released". It stamps
--                 payments.release_due_at = now + release_window_hours (setting, default 6) for every
--                 boarded passenger. Someone still "confirmed" and not on board when the driver ends
--                 the ride is refunded in full to their wallet and is never paid for.
--   Release       release_due_escrow() runs every 10 minutes (cron job kipita-release-escrow). It
--                 releases a held fare only when: the trip is completed, the booking is completed and
--                 boarded, release_due_at has passed, and no problem is open for the booking. The driver
--                 share is credited to the driver's wallet (the same bookkeeping the release-escrow edge
--                 function did with the B2C secrets unset). Nothing a signed-in user can call releases
--                 money any more. The release-escrow function must be redeployed as a refusal (see the
--                 change to supabase/functions/release-escrow) before the web app drops its calls.
--   Problems      report_problem (passenger, from the moment the ride starts until release_due_at) opens a
--                 booking_problems row and holds the fare. resolve_booking_problem (admin) either clears
--                 it (the fare follows the normal path) or refunds the passenger in full to their wallet.
--   Guards        mark_no_show refuses a passenger who is on board. cancel_booking refuses a passenger who
--                 is on board (KP001).
--
-- New SQLSTATEs: KP004 too many wrong pickup codes, KP005 passengers still waiting to board,
-- KP006 the time to report a problem has passed.
--
-- Not in this file (later migrations): chat and phone numbers opening at payment, the Payouts and
-- Reconciliation screen, the stuck-withdrawal fix.
--
-- Run after 067. Safe to run more than once. Tested end to end on a scratch Postgres 16 on 20 Nov 2026
-- (happy path, wrong-code lockout, manual boarding, release window, report and refund, no-show, the
-- safety nets at complete, who may call what, and a rollback/re-apply cycle). Not yet applied to production.
-- The rollback is supabase/rollbacks/070_release_and_pickup_code_down.sql.

BEGIN;

-- ── Settings ─────────────────────────────────────────────────────────────────

INSERT INTO public.platform_settings (key, value, label, is_public) VALUES
  ('release_window_hours',  '6'::jsonb, 'Hours after a ride is completed before the fare is released to the driver (a problem report stops it)', TRUE),
  ('pickup_code_max_tries', '5'::jsonb, 'Wrong pickup codes a driver can enter for one booking before code entry locks', FALSE)
ON CONFLICT (key) DO NOTHING;

UPDATE public.platform_settings SET is_public = TRUE  WHERE key = 'release_window_hours';
UPDATE public.platform_settings SET is_public = FALSE WHERE key = 'pickup_code_max_tries';

-- ── Columns and tables ───────────────────────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS boarded_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boarded_method TEXT,
  ADD COLUMN IF NOT EXISTS boarded_note   TEXT;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_boarded_method_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_boarded_method_check
  CHECK (boarded_method IS NULL OR boarded_method IN ('code', 'manual', 'legacy'));

COMMENT ON COLUMN public.bookings.boarded_at IS
  'When the driver marked this passenger as on board (by code or by hand).';
COMMENT ON COLUMN public.bookings.boarded_method IS
  'code: passenger gave the pickup code. manual: driver marked them by hand (flagged for review). legacy: ride started before 068.';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS release_due_at TIMESTAMPTZ;

COMMENT ON COLUMN public.payments.release_due_at IS
  'Set when the ride is completed: the fare may be released to the driver from this moment, if no problem is open.';

CREATE INDEX IF NOT EXISTS idx_payments_release_due
  ON public.payments (release_due_at)
  WHERE escrow_status = 'held' AND release_due_at IS NOT NULL;

-- The pickup code lives apart from bookings: the driver can read their bookings, so the code must not
-- sit on that row. Nobody reads this table directly; only the functions below do.
CREATE TABLE IF NOT EXISTS public.booking_pickup_codes (
  booking_id  UUID PRIMARY KEY REFERENCES public.bookings (id) ON DELETE CASCADE,
  code        TEXT NOT NULL CHECK (code ~ '^[0-9]{4}$'),
  wrong_tries INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_pickup_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_pickup_codes FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.booking_problems (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  source        TEXT NOT NULL CHECK (source IN ('passenger', 'manual_board')),
  reported_by   UUID NOT NULL REFERENCES public.users (id),
  kind          TEXT NOT NULL CHECK (kind IN
                  ('never_picked_up', 'not_dropped_off', 'unsafe_driving', 'asked_for_cash', 'other', 'manual_board')),
  note          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  outcome       TEXT CHECK (outcome IS NULL OR outcome IN ('clear', 'refund')),
  resolved_by   UUID REFERENCES public.users (id),
  resolved_note TEXT,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_problems_open
  ON public.booking_problems (booking_id, source) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_booking_problems_open
  ON public.booking_problems (created_at) WHERE status = 'open';

ALTER TABLE public.booking_problems ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_problems FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.booking_problems TO authenticated;

DROP POLICY IF EXISTS "Problems readable by reporter and admins" ON public.booking_problems;
CREATE POLICY "Problems readable by reporter and admins" ON public.booking_problems
  FOR SELECT TO authenticated
  USING (reported_by = (SELECT public.current_app_user_id()) OR public.is_admin());

-- ── Issue a pickup code when a booking is paid ───────────────────────────────
-- Both payment paths (the confirm-payment function and pay_booking_with_wallet) set the booking to
-- "confirmed", so one trigger covers them. gen_random_uuid() draws from the server's strong random source.

CREATE OR REPLACE FUNCTION public.bookings_issue_pickup_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.booking_pickup_codes (booking_id, code)
  VALUES (
    NEW.id,
    lpad(((('x' || substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8))::BIT(32)::BIGINT) % 10000)::TEXT, 4, '0')
  )
  ON CONFLICT (booking_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bookings_issue_pickup_code() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bookings_issue_pickup_code ON public.bookings;
CREATE TRIGGER trg_bookings_issue_pickup_code
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed')
  EXECUTE FUNCTION public.bookings_issue_pickup_code();

-- Paid bookings that already exist and have not started get a code too.
INSERT INTO public.booking_pickup_codes (booking_id, code)
SELECT b.id,
       lpad(((('x' || substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8))::BIT(32)::BIGINT) % 10000)::TEXT, 4, '0')
  FROM public.bookings b
 WHERE b.status = 'confirmed' AND b.boarded_at IS NULL
ON CONFLICT (booking_id) DO NOTHING;

-- ── Boarding ─────────────────────────────────────────────────────────────────

-- Counts of paid passengers on one ride: on board, and still waiting.
CREATE OR REPLACE FUNCTION public.boarding_counts(p_trip_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'boarded', COUNT(*) FILTER (WHERE b.boarded_at IS NOT NULL),
    'waiting', COUNT(*) FILTER (WHERE b.boarded_at IS NULL)
  )
    FROM public.bookings b
   WHERE b.trip_id = p_trip_id AND b.status = 'confirmed'
$$;

REVOKE ALL ON FUNCTION public.boarding_counts(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.boarding_counts(UUID) TO service_role;

-- The passenger's code. Only the passenger sees it, and only until they are marked on board.
CREATE OR REPLACE FUNCTION public.my_pickup_code(p_booking_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := public.current_app_user_id();
  v_b  public.bookings%ROWTYPE;
  v_code TEXT;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id;
  IF NOT FOUND OR v_b.passenger_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  IF v_b.status <> 'confirmed' OR v_b.boarded_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  SELECT pc.code INTO v_code FROM public.booking_pickup_codes pc WHERE pc.booking_id = p_booking_id;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.my_pickup_code(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_pickup_code(UUID) TO authenticated;

-- The driver's boarding list for one ride, and what each boarded passenger will earn them.
CREATE OR REPLACE FUNCTION public.trip_boarding_status(p_trip_id UUID)
RETURNS TABLE (
  booking_id      UUID,
  passenger_id    UUID,
  passenger_name  TEXT,
  seats_booked    INTEGER,
  pickup_location TEXT,
  state           TEXT,
  boarded_method  TEXT,
  code_locked     BOOLEAN,
  driver_earning  NUMERIC,
  no_show_from    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_me     UUID := public.current_app_user_id();
  v_trip   public.trips%ROWTYPE;
  v_max    INTEGER := public.setting_numeric('pickup_code_max_tries', 5)::INTEGER;
  v_wait   NUMERIC := public.setting_numeric('no_show_wait_minutes', 15);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_trip.driver_id <> v_me AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the driver can see this' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT b.id,
         b.passenger_id,
         COALESCE(NULLIF(btrim(u.full_name), ''), 'Passenger'),
         b.seats_booked,
         b.pickup_location,
         CASE WHEN b.status = 'cancelled' AND b.cancel_tier = 'no_show' THEN 'no_show'
              WHEN b.boarded_at IS NOT NULL THEN 'boarded'
              ELSE 'waiting' END,
         b.boarded_method,
         COALESCE(pc.wrong_tries >= v_max, TRUE),
         COALESCE(pay.driver_earning, 0),
         public.trip_departs_at(v_trip.departure_date, v_trip.departure_time)
           + v_wait::DOUBLE PRECISION * INTERVAL '1 minute'
    FROM public.bookings b
    JOIN public.users u ON u.id = b.passenger_id
    LEFT JOIN public.booking_pickup_codes pc ON pc.booking_id = b.id
    LEFT JOIN LATERAL (
      SELECT p.driver_earning
        FROM public.payments p
       WHERE p.booking_id = b.id AND p.status = 'completed'
       ORDER BY p.created_at DESC
       LIMIT 1
    ) pay ON TRUE
   WHERE b.trip_id = p_trip_id
     AND (b.status IN ('confirmed', 'in_progress', 'completed')
          OR (b.status = 'cancelled' AND b.cancel_tier = 'no_show'))
   ORDER BY b.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.trip_boarding_status(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trip_boarding_status(UUID) TO authenticated;

-- The driver types the code the passenger shows. A wrong code is counted and returned, not raised: an
-- exception would roll the count back.
CREATE OR REPLACE FUNCTION public.mark_boarded(p_booking_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me     UUID := public.current_app_user_id();
  v_b      public.bookings%ROWTYPE;
  v_trip   public.trips%ROWTYPE;
  v_pc     public.booking_pickup_codes%ROWTYPE;
  v_max    INTEGER := public.setting_numeric('pickup_code_max_tries', 5)::INTEGER;
  v_code   TEXT := regexp_replace(COALESCE(p_code, ''), '\s', '', 'g');
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can board passengers' USING ERRCODE = '42501';
  END IF;

  IF v_b.boarded_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', TRUE, 'already', TRUE) || public.boarding_counts(v_b.trip_id);
  END IF;

  IF v_b.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only a paid booking can be boarded' USING ERRCODE = '22023';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = v_b.trip_id;
  IF v_trip.status NOT IN ('posted', 'active') THEN
    RAISE EXCEPTION 'This ride has already started' USING ERRCODE = '22023';
  END IF;

  SELECT pc.* INTO v_pc FROM public.booking_pickup_codes pc WHERE pc.booking_id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pickup code. Mark on board by hand.' USING ERRCODE = '22023';
  END IF;

  IF v_pc.wrong_tries >= v_max THEN
    RAISE EXCEPTION 'Code locked. Mark on board by hand.'
      USING ERRCODE = 'KP004';
  END IF;

  IF v_code <> v_pc.code THEN
    UPDATE public.booking_pickup_codes pc
       SET wrong_tries = pc.wrong_tries + 1
     WHERE pc.booking_id = p_booking_id;

    RETURN jsonb_build_object(
      'ok', FALSE,
      'reason', 'wrong_code',
      'tries_left', GREATEST(v_max - v_pc.wrong_tries - 1, 0)
    );
  END IF;

  UPDATE public.bookings b
     SET boarded_at = NOW(), boarded_method = 'code', updated_at = NOW()
   WHERE b.id = p_booking_id;

  RETURN jsonb_build_object('ok', TRUE) || public.boarding_counts(v_b.trip_id);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_boarded(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_boarded(UUID, TEXT) TO authenticated;

-- No code (dead phone, forgotten code). Allowed, written down, and the fare is held until an admin clears it.
CREATE OR REPLACE FUNCTION public.mark_boarded_manually(p_booking_id UUID, p_note TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_trip  public.trips%ROWTYPE;
  v_pc    public.booking_pickup_codes%ROWTYPE;
  v_max   INTEGER := public.setting_numeric('pickup_code_max_tries', 5)::INTEGER;
  v_note  TEXT := left(btrim(COALESCE(p_note, '')), 200);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_b.driver_id <> v_me THEN
    RAISE EXCEPTION 'Only the driver can board passengers' USING ERRCODE = '42501';
  END IF;

  IF v_b.boarded_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', TRUE, 'already', TRUE) || public.boarding_counts(v_b.trip_id);
  END IF;

  IF v_b.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only a paid booking can be boarded' USING ERRCODE = '22023';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = v_b.trip_id;
  IF v_trip.status NOT IN ('posted', 'active') THEN
    RAISE EXCEPTION 'This ride has already started' USING ERRCODE = '22023';
  END IF;

  -- The by-hand route opens only once the code has failed the allowed number of times, or when there is
  -- no code to enter. Otherwise a driver could skip the code by saying the passenger's phone is off.
  SELECT pc.* INTO v_pc FROM public.booking_pickup_codes pc WHERE pc.booking_id = p_booking_id;
  IF FOUND AND v_pc.wrong_tries < v_max THEN
    RAISE EXCEPTION 'Enter the pickup code.' USING ERRCODE = '22023';
  END IF;

  IF v_note = '' THEN
    RAISE EXCEPTION 'Give a reason.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings b
     SET boarded_at = NOW(), boarded_method = 'manual', boarded_note = v_note, updated_at = NOW()
   WHERE b.id = p_booking_id;

  INSERT INTO public.booking_problems (booking_id, source, reported_by, kind, note)
  VALUES (p_booking_id, 'manual_board', v_me, 'manual_board', v_note)
  ON CONFLICT (booking_id, source) WHERE status = 'open' DO NOTHING;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_b.passenger_id, 'system', 'You were marked on board',
    'Your driver did it without your code. Not right? Report a problem on your booking.',
    jsonb_build_object('booking_id', p_booking_id)
  );

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'system', 'Passenger boarded by hand',
         'Fare on hold until you clear it.',
         jsonb_build_object('booking_id', p_booking_id)
    FROM public.users u
   WHERE u.is_admin = TRUE;

  RETURN jsonb_build_object('ok', TRUE) || public.boarding_counts(v_b.trip_id);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_boarded_manually(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_boarded_manually(UUID, TEXT) TO authenticated;

-- ── Start trip: everyone who paid has boarded, or is reported as a no-show ───
-- Same body as 045, plus the boarding check and the reworded passenger message.
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
  v_waiting INTEGER;
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

  -- Every paid passenger must be on board, or reported as a no-show (a no-show is no longer "confirmed").
  SELECT COUNT(*) INTO v_waiting
    FROM public.bookings b
   WHERE b.trip_id = p_trip_id
     AND b.status = 'confirmed'
     AND b.boarded_at IS NULL;

  IF v_waiting > 0 THEN
    RAISE EXCEPTION '% still to board.', CASE WHEN v_waiting = 1 THEN '1 passenger' ELSE v_waiting || ' passengers' END
      USING ERRCODE = 'KP005';
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
      ' is under way. Something wrong? Report a problem on your booking.',
    jsonb_build_object('booking_id', m.id, 'trip_id', p_trip_id)
  FROM moved m;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- ── Complete trip: start the release window, never pay for someone who did not board ──
-- Same body as 045, plus the window, the refund of anyone left "confirmed", and the reworded message.
CREATE OR REPLACE FUNCTION public.complete_trip(p_trip_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me     UUID;
  v_trip   public.trips%ROWTYPE;
  v_count  INTEGER;
  v_hours  NUMERIC := public.setting_numeric('release_window_hours', 6);
  v_left   public.bookings%ROWTYPE;
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

  -- start_trip keeps this from happening. If it ever does, the passenger was not on board: they get
  -- everything back and the driver is not paid for them.
  FOR v_left IN
    SELECT b.* FROM public.bookings b
     WHERE b.trip_id = p_trip_id AND b.status = 'confirmed'
     FOR UPDATE
  LOOP
    PERFORM public.refund_booking_payment(v_left.id);

    UPDATE public.bookings b
       SET status = 'cancelled',
           cancel_reason = 'You were not on board when the ride ended.',
           cancel_tier = 'free',
           expires_at = NULL,
           updated_at = NOW()
     WHERE b.id = v_left.id;
  END LOOP;

  WITH moved AS (
    UPDATE public.bookings b
       SET status = 'completed',
           boarded_at = COALESCE(b.boarded_at, b.started_at, NOW()),
           boarded_method = COALESCE(b.boarded_method, 'legacy'),
           updated_at = NOW()
     WHERE b.trip_id = p_trip_id
       AND b.status = 'in_progress'
    RETURNING b.*
  ),
  windowed AS (
    UPDATE public.payments p
       SET release_due_at = NOW() + v_hours::DOUBLE PRECISION * INTERVAL '1 hour',
           updated_at = NOW()
      FROM moved m
     WHERE p.booking_id = m.id
       AND p.status = 'completed'
       AND p.escrow_status = 'held'
    RETURNING p.booking_id
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    m.passenger_id,
    'trip_completed',
    'You have arrived',
    v_trip.from_location || ' to ' || v_trip.to_location ||
      ' is done. Anything wrong? Report it within ' || trim_scale(v_hours) || ' hours. ' ||
      'Rate the trip to help the next passenger.',
    jsonb_build_object('booking_id', m.id, 'trip_id', p_trip_id)
  FROM moved m;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- ── No-show and cancel: a passenger who is on board is neither ──────────────
-- Same body as 063, plus the boarded check.
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
  IF v_b.boarded_at IS NOT NULL THEN
    RAISE EXCEPTION 'This passenger is already on board' USING ERRCODE = '22023';
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
    'Not right? Tell us within ' || v_hours::INTEGER || ' hours, or your fare goes to the driver.',
    jsonb_build_object('booking_id', v_b.id, 'no_show', TRUE)
  );

  RETURN NEXT v_b;
END;
$$;

-- Same body as 063, plus: a passenger who is on board cannot cancel.
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
  -- Without this, nobody signed in compares as NULL, "Not your booking" never fires, and anyone who
  -- knows a booking id could cancel it. (044 had the same gap.)
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

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

  -- Nor once the driver has marked them on board, even before the driver taps Start.
  IF v_mode = 'passenger' AND v_b.boarded_at IS NOT NULL THEN
    RAISE EXCEPTION 'You are already on board' USING ERRCODE = 'KP001';
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

-- ── Problems ─────────────────────────────────────────────────────────────────

-- The passenger says something went wrong. The fare stays held until an admin decides.
CREATE OR REPLACE FUNCTION public.report_problem(p_booking_id UUID, p_kind TEXT, p_note TEXT)
RETURNS SETOF public.booking_problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_pay   public.payments%ROWTYPE;
  v_row   public.booking_problems%ROWTYPE;
  v_note  TEXT := left(btrim(COALESCE(p_note, '')), 500);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF p_kind IS NULL OR p_kind NOT IN ('never_picked_up', 'not_dropped_off', 'unsafe_driving', 'asked_for_cash', 'other') THEN
    RAISE EXCEPTION 'Pick what went wrong' USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR v_b.passenger_id <> v_me THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  IF v_b.status NOT IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'You can report a problem once your ride has started' USING ERRCODE = '22023';
  END IF;

  SELECT p.* INTO v_pay
    FROM public.payments p
   WHERE p.booking_id = p_booking_id
     AND p.status = 'completed'
     AND p.escrow_status = 'held'
   ORDER BY p.created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The fare for this ride is no longer held' USING ERRCODE = '22023';
  END IF;

  IF v_pay.release_due_at IS NOT NULL AND NOW() > v_pay.release_due_at THEN
    RAISE EXCEPTION 'The time to report a problem has passed' USING ERRCODE = 'KP006';
  END IF;

  IF v_note = '' THEN
    RAISE EXCEPTION 'Say what happened' USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO public.booking_problems (booking_id, source, reported_by, kind, note)
    VALUES (p_booking_id, 'passenger', v_me, p_kind, v_note)
    RETURNING * INTO v_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already reported a problem with this ride' USING ERRCODE = '22023';
  END;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT u.id, 'system', 'Problem reported',
         'Passenger report. Fare on hold until you decide.',
         jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id)
    FROM public.users u
   WHERE u.is_admin = TRUE;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES
    (v_b.passenger_id, 'system', 'We are looking into it',
     'Your fare is on hold. We will tell you what we decide.',
     jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id)),
    (v_b.driver_id, 'system', 'A problem was reported',
     'The fare is on hold while we review it.',
     jsonb_build_object('booking_id', p_booking_id, 'problem_id', v_row.id));

  RETURN NEXT v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.report_problem(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_problem(UUID, TEXT, TEXT) TO authenticated;

-- An admin decides. 'clear': nothing is wrong, the fare follows the normal path (released when the window is
-- over). 'refund': the passenger gets everything back in their wallet. Every open problem on the booking closes.
CREATE OR REPLACE FUNCTION public.resolve_booking_problem(
  p_problem_id UUID,
  p_outcome    TEXT,
  p_note       TEXT DEFAULT NULL
) RETURNS SETOF public.booking_problems
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me   UUID := public.current_app_user_id();
  v_pr   public.booking_problems%ROWTYPE;
  v_b    public.bookings%ROWTYPE;
  v_note TEXT := NULLIF(left(btrim(COALESCE(p_note, '')), 500), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  IF p_outcome IS NULL OR p_outcome NOT IN ('clear', 'refund') THEN
    RAISE EXCEPTION 'Choose clear or refund' USING ERRCODE = '22023';
  END IF;

  SELECT pr.* INTO v_pr FROM public.booking_problems pr WHERE pr.id = p_problem_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Problem not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_pr.status <> 'open' THEN
    RAISE EXCEPTION 'This problem is already resolved' USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = v_pr.booking_id FOR UPDATE;

  IF p_outcome = 'refund' THEN
    IF NOT public.refund_booking_payment(v_pr.booking_id) THEN
      RAISE EXCEPTION 'No fare is held for this booking' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.booking_problems pr
     SET status = 'resolved', outcome = p_outcome, resolved_by = v_me,
         resolved_note = v_note, resolved_at = NOW()
   WHERE pr.booking_id = v_pr.booking_id AND pr.status = 'open';

  IF p_outcome = 'refund' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_b.driver_id, 'system', 'A report was upheld',
            'The fare was refunded to the passenger.',
            jsonb_build_object('booking_id', v_b.id));
  ELSIF v_pr.source = 'passenger' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_b.passenger_id, 'system', 'We looked into your report',
            'We found no problem, so the fare goes to your driver. Disagree? Contact support.',
            jsonb_build_object('booking_id', v_b.id));
  END IF;

  RETURN QUERY SELECT pr.* FROM public.booking_problems pr WHERE pr.id = p_problem_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_booking_problem(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_booking_problem(UUID, TEXT, TEXT) TO authenticated;

-- ── Release ──────────────────────────────────────────────────────────────────

-- Pays the driver's share into their wallet. Called only by the job below.
CREATE OR REPLACE FUNCTION public.release_booking_payment(p_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p    public.payments%ROWTYPE;
  v_b    public.bookings%ROWTYPE;
  v_fee  NUMERIC(10, 2);
  v_earn NUMERIC(10, 2);
  v_ref  TEXT;
BEGIN
  SELECT p.* INTO v_p FROM public.payments p WHERE p.id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR v_p.status <> 'completed' OR v_p.escrow_status <> 'held' THEN
    RETURN FALSE;
  END IF;

  SELECT b.* INTO v_b FROM public.bookings b WHERE b.id = v_p.booking_id FOR UPDATE;
  IF NOT FOUND OR v_b.status <> 'completed' OR v_b.boarded_at IS NULL THEN
    RETURN FALSE;
  END IF;

  v_fee  := v_p.platform_fee;
  v_earn := CASE WHEN v_p.driver_earning > 0 THEN v_p.driver_earning ELSE v_p.amount - v_p.platform_fee END;
  v_ref  := COALESCE(v_b.booking_reference, LEFT(v_b.id::TEXT, 8));

  UPDATE public.payments p
     SET escrow_status = 'released',
         released_at = NOW(),
         driver_earning = v_earn,
         payout_status = 'wallet',
         payout_reference = NULL,
         updated_at = NOW()
   WHERE p.id = v_p.id;

  PERFORM public.credit_wallet(
    v_b.driver_id, v_earn, 'payout', v_p.id::TEXT,
    'Ride earning for ' || v_ref, v_b.id
  );

  PERFORM public.record_wallet_entry(
    v_b.passenger_id, v_p.amount, 'escrow_release', v_p.id::TEXT,
    'Fare released to your driver for ' || v_ref, v_b.id
  );

  PERFORM public.convert_referral(v_b.passenger_id, v_b.id);

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_b.driver_id, 'payment_success', 'Fare released',
    'KES ' || trim_scale(v_earn) || ' was added to your Kipita wallet. Paid out to M-Pesa each morning.',
    jsonb_build_object('booking_id', v_b.id, 'payment_id', v_p.id)
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.release_booking_payment(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_booking_payment(UUID) TO service_role;

-- The only thing that releases money. One bad row does not stop the others.
CREATE OR REPLACE FUNCTION public.release_due_escrow()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_n  INTEGER := 0;
BEGIN
  FOR v_id IN
    SELECT p.id
      FROM public.payments p
      JOIN public.bookings b ON b.id = p.booking_id
      JOIN public.trips t ON t.id = b.trip_id
     WHERE p.status = 'completed'
       AND p.escrow_status = 'held'
       AND p.release_due_at IS NOT NULL
       AND p.release_due_at <= NOW()
       AND b.status = 'completed'
       AND b.boarded_at IS NOT NULL
       AND t.status = 'completed'
       AND NOT EXISTS (
         SELECT 1 FROM public.booking_problems bp
          WHERE bp.booking_id = b.id AND bp.status = 'open'
       )
     ORDER BY p.release_due_at
     FOR UPDATE OF p SKIP LOCKED
  LOOP
    BEGIN
      IF public.release_booking_payment(v_id) THEN
        v_n := v_n + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'release_due_escrow: payment % not released: %', v_id, SQLERRM;
    END;
  END LOOP;

  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.release_due_escrow() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_due_escrow() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'kipita-release-escrow';
  PERFORM cron.schedule('kipita-release-escrow', '*/10 * * * *', 'SELECT public.release_due_escrow()');
END $$;

COMMIT;
