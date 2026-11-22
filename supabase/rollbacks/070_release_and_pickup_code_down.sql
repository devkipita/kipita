-- 070_release_and_pickup_code_down.sql
-- Puts the database back as it was before 070 (server-side release and pickup code). NOT a migration: do not
-- put it in supabase/migrations. Run it by hand, and only if 070 has to be undone.
--
-- Before running:
--   * Redeploy the web app and the release-escrow function from before 070 first. The old web app calls
--     release-escrow after complete_trip; the 070 version of that function refuses every caller, so with the
--     old app on the new function drivers are never paid. With the new app on the rolled-back database the
--     boarding and report-a-problem screens call functions this script drops.
--   * This deletes the pickup codes, the boarding record (bookings.boarded_at, boarded_method, boarded_note),
--     the release window (payments.release_due_at) and every booking_problems row. Export booking_problems
--     first if any report is still open or you need the history.
--   * Fares of completed rides that are still held (escrow_status = 'held' on a completed booking) will not be
--     released by anything after this runs: the old flow released from the driver's app at completion. Release
--     them by hand (release-escrow per booking) or run release_due_escrow() before rolling back, with
--     release_due_at set to now for the ones you want paid.
--   * Do not run it while a booking_problems row is open on a fare you have not decided: the hold is lost.
--
-- start_trip, complete_trip, mark_no_show and cancel_booking go back to the bodies they had before 070
-- (045 for the first two, 063 for the last two). The functions 070 added are dropped.

BEGIN;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'kipita-release-escrow';
END $$;

DROP TRIGGER IF EXISTS trg_bookings_issue_pickup_code ON public.bookings;
DROP FUNCTION IF EXISTS public.bookings_issue_pickup_code();

DROP FUNCTION IF EXISTS public.release_due_escrow();
DROP FUNCTION IF EXISTS public.release_booking_payment(UUID);
DROP FUNCTION IF EXISTS public.resolve_booking_problem(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.report_problem(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.mark_boarded_manually(UUID, TEXT);
DROP FUNCTION IF EXISTS public.mark_boarded(UUID, TEXT);
DROP FUNCTION IF EXISTS public.trip_boarding_status(UUID);
DROP FUNCTION IF EXISTS public.my_pickup_code(UUID);
DROP FUNCTION IF EXISTS public.boarding_counts(UUID);

-- start_trip: the version before 070
CREATE OR REPLACE FUNCTION public.start_trip(p_trip_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- complete_trip: the version before 070
CREATE OR REPLACE FUNCTION public.complete_trip(p_trip_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- mark_no_show: the version before 070
CREATE OR REPLACE FUNCTION public.mark_no_show(p_booking_id uuid)
 RETURNS SETOF bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- cancel_booking: the version before 070
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS SETOF bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

DROP TABLE IF EXISTS public.booking_problems;
DROP TABLE IF EXISTS public.booking_pickup_codes;

DROP INDEX IF EXISTS public.idx_payments_release_due;
ALTER TABLE public.payments DROP COLUMN IF EXISTS release_due_at;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_boarded_method_check;
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS boarded_at,
  DROP COLUMN IF EXISTS boarded_method,
  DROP COLUMN IF EXISTS boarded_note;

DELETE FROM public.platform_settings WHERE key IN ('release_window_hours', 'pickup_code_max_tries');

COMMIT;
