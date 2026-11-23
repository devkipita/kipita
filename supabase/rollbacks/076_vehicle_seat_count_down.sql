-- 076_vehicle_seat_count_down.sql
-- Puts the database back as it was before 076 (whether a car's seat count was given by its driver).
-- NOT a migration: do not put it in supabase/migrations. Run it by hand, and only if 076 has to be undone.
--
-- Before running:
--   * Redeploy the web app from before the seat-count work first. The new Publish and profile screens select
--     seats_confirmed_at; without the column they cannot list a driver's cars.
--   * This deletes vehicles.seats_confirmed_at. After it nothing says which cars have a seat count the driver
--     gave, so every car is asked again if the work is redone. vehicles.seat_capacity keeps what it holds.

BEGIN;

ALTER TABLE public.vehicles DROP COLUMN IF EXISTS seats_confirmed_at;

COMMIT;
