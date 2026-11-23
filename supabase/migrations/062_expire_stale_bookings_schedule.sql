-- 062: cancel unpaid seat holds once they run out.
--
-- expire_stale_bookings() already existed but nothing called it, so a
-- pending_payment booking kept its seats forever. This schedules it every
-- minute, the same way 060 schedules send_booking_reminders().
--
-- It cancels pending_payment bookings whose expires_at has passed (cancel
-- reason 'Payment hold expired') and returns their seats. The hold length is
-- platform_settings.hold_minutes, counted from the driver's acceptance.
-- Requests no driver has accepted have no expires_at and are not touched.
--
-- Safe to re-run: any existing job with the same name is replaced.

BEGIN;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
    FROM cron.job
   WHERE jobname = 'kipita-expire-stale-bookings';

  PERFORM cron.schedule(
    'kipita-expire-stale-bookings',
    '* * * * *',
    'SELECT public.expire_stale_bookings()'
  );
END $$;

COMMIT;
