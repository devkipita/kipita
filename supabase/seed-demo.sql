-- ════════════════════════════════════════════════════════════════════════
-- seed-demo.sql — a fuller dataset on top of seed.sql.
--
-- seed.sql gives one driver with one silver car, which is enough to prove the
-- app works and not enough to judge it: every ride card renders the same person
-- and the same generated colour. This adds eight drivers with distinctly
-- coloured vehicles across fifteen corridors, so the tonal cards actually vary
-- and the map has arcs worth drawing.
--
-- Run AFTER seed.sql. Idempotent — every insert is guarded.
--
-- All accounts use the same password as seed.sql: KipitaTest123!
-- Development data. Never run against production.
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
      ('a0000001-0000-4000-8000-000000000001'::UUID, 'grace@kipita.test',   'Grace Njeri',    '+254700000011'),
      ('a0000002-0000-4000-8000-000000000002'::UUID, 'peter@kipita.test',   'Peter Otieno',   '+254700000012'),
      ('a0000003-0000-4000-8000-000000000003'::UUID, 'fatuma@kipita.test',  'Fatuma Hassan',  '+254700000013'),
      ('a0000004-0000-4000-8000-000000000004'::UUID, 'samuel@kipita.test',  'Samuel Kiptoo',  '+254700000014'),
      ('a0000005-0000-4000-8000-000000000005'::UUID, 'mercy@kipita.test',   'Mercy Chebet',   '+254700000015'),
      ('a0000006-0000-4000-8000-000000000006'::UUID, 'daniel@kipita.test',  'Daniel Mutiso',  '+254700000016'),
      ('a0000007-0000-4000-8000-000000000007'::UUID, 'aisha@kipita.test',   'Aisha Omar',     '+254700000017'),
      ('b0000001-0000-4000-8000-000000000001'::UUID, 'brian@kipita.test',   'Brian Kamau',    '+254700000021'),
      ('b0000002-0000-4000-8000-000000000002'::UUID, 'lydia@kipita.test',   'Lydia Akinyi',   '+254700000022'),
      ('b0000003-0000-4000-8000-000000000003'::UUID, 'joseph@kipita.test',  'Joseph Maina',   '+254700000023')
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
      'authenticated', 'authenticated',
      v_account.email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_account.full_name),
      NOW(), NOW(),
      '', '', '', ''
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.users
       SET full_name = v_account.full_name,
           phone     = v_account.phone,
           email     = v_account.email
     WHERE auth_id = v_account.id;
  END LOOP;
END $$;

-- Ratings and trip counts, so the cards have something to show.
UPDATE public.users u SET is_verified = v.verified, rating = v.rating, total_trips = v.trips
  FROM (VALUES
    ('a0000001-0000-4000-8000-000000000001'::UUID, TRUE,  4.9, 128),
    ('a0000002-0000-4000-8000-000000000002'::UUID, TRUE,  4.7,  54),
    ('a0000003-0000-4000-8000-000000000003'::UUID, TRUE,  5.0,  31),
    ('a0000004-0000-4000-8000-000000000004'::UUID, FALSE, 4.4,   9),
    ('a0000005-0000-4000-8000-000000000005'::UUID, TRUE,  4.8,  77),
    ('a0000006-0000-4000-8000-000000000006'::UUID, TRUE,  4.6,  42),
    ('a0000007-0000-4000-8000-000000000007'::UUID, FALSE, 4.2,   6),
    ('b0000001-0000-4000-8000-000000000001'::UUID, TRUE,  4.9,  18),
    ('b0000002-0000-4000-8000-000000000002'::UUID, FALSE, 4.5,   3),
    ('b0000003-0000-4000-8000-000000000003'::UUID, TRUE,  4.7,  25)
  ) AS v(auth_id, verified, rating, trips)
 WHERE u.auth_id = v.auth_id;

