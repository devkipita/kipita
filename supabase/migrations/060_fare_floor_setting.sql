-- 060_fare_floor_setting.sql
-- The lowest price a driver may ask for a seat, as a share of the recommended price.
--
-- The recommended price is an even split of the trip cost with the driver counted as one of the
-- sharers. The most a driver may ask is set by fare_margin_percent (115% of the even split). This
-- setting is the other end of the range: at 70, the lowest price is 70% of the recommended price,
-- never below fare_min_seat_price. Set it to 100 to make the recommended price the only price.
--
-- Must be public like the other pricing settings: the Publish a ride screen reads it as the driver.
-- Safe to run more than once. It only adds a setting and needs 052_fare_model.sql to have run first.

BEGIN;

INSERT INTO public.platform_settings (key, value, label, is_public) VALUES
  ('fare_floor_percent', '70'::jsonb,
   'Lowest seat price a driver may ask, as a percent of the recommended price (never below the lowest seat price)', TRUE)
ON CONFLICT (key) DO NOTHING;

-- A value saved from the admin console before this migration ran would have been stored as not public.
UPDATE public.platform_settings SET is_public = TRUE WHERE key = 'fare_floor_percent';

COMMIT;
