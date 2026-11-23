-- 063_cancellation_policy_down.sql
-- Puts the database back as it was before 063 (cancellation policy). NOT a migration: do not put it in
-- supabase/migrations. Run it by hand, and only if 063 has to be undone.
--
-- Before running:
--   * Redeploy the web app from before the cancellation work first, or its trip and booking screens
--     will ask for columns this script drops.
--   * This deletes the cancellation record (cancel_tier, cancelled_by, driver_compensation, the no-show
--     columns, refunded_part and the whole driver_cancellations table). If any booking has been settled
--     under the new rules, export those columns first.
--   * Do not run it while a no-show is parked (payments.escrow_status = 'refund_pending' with
--     bookings.cancel_tier = 'no_show'). Settle or resolve those first, or that fare is stranded.
--
-- cancel_booking and cancel_trip go back to the 044 bodies below. 044's cancel_booking had no signed-in
-- check, so anyone who knew a booking id could cancel it; anon stays revoked here on purpose (the grants
-- survive CREATE OR REPLACE, and 063 removed anon). The 14 other functions 063 added are dropped.

BEGIN;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job
   WHERE jobname IN ('kipita-settle-no-shows', 'kipita-cancel-window-reminders');
END $$;

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

DROP FUNCTION IF EXISTS public.send_cancel_window_reminders();
DROP FUNCTION IF EXISTS public.settle_no_shows();
DROP FUNCTION IF EXISTS public.resolve_no_show(UUID, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.dispute_no_show(UUID, TEXT);
DROP FUNCTION IF EXISTS public.mark_no_show(UUID);
DROP FUNCTION IF EXISTS public.cancellation_quote(UUID);
DROP FUNCTION IF EXISTS public.driver_late_cancels(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.record_driver_cancellation(UUID, UUID, UUID, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.settle_cancellation(UUID, JSONB);
DROP FUNCTION IF EXISTS public.close_legacy_refund(UUID);
DROP FUNCTION IF EXISTS public.cancellation_terms(UUID, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.trip_departs_at(UUID);

DROP TABLE IF EXISTS public.driver_cancellations;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_cancel_tier_check;
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS cancelled_by,
  DROP COLUMN IF EXISTS cancel_tier,
  DROP COLUMN IF EXISTS driver_compensation,
  DROP COLUMN IF EXISTS no_show_marked_at,
  DROP COLUMN IF EXISTS no_show_disputed_at,
  DROP COLUMN IF EXISTS no_show_dispute_note;
ALTER TABLE public.payments DROP COLUMN IF EXISTS refunded_part;

DELETE FROM public.platform_settings
 WHERE key IN ('cancel_free_hours', 'cancel_grace_minutes', 'cancel_late_refund_percent',
               'no_show_wait_minutes', 'no_show_dispute_hours');

COMMIT;