-- ── Driver profiles ─────────────────────────────────────────────────────
INSERT INTO public.driver_profiles (user_id, license_number, national_id, approval_status, background_check_status)
SELECT u.id, d.licence, d.nat_id, 'approved', 'approved'
  FROM (VALUES
    ('a0000001-0000-4000-8000-000000000001'::UUID, 'DL0110011', '30110011'),
    ('a0000002-0000-4000-8000-000000000002'::UUID, 'DL0220022', '30220022'),
    ('a0000003-0000-4000-8000-000000000003'::UUID, 'DL0330033', '30330033'),
    ('a0000004-0000-4000-8000-000000000004'::UUID, 'DL0440044', '30440044'),
    ('a0000005-0000-4000-8000-000000000005'::UUID, 'DL0550055', '30550055'),
    ('a0000006-0000-4000-8000-000000000006'::UUID, 'DL0660066', '30660066'),
    ('a0000007-0000-4000-8000-000000000007'::UUID, 'DL0770077', '30770077')
  ) AS d(auth_id, licence, nat_id)
  JOIN public.users u ON u.auth_id = d.auth_id
ON CONFLICT (user_id) DO UPDATE
  SET approval_status = 'approved', background_check_status = 'approved';

-- ── Vehicles ────────────────────────────────────────────────────────────
-- Colours are deliberately spread across CAR_COLOR_MAP so the generated
-- tonal card schemes differ visibly from one another.
INSERT INTO public.vehicles (driver_id, make, model, year, color, plate_number, seats_available)
SELECT u.id, v.make, v.model, v.year, v.color, v.plate, v.seats
  FROM (VALUES
    ('a0000001-0000-4000-8000-000000000001'::UUID, 'Toyota',    'Premio',    2019, 'White',  'KDB 441A', 4),
    ('a0000002-0000-4000-8000-000000000002'::UUID, 'Nissan',    'X-Trail',   2017, 'Blue',   'KCX 778B', 5),
    ('a0000003-0000-4000-8000-000000000003'::UUID, 'Mazda',     'Demio',     2018, 'Red',    'KDG 205C', 3),
    ('a0000004-0000-4000-8000-000000000004'::UUID, 'Subaru',    'Forester',  2016, 'Green',  'KCP 913D', 4),
    ('a0000005-0000-4000-8000-000000000005'::UUID, 'Toyota',    'Voxy',      2020, 'Black',  'KDH 654E', 7),
    ('a0000006-0000-4000-8000-000000000006'::UUID, 'Honda',     'Fit',       2018, 'Gold',   'KDC 387F', 3),
    -- seats_available is capped at 8 by vehicles_seats_available_check, so the
    -- Hiace advertises 8 of its seats rather than its full capacity.
    ('a0000007-0000-4000-8000-000000000007'::UUID, 'Toyota',    'Hiace',     2015, 'Maroon', 'KBZ 122G', 8)
  ) AS v(auth_id, make, model, year, color, plate, seats)
  JOIN public.users u ON u.auth_id = v.auth_id
ON CONFLICT (plate_number) DO NOTHING;

-- ── Trips ───────────────────────────────────────────────────────────────
-- Fifteen corridors. Every town name below also exists in towns.json, so each
-- one resolves to real coordinates and draws an arc on the map.
INSERT INTO public.trips (
  driver_id, vehicle_id, from_location, to_location,
  departure_date, departure_time, seats_total, seats_available,
  price_per_seat, preferences, status, description
)
SELECT
  u.id, veh.id, t.from_loc, t.to_loc,
  CURRENT_DATE + t.day_offset, t.depart_at,
  t.seats, t.seats, t.price,
  t.prefs::jsonb, 'posted', t.note
