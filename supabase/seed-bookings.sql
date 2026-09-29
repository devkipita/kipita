-- Demo bookings so /trips has something to render in development.
-- Idempotent: re-running it is a no-op.
--
-- Destinations are real Kenyan towns on purpose - the ticket hero resolves its
-- photo from Wikipedia by town name.

DO $$
DECLARE
  v_user  UUID;
  v_email TEXT;
  v_trip  RECORD;
  v_seed  RECORD;
BEGIN
  FOREACH v_email IN ARRAY ARRAY['rider@kipita.test', 'dennistrevor06@gmail.com']
  LOOP
    SELECT id INTO v_user FROM public.users WHERE lower(email) = v_email;
    CONTINUE WHEN v_user IS NULL;

    FOR v_seed IN
      SELECT * FROM (VALUES
        ('Kisumu',   'pending_payment', 1, 0),
        ('Mombasa',  'confirmed',       2, 0),
        ('Nakuru',   'in_progress',     1, 0),
        ('Naivasha', 'completed',       1, 12),
        ('Nyeri',    'completed',       3, 26),
        ('Machakos', 'cancelled',       1, 40)
      ) AS t(dest, status, seats, days_ago)
    LOOP
      SELECT id, driver_id, price_per_seat
        INTO v_trip
        FROM public.trips
       WHERE to_location = v_seed.dest
         AND driver_id <> v_user
       ORDER BY departure_date
       LIMIT 1;

      CONTINUE WHEN v_trip.id IS NULL;

      INSERT INTO public.bookings (
        trip_id, passenger_id, driver_id, seats_booked, total_price,
        status, created_at, updated_at
      )
      VALUES (
        v_trip.id,
        v_user,
        v_trip.driver_id,
        v_seed.seats,
        v_trip.price_per_seat * v_seed.seats,
        v_seed.status::public.booking_status,
        NOW() - (v_seed.days_ago || ' days')::INTERVAL,
        NOW() - (v_seed.days_ago || ' days')::INTERVAL
      )
      ON CONFLICT (trip_id, passenger_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
