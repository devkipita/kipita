BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_reminder
  ON public.notifications (user_id, (data->>'booking_id'), (data->>'reminder'))
  WHERE data ? 'reminder';

CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay    INTEGER;
  v_depart INTEGER;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    b.passenger_id,
    'system',
    '10 minutes left to pay',
    COALESCE(t.from_location, 'Your ride') || ' to ' || COALESCE(t.to_location, '') ||
      '. Pay now or the seat goes back on sale.',
    jsonb_build_object(
      'booking_id', b.id,
      'trip_id', b.trip_id,
      'expires_at', b.expires_at,
      'reminder', 'pay'
    )
  FROM public.bookings b
  JOIN public.trips t ON t.id = b.trip_id
  WHERE b.status = 'pending_payment'
    AND b.expires_at > NOW()
    AND b.expires_at <= NOW() + INTERVAL '10 minutes'
  ON CONFLICT (user_id, (data->>'booking_id'), (data->>'reminder')) WHERE data ? 'reminder'
  DO NOTHING;
  GET DIAGNOSTICS v_pay = ROW_COUNT;

  WITH due AS (
    SELECT b.id, b.trip_id, b.passenger_id, b.driver_id, t.from_location, t.to_location,
           to_char(t.departure_date + t.departure_time, 'FMHH12:MI am') AS leaves
      FROM public.bookings b
      JOIN public.trips t ON t.id = b.trip_id
     WHERE b.status = 'confirmed'
       AND (t.departure_date + t.departure_time) AT TIME ZONE 'Africa/Nairobi'
           BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
  )
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT who.user_id,
         'system',
         'Your ride leaves at ' || d.leaves,
         d.from_location || ' to ' || d.to_location ||
           CASE WHEN who.user_id = d.driver_id
             THEN '. Your passenger has paid and is waiting.'
             ELSE '. Be at the pickup a few minutes early.'
           END,
         jsonb_build_object('booking_id', d.id, 'trip_id', d.trip_id, 'reminder', 'departure')
    FROM due d
    CROSS JOIN LATERAL (VALUES (d.passenger_id), (d.driver_id)) AS who(user_id)
  ON CONFLICT (user_id, (data->>'booking_id'), (data->>'reminder')) WHERE data ? 'reminder'
  DO NOTHING;
  GET DIAGNOSTICS v_depart = ROW_COUNT;

  RETURN v_pay + v_depart;
END;
$$;

REVOKE ALL ON FUNCTION public.send_booking_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_booking_reminders() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'kipita-booking-reminders';
  PERFORM cron.schedule('kipita-booking-reminders', '* * * * *', 'SELECT public.send_booking_reminders()');
END $$;

COMMIT;
