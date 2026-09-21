-- ════════════════════════════════════════════════════════════════════════
-- seed.sql — test accounts + mock data for a freshly migrated database.
--
-- Run AFTER `supabase db push`; it needs the full schema (migrations 003-020).
-- Safe to run more than once: every insert is guarded, so re-running tops the
-- data up rather than duplicating it.
--
-- Accounts are written straight into auth.users with `email_confirmed_at` set,
-- because the project requires email confirmation and these inboxes don't
-- exist. The `on_auth_user_created` trigger from migration 001 mirrors each one
-- into public.users automatically.
--
--   passenger  rider@kipita.test    KipitaTest123!
--   driver     driver@kipita.test   KipitaTest123!
--   admin      admin@kipita.test    KipitaTest123!
--
-- These are obviously-fake credentials for a development project. Do not run
-- this against production.
-- ════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── Accounts ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_password TEXT := 'KipitaTest123!';
  v_account  RECORD;
BEGIN
  FOR v_account IN
    SELECT * FROM (VALUES
      ('11111111-1111-4111-8111-111111111111'::UUID, 'rider@kipita.test',  'Amina Wanjiru', '+254700000001'),
      ('22222222-2222-4222-8222-222222222222'::UUID, 'driver@kipita.test', 'James Mwangi',  '+254700000002'),
      ('33333333-3333-4333-8333-333333333333'::UUID, 'admin@kipita.test',  'Kipita Admin',  '+254700000003')
    ) AS t(id, email, full_name, phone)
  LOOP
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      v_account.id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_account.email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_account.full_name),
      NOW(), NOW(),
      '', '', '', ''
    )
    ON CONFLICT (id) DO NOTHING;

    -- The trigger creates the public.users row; fill in the rest.
    UPDATE public.users
       SET full_name = v_account.full_name,
           phone     = v_account.phone,
           email     = v_account.email
     WHERE auth_id = v_account.id;
  END LOOP;
END $$;

UPDATE public.users SET is_admin = TRUE
 WHERE auth_id = '33333333-3333-4333-8333-333333333333';

UPDATE public.users SET is_verified = TRUE, rating = 4.8, total_trips = 63
 WHERE auth_id = '22222222-2222-4222-8222-222222222222';

UPDATE public.users SET is_verified = TRUE, rating = 4.9, total_trips = 12
 WHERE auth_id = '11111111-1111-4111-8111-111111111111';

-- ── Driver profile + vehicle ────────────────────────────────────────────
INSERT INTO public.driver_profiles (user_id, license_number, national_id, approval_status, background_check_status)
SELECT u.id, 'DL0099887', '29887766', 'approved', 'approved'
  FROM public.users u
 WHERE u.auth_id = '22222222-2222-4222-8222-222222222222'
ON CONFLICT (user_id) DO UPDATE
  SET approval_status = 'approved', background_check_status = 'approved';

INSERT INTO public.vehicles (driver_id, make, model, year, color, plate_number, seats_available)
SELECT u.id, 'Toyota', 'Fielder', 2018, 'Silver', 'KDA 123X', 4
  FROM public.users u
 WHERE u.auth_id = '22222222-2222-4222-8222-222222222222'
ON CONFLICT (plate_number) DO NOTHING;

-- ── Trips posted by the driver ──────────────────────────────────────────
INSERT INTO public.trips (
  driver_id, vehicle_id, from_location, to_location,
  departure_date, departure_time, seats_total, seats_available,
  price_per_seat, preferences, status, description
)
SELECT
  d.id,
  v.id,
  t.from_location,
  t.to_location,
  CURRENT_DATE + t.day_offset,
  t.depart_at,
  t.seats,
  t.seats,
  t.price,
  '{"luggage":true,"pets":false,"silent_ride":false,"music":true}'::jsonb,
  'posted',
  t.note
FROM public.users d
JOIN public.vehicles v ON v.driver_id = d.id
CROSS JOIN (VALUES
  ('Nairobi',  'Nakuru',  1, TIME '07:30', 4, 900.00,  'Leaving from Westlands, boot space for one bag each.'),
  ('Nairobi',  'Mombasa', 2, TIME '06:00', 3, 2500.00, 'Non-stop along the A109, one short break at Mtito Andei.'),
  ('Nakuru',   'Kisumu',  3, TIME '09:15', 4, 1200.00, 'Comfortable saloon, aircon, no smoking.'),
  ('Nairobi',  'Nyeri',   1, TIME '16:00', 2, 800.00,  'Evening run after work, meet at Ngara.')
) AS t(from_location, to_location, day_offset, depart_at, seats, price, note)
WHERE d.auth_id = '22222222-2222-4222-8222-222222222222'
  AND NOT EXISTS (
    SELECT 1 FROM public.trips x
     WHERE x.driver_id = d.id
       AND x.from_location = t.from_location
       AND x.to_location = t.to_location
       AND x.departure_date = CURRENT_DATE + t.day_offset
  );

-- ── Ride requests posted by the passenger ───────────────────────────────
INSERT INTO public.ride_requests (
  passenger_id, from_location, to_location,
  preferred_date, preferred_time, seats_needed, preferences, status
)
SELECT
  p.id,
  r.from_location,
  r.to_location,
  CURRENT_DATE + r.day_offset,
  r.at_time,
  r.seats,
  '{"luggage":true,"pets":false,"silent_ride":true,"music":false}'::jsonb,
  'pending'
FROM public.users p
CROSS JOIN (VALUES
  ('Nairobi', 'Eldoret',  2, TIME '08:00', 1),
  ('Thika',   'Nairobi',  1, TIME '06:45', 2)
) AS r(from_location, to_location, day_offset, at_time, seats)
WHERE p.auth_id = '11111111-1111-4111-8111-111111111111'
  AND NOT EXISTS (
    SELECT 1 FROM public.ride_requests x
     WHERE x.passenger_id = p.id
       AND x.from_location = r.from_location
       AND x.to_location = r.to_location
       AND x.preferred_date = CURRENT_DATE + r.day_offset
  );

-- ── Road alerts ─────────────────────────────────────────────────────────
INSERT INTO public.announcements (user_id, location, category, content)
SELECT u.id, a.location, a.category::alert_category, a.content
  FROM public.users u
 CROSS JOIN (VALUES
   ('Mombasa Road, near Cabanas', 'traffic',      'Heavy build-up southbound after the roundabout. Budget an extra 40 minutes.'),
   ('Thika Superhighway, Kasarani', 'police',     'Police check just past the stadium exit. Have your documents ready.'),
   ('Nakuru–Eldoret highway',     'road_closure', 'One lane closed for resurfacing near Salgaa. Traffic is alternating.'),
   ('Waiyaki Way, Kangemi',       'accident',     'Two-car collision on the outbound lane, recovery on the way.'),
   ('Naivasha',                   'weather',      'Heavy rain and poor visibility along the escarpment. Drive slow.')
 ) AS a(location, category, content)
 WHERE u.auth_id = '22222222-2222-4222-8222-222222222222'
   AND NOT EXISTS (
     SELECT 1 FROM public.announcements x WHERE x.content = a.content
   );

-- ── Report ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_trips INT;
  v_requests INT;
  v_alerts INT;
BEGIN
  SELECT count(*) INTO v_trips FROM public.trips;
  SELECT count(*) INTO v_requests FROM public.ride_requests;
  SELECT count(*) INTO v_alerts FROM public.announcements;
  RAISE NOTICE 'Seed complete — % trips, % ride requests, % alerts. Sign in as rider@kipita.test / KipitaTest123!',
    v_trips, v_requests, v_alerts;
END $$;
