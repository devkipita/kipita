-- ════════════════════════════════════════════════════════════════
-- 033 — A wider rolling seed of posted rides
--
-- 031 keeps ten headline corridors alive over a fourteen-day window. This adds
-- thirty more — the coast, the lake, the Rift, the Mount Kenya side — with
-- fares that drift by day, departures across eight slots, seats partly sold and
-- preferences that differ per ride.
--
-- Written against CURRENT_DATE, so a re-run refreshes the window, and tagged in
-- `description`, so a re-run replaces itself. Drivers and vehicles come from
-- whatever real users exist, so no UUIDs are hard-coded.
-- ════════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM public.trips t
WHERE t.description = 'seed:rides-wide'
  AND NOT EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.trip_id = t.id
  );

-- The throttle and broadcast triggers from 020 are right for a human posting a
-- ride and wrong for a bulk seed. Suspended inside the transaction, so a
-- failure restores them with the rollback.
ALTER TABLE public.trips DISABLE TRIGGER trg_throttle_new_trip;
ALTER TABLE public.trips DISABLE TRIGGER trg_broadcast_new_trip;

WITH drivers AS (
  SELECT u.id AS driver_id,
         v.id AS vehicle_id,
         (row_number() OVER (ORDER BY u.id)) - 1 AS rn
  FROM public.users u
  JOIN public.vehicles v ON v.driver_id = u.id
),
driver_count AS (
  SELECT GREATEST(count(*), 1)::int AS n FROM drivers
),
routes(idx, from_location, to_location, price, seats) AS (
  VALUES
    -- Mount Kenya side
    ( 0, 'Nairobi',  'Nanyuki',   1600, 4),
    ( 1, 'Nanyuki',  'Nairobi',   1600, 4),
    ( 2, 'Nyeri',    'Nairobi',    500, 4),
    ( 3, 'Nairobi',  'Embu',       700, 4),
    ( 4, 'Embu',     'Nairobi',    700, 4),
    ( 5, 'Nyeri',    'Nanyuki',    400, 3),
    ( 6, 'Nairobi',  'Meru',      1100, 4),
    ( 7, 'Meru',     'Nairobi',   1100, 4),
    -- Rift Valley
    ( 8, 'Nakuru',   'Eldoret',    800, 4),
    ( 9, 'Eldoret',  'Nakuru',     800, 4),
    (10, 'Eldoret',  'Nairobi',   1400, 3),
    (11, 'Nairobi',  'Naivasha',   450, 5),
    (12, 'Naivasha', 'Nairobi',    450, 5),
    (13, 'Nakuru',   'Naivasha',   300, 4),
    (14, 'Naivasha', 'Nakuru',     300, 4),
    (15, 'Nakuru',   'Kisumu',     900, 4),
    (16, 'Kisumu',   'Nakuru',     900, 4),
    (17, 'Nairobi',  'Kericho',   1000, 4),
    -- Lake and west
    (18, 'Kisumu',   'Kakamega',   350, 4),
    (19, 'Kakamega', 'Kisumu',     350, 4),
    (20, 'Kisumu',   'Kisii',      550, 4),
    (21, 'Kisii',    'Nairobi',   1300, 3),
    (22, 'Eldoret',  'Kitale',     400, 5),
    -- Coast
    (23, 'Mombasa',  'Malindi',    700, 4),
    (24, 'Malindi',  'Mombasa',    700, 4),
    (25, 'Mombasa',  'Diani',      450, 4),
    (26, 'Mombasa',  'Voi',        600, 4),
    (27, 'Voi',      'Nairobi',   1200, 3),
    -- Around the capital
    (28, 'Thika',    'Nairobi',    250, 6),
    (29, 'Machakos', 'Nairobi',    300, 5)
),
slots(idx, depart) AS (
  VALUES
    (0, TIME '05:45'),
    (1, TIME '07:15'),
    (2, TIME '08:30'),
    (3, TIME '10:00'),
    (4, TIME '12:30'),
    (5, TIME '15:00'),
    (6, TIME '17:30'),
    (7, TIME '19:45')
),
prefs(idx, value) AS (
  VALUES
    (0, '{"luggage":true,"pets":false,"silent_ride":false,"music":true,"no_smoking":true}'::jsonb),
    (1, '{"luggage":true,"pets":true,"silent_ride":false,"music":true,"no_smoking":true}'::jsonb),
    (2, '{"luggage":false,"pets":false,"silent_ride":true,"music":false,"no_smoking":true}'::jsonb),
    (3, '{"luggage":true,"pets":false,"silent_ride":true,"music":false,"no_smoking":true}'::jsonb),
    (4, '{"luggage":true,"pets":true,"silent_ride":false,"music":true,"no_smoking":false}'::jsonb)
)
INSERT INTO public.trips (
  driver_id, vehicle_id, from_location, to_location,
  departure_date, departure_time,
  seats_total, seats_available, price_per_seat,
  preferences, status, description
)
SELECT
  d.driver_id,
  d.vehicle_id,
  r.from_location,
  r.to_location,
  CURRENT_DATE + g.day,
  s.depart,
  r.seats,
  GREATEST(r.seats - ((r.idx + g.day * 2) % 3), 1),
  r.price + (((r.idx * 5 + g.day * 3) % 5) - 2) * 50,
  p.value,
  'posted',
  'seed:rides-wide'
FROM routes r
CROSS JOIN generate_series(0, 13) AS g(day)
CROSS JOIN driver_count dc
JOIN slots   s ON s.idx = ((r.idx * 3 + g.day * 5) % 8)
JOIN prefs   p ON p.idx = ((r.idx + g.day) % 5)
JOIN drivers d ON d.rn  = ((r.idx * 7 + g.day * 2) % dc.n)
WHERE EXISTS (SELECT 1 FROM drivers);

ALTER TABLE public.trips ENABLE TRIGGER trg_throttle_new_trip;
ALTER TABLE public.trips ENABLE TRIGGER trg_broadcast_new_trip;

COMMIT;
