-- ════════════════════════════════════════════════════════════════
-- 031 — Rolling demo trips for the public landing search
--
-- The landing search filters on `departure_date >= today`, so the fixed-date
-- seed from 003 silently stopped matching once those dates passed: by
-- 2026-10-07, 33 of 40 trips were in the past and the popular Nairobi–Nakuru
-- route had none left in the future.
--
-- This migration is written against CURRENT_DATE rather than literal dates, so
-- re-running it at any point refreshes the window. It is idempotent: seeded
-- rows are tagged in `description` and replaced on each run.
--
-- Drivers and vehicles are taken from whatever real users exist, so no UUIDs
-- are hard-coded and the seed stays valid across environments.
-- ════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Pull stale posted trips into a rolling two-week window ────
-- Keeps the pre-existing seed usable instead of leaving dead rows behind.
WITH stale AS (
  SELECT id,
         (row_number() OVER (ORDER BY departure_time, id)) - 1 AS n
  FROM public.trips
  WHERE status = 'posted'
    AND departure_date < CURRENT_DATE
)
UPDATE public.trips t
SET departure_date = CURRENT_DATE + (stale.n % 14),
    updated_at     = NOW()
FROM stale
WHERE t.id = stale.id;

-- ── 2. Replace any previous run of this seed ─────────────────────
-- Only untouched rows are removed; anything a passenger has booked stays.
DELETE FROM public.trips t
WHERE t.description = 'seed:landing-demo'
  AND NOT EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.ride_id = t.id
  );

-- ── 3. Seed the headline routes across the next 14 days ──────────
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
    (0, 'Nairobi', 'Nakuru',   650,  4),
    (1, 'Nakuru',  'Nairobi',  650,  4),
    (2, 'Nairobi', 'Mombasa', 1600,  3),
    (3, 'Mombasa', 'Nairobi', 1600,  3),
    (4, 'Nairobi', 'Kisumu',  1200,  4),
    (5, 'Kisumu',  'Nairobi', 1200,  4),
    (6, 'Nairobi', 'Eldoret', 1400,  3),
    (7, 'Nairobi', 'Nyeri',    500,  4),
    (8, 'Nairobi', 'Thika',    250,  6),
    (9, 'Nairobi', 'Machakos', 300,  5)
),
slots(idx, depart) AS (
  VALUES
    (0, TIME '06:30'),
    (1, TIME '09:00'),
    (2, TIME '14:30'),
    (3, TIME '17:45')
)
INSERT INTO public.trips (
  driver_id, vehicle_id, from_location, to_location,
  departure_date, departure_time,
  seats_total, seats_available, price_per_seat,
  status, description
)
SELECT
  d.driver_id,
  d.vehicle_id,
  r.from_location,
  r.to_location,
  CURRENT_DATE + g.day,
  s.depart,
  r.seats,
  r.seats,
  r.price,
  'posted',
  'seed:landing-demo'
FROM routes r
CROSS JOIN generate_series(0, 13) AS g(day)
CROSS JOIN driver_count dc
JOIN slots   s ON s.idx = ((r.idx + g.day) % 4)
JOIN drivers d ON d.rn  = ((r.idx * 3 + g.day) % dc.n)
WHERE EXISTS (SELECT 1 FROM drivers);

COMMIT;
