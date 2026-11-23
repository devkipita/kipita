-- 076_vehicle_seat_count.sql
-- Whether a car's seat count has been given by its driver.
--
-- vehicles.seat_capacity (migration 003) holds a car's seats with the driver's seat in them, but it has
-- always defaulted to 4 and the web app never asked for it, so no stored value can be told from the
-- default. This column marks the ones a driver has actually answered. The app asks once per car (when the
-- car is added, and at the next publish for cars saved before this) and only trusts seat_capacity once
-- this is set. Every car that exists now starts as not answered.
--
-- No data is changed: nothing is backfilled and seat_capacity keeps what it holds.
-- Safe to run more than once. Run it before the web change that reads it is deployed: the Publish and
-- profile screens select this column, so without it they cannot list a driver's cars.

BEGIN;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS seats_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.vehicles.seats_confirmed_at IS
  'When the driver said how many seats the car has (seat_capacity, driver''s seat included). Null means seat_capacity is only the default and must not be trusted.';

COMMIT;