FROM (VALUES
  ('a0000001-0000-4000-8000-000000000001'::UUID, 'Nairobi','Kisumu',   1, TIME '07:00', 4, 1800.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Straight through Nakuru, one stop for tea at Kericho.'),
  ('a0000001-0000-4000-8000-000000000001'::UUID, 'Kisumu', 'Nairobi',  3, TIME '15:30', 4, 1800.00, '{"luggage":true,"pets":false,"silent_ride":true,"music":false}',  'Return leg. Back in the city before nine.'),
  ('a0000002-0000-4000-8000-000000000002'::UUID, 'Nairobi','Eldoret',  1, TIME '06:15', 5, 1600.00, '{"luggage":true,"pets":true,"silent_ride":false,"music":true}',   'Plenty of boot space, pets are fine if crated.'),
  ('a0000002-0000-4000-8000-000000000002'::UUID, 'Eldoret','Kitale',   2, TIME '11:00', 5,  500.00, '{"luggage":true,"pets":true,"silent_ride":false,"music":true}',   'Short hop north, leaving from the town centre.'),
  ('a0000003-0000-4000-8000-000000000003'::UUID, 'Nairobi','Machakos', 1, TIME '17:45', 3,  400.00, '{"luggage":false,"pets":false,"silent_ride":true,"music":false}', 'Evening commute, small car, one bag each please.'),
  ('a0000003-0000-4000-8000-000000000003'::UUID, 'Machakos','Nairobi', 2, TIME '06:30', 3,  400.00, '{"luggage":false,"pets":false,"silent_ride":true,"music":false}', 'Early morning run into town.'),
  ('a0000004-0000-4000-8000-000000000004'::UUID, 'Nairobi','Nanyuki',  2, TIME '08:00', 4, 1300.00, '{"luggage":true,"pets":true,"silent_ride":false,"music":true}',   'Mount Kenya route, 4WD, good for hiking gear.'),
  ('a0000004-0000-4000-8000-000000000004'::UUID, 'Nyeri',  'Nairobi',  4, TIME '14:00', 4,  850.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Coming down from Nyeri, pickup near the market.'),
  ('a0000005-0000-4000-8000-000000000005'::UUID, 'Nairobi','Mombasa',  2, TIME '05:30', 7, 2200.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Van with aircon, overnight bags welcome.'),
  ('a0000005-0000-4000-8000-000000000005'::UUID, 'Mombasa','Malindi',  4, TIME '10:00', 7,  700.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Coast road, stopping at Kilifi on request.'),
  ('a0000006-0000-4000-8000-000000000006'::UUID, 'Nairobi','Naivasha', 1, TIME '09:30', 3,  600.00, '{"luggage":false,"pets":false,"silent_ride":false,"music":true}', 'Down the escarpment, great views, small hatchback.'),
  ('a0000006-0000-4000-8000-000000000006'::UUID, 'Naivasha','Nakuru',  2, TIME '13:15', 3,  350.00, '{"luggage":false,"pets":false,"silent_ride":true,"music":false}', 'Quick lake-to-lake run.'),
  ('a0000007-0000-4000-8000-000000000007'::UUID, 'Nairobi','Garissa',  3, TIME '06:00', 8, 1900.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":false}', 'Matatu-style, leaves when full, plenty of luggage room.'),
  ('a0000007-0000-4000-8000-000000000007'::UUID, 'Nairobi','Meru',     2, TIME '07:45', 8, 1400.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Via Embu, stopping at Chuka.'),
  ('a0000001-0000-4000-8000-000000000001'::UUID, 'Nakuru', 'Kericho',  3, TIME '12:00', 4,  550.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Through the tea country.')
) AS t(auth_id, from_loc, to_loc, day_offset, depart_at, seats, price, prefs, note)
JOIN public.users u    ON u.auth_id = t.auth_id
JOIN public.vehicles veh ON veh.driver_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.trips x
   WHERE x.driver_id = u.id
     AND x.from_location = t.from_loc
     AND x.to_location = t.to_loc
     AND x.departure_date = CURRENT_DATE + t.day_offset
);

-- ── Ride requests ───────────────────────────────────────────────────────
INSERT INTO public.ride_requests (
  passenger_id, from_location, to_location,
  preferred_date, preferred_time, seats_needed, preferences, status
)
SELECT u.id, r.from_loc, r.to_loc, CURRENT_DATE + r.day_offset, r.at_time, r.seats, r.prefs::jsonb, 'pending'
FROM (VALUES
  ('b0000001-0000-4000-8000-000000000001'::UUID, 'Nairobi','Kisumu',   2, TIME '07:00', 2, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}'),
  ('b0000001-0000-4000-8000-000000000001'::UUID, 'Nairobi','Nakuru',   1, TIME '16:30', 1, '{"luggage":false,"pets":false,"silent_ride":true,"music":false}'),
  ('b0000002-0000-4000-8000-000000000002'::UUID, 'Mombasa','Nairobi',  3, TIME '20:00', 3, '{"luggage":true,"pets":false,"silent_ride":false,"music":false}'),
  ('b0000002-0000-4000-8000-000000000002'::UUID, 'Kisumu', 'Kakamega', 1, TIME '09:00', 1, '{"luggage":false,"pets":true,"silent_ride":false,"music":true}'),
  ('b0000003-0000-4000-8000-000000000003'::UUID, 'Nairobi','Embu',     2, TIME '11:30', 2, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}'),
  ('b0000003-0000-4000-8000-000000000003'::UUID, 'Thika',  'Nyeri',    4, TIME '08:15', 1, '{"luggage":false,"pets":false,"silent_ride":true,"music":false}'),
  ('11111111-1111-4111-8111-111111111111'::UUID, 'Nairobi','Naivasha', 1, TIME '07:30', 2, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}'),
  ('11111111-1111-4111-8111-111111111111'::UUID, 'Nairobi','Malindi',  5, TIME '06:00', 1, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}')
) AS r(auth_id, from_loc, to_loc, day_offset, at_time, seats, prefs)
JOIN public.users u ON u.auth_id = r.auth_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.ride_requests x
   WHERE x.passenger_id = u.id
     AND x.from_location = r.from_loc
     AND x.to_location = r.to_loc
     AND x.preferred_date = CURRENT_DATE + r.day_offset
);

-- ── More road alerts ────────────────────────────────────────────────────
INSERT INTO public.announcements (user_id, location, category, content)
SELECT u.id, a.location, a.category::alert_category, a.content
FROM (VALUES
  ('a0000001-0000-4000-8000-000000000001'::UUID, 'Kericho, near the tea estates', 'weather',      'Thick fog from about 6am, visibility under 50 metres. Take it slowly through the bends.'),
  ('a0000002-0000-4000-8000-000000000002'::UUID, 'Salgaa, Nakuru-Eldoret',        'accident',     'Lorry jackknifed across both lanes. Recovery under way, expect long delays.'),
  ('a0000003-0000-4000-8000-000000000003'::UUID, 'Mlolongo weighbridge',          'traffic',      'Queue backed up almost to the junction. Add an hour if you are heading south.'),
  ('a0000005-0000-4000-8000-000000000005'::UUID, 'Mtito Andei',                   'police',       'Speed camera set up just past the service station. Watch the limit.'),
  ('a0000006-0000-4000-8000-000000000006'::UUID, 'Kinungi, Naivasha',             'road_closure', 'Diversion in place for bridge works. Follow the marked detour through the village.'),
  ('a0000007-0000-4000-8000-000000000007'::UUID, 'Thika Road, Roysambu',          'general',      'Matatu strike expected tomorrow morning. Plan an alternative if you commute this way.')
) AS a(auth_id, location, category, content)
JOIN public.users u ON u.auth_id = a.auth_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.announcements x WHERE x.content = a.content
);

-- ── Report ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_users INT; v_drivers INT; v_vehicles INT;
  v_trips INT; v_requests INT; v_alerts INT; v_routes INT;
BEGIN
  SELECT count(*) INTO v_users    FROM public.users;
  SELECT count(*) INTO v_drivers  FROM public.driver_profiles;
  SELECT count(*) INTO v_vehicles FROM public.vehicles;
  SELECT count(*) INTO v_trips    FROM public.trips;
  SELECT count(*) INTO v_requests FROM public.ride_requests;
  SELECT count(*) INTO v_alerts   FROM public.announcements;
  SELECT count(*) INTO v_routes   FROM (
    SELECT DISTINCT from_location, to_location FROM public.trips
    UNION
    SELECT DISTINCT from_location, to_location FROM public.ride_requests
  ) r;
  RAISE NOTICE 'Demo data — % users, % drivers, % vehicles, % trips, % requests, % alerts, % distinct routes.',
    v_users, v_drivers, v_vehicles, v_trips, v_requests, v_alerts, v_routes;
END $$;
