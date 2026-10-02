-- ════════════════════════════════════════════════════════════════════════
-- seed-rides.sql — 20 more available rides for the home "Available rides" list.
--
-- Run AFTER seed.sql and seed-demo.sql: it reuses their approved drivers and
-- vehicles. Idempotent — a ride is skipped if the same driver already has the
-- same route on the same day. Development data. Never run against production.
-- ════════════════════════════════════════════════════════════════════════

INSERT INTO public.trips (
  driver_id, vehicle_id, from_location, to_location,
  departure_date, departure_time, seats_total, seats_available,
  price_per_seat, preferences, status, description
)
SELECT
  u.id, veh.id, t.from_loc, t.to_loc,
  CURRENT_DATE + t.day_offset, t.depart_at,
  LEAST(t.seats, veh.seats_available), LEAST(t.seats, veh.seats_available),
  t.price, t.prefs::jsonb, 'posted', t.note
FROM (VALUES
  ('a0000001-0000-4000-8000-000000000001'::UUID, 'Nairobi',  'Nakuru',   0, TIME '16:30', 4,  700.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Leaving after work, one stop at Gilgil if needed.'),
  ('a0000001-0000-4000-8000-000000000001'::UUID, 'Nairobi',  'Eldoret',  2, TIME '05:45', 4, 1500.00, '{"luggage":true,"pets":false,"silent_ride":true,"music":false}',  'Early start to beat the Salgaa traffic.'),
  ('a0000001-0000-4000-8000-000000000001'::UUID, 'Kisumu',   'Kakamega', 4, TIME '09:30', 4,  600.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Short hop, drop-off at the stage.'),
  ('a0000002-0000-4000-8000-000000000002'::UUID, 'Nairobi',  'Nyeri',    0, TIME '14:00', 5,  900.00, '{"luggage":true,"pets":true,"silent_ride":false,"music":true}',   'Via Thika, space for big bags.'),
  ('a0000002-0000-4000-8000-000000000002'::UUID, 'Nairobi',  'Embu',     3, TIME '07:30', 5,  850.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Direct, no detours.'),
  ('a0000002-0000-4000-8000-000000000002'::UUID, 'Nakuru',   'Eldoret',  5, TIME '12:30', 5,  800.00, '{"luggage":true,"pets":true,"silent_ride":false,"music":false}',  'Quiet midday drive.'),
  ('a0000003-0000-4000-8000-000000000003'::UUID, 'Nairobi',  'Thika',    0, TIME '18:15', 3,  250.00, '{"luggage":false,"pets":false,"silent_ride":true,"music":false}', 'Evening commute along the superhighway.'),
  ('a0000003-0000-4000-8000-000000000003'::UUID, 'Thika',    'Nairobi',  1, TIME '06:15', 3,  250.00, '{"luggage":false,"pets":false,"silent_ride":true,"music":false}', 'Morning run, arrives before 7:30.'),
  ('a0000003-0000-4000-8000-000000000003'::UUID, 'Nairobi',  'Kajiado',  4, TIME '10:00', 3,  500.00, '{"luggage":false,"pets":false,"silent_ride":false,"music":true}',  'Small car, one bag each.'),
  ('a0000004-0000-4000-8000-000000000004'::UUID, 'Nairobi',  'Nyeri',    5, TIME '08:30', 4,  900.00, '{"luggage":true,"pets":true,"silent_ride":false,"music":true}',   'Hiking gear welcome.'),
  ('a0000004-0000-4000-8000-000000000004'::UUID, 'Nanyuki',  'Nairobi',  6, TIME '13:00', 4, 1300.00, '{"luggage":true,"pets":true,"silent_ride":false,"music":true}',   'Coming back down from Laikipia.'),
  ('a0000004-0000-4000-8000-000000000004'::UUID, 'Nairobi',  'Meru',     7, TIME '06:45', 4, 1400.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":false}', 'Via Embu, stopping at Chuka.'),
  ('a0000005-0000-4000-8000-000000000005'::UUID, 'Nairobi',  'Mombasa',  4, TIME '21:00', 7, 2100.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":false}', 'Overnight van, reclining seats, arrives at dawn.'),
  ('a0000005-0000-4000-8000-000000000005'::UUID, 'Mombasa',  'Nairobi',  6, TIME '20:30', 7, 2100.00, '{"luggage":true,"pets":false,"silent_ride":true,"music":false}',  'Overnight return, quiet cabin.'),
  ('a0000005-0000-4000-8000-000000000005'::UUID, 'Mombasa',  'Diani',    1, TIME '09:00', 7,  600.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Likoni ferry crossing included in the timing.'),
  ('a0000006-0000-4000-8000-000000000006'::UUID, 'Nairobi',  'Nakuru',   2, TIME '11:00', 3,  700.00, '{"luggage":false,"pets":false,"silent_ride":false,"music":true}',  'Scenic route over the escarpment.'),
  ('a0000006-0000-4000-8000-000000000006'::UUID, 'Nakuru',   'Nairobi',  3, TIME '16:00', 3,  700.00, '{"luggage":false,"pets":false,"silent_ride":true,"music":false}', 'Back before dark.'),
  ('a0000007-0000-4000-8000-000000000007'::UUID, 'Nairobi',  'Kisii',    2, TIME '07:00', 8, 1600.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":true}',  'Leaves when full, plenty of luggage room.'),
  ('a0000007-0000-4000-8000-000000000007'::UUID, 'Eldoret',  'Nairobi',  5, TIME '06:30', 8, 1500.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":false}', 'Early return, stops at Nakuru.'),
  ('a0000007-0000-4000-8000-000000000007'::UUID, 'Nairobi',  'Garissa',  7, TIME '05:30', 8, 1900.00, '{"luggage":true,"pets":false,"silent_ride":false,"music":false}', 'Long haul, water and a rest stop at Mwingi.')
) AS t(auth_id, from_loc, to_loc, day_offset, depart_at, seats, price, prefs, note)
JOIN public.users u      ON u.auth_id = t.auth_id
JOIN public.vehicles veh ON veh.driver_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.trips x
   WHERE x.driver_id = u.id
     AND x.from_location = t.from_loc
     AND x.to_location = t.to_loc
     AND x.departure_date = CURRENT_DATE + t.day_offset
);
