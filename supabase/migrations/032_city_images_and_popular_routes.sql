BEGIN;

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS image_url TEXT;

UPDATE public.cities
SET image_url = '/landing/towns/' || lower(name) || '.jpg'
WHERE lower(name) IN (
  'nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'thika',
  'nyeri', 'machakos', 'kericho', 'malindi', 'meru', 'garissa',
  'nanyuki', 'naivasha'
);

CREATE OR REPLACE VIEW public.popular_routes
WITH (security_invoker = true) AS
SELECT
  t.from_location,
  t.to_location,
  count(*)::int                      AS trips_count,
  min(t.price_per_seat)              AS min_price,
  min(t.departure_date)              AS next_departure,
  max(c.image_url)                   AS image_url
FROM public.trips t
LEFT JOIN public.cities c
  ON lower(c.name) = lower(t.to_location)
WHERE t.status IN ('posted', 'active')
  AND t.departure_date >= CURRENT_DATE
  AND t.seats_available > 0
GROUP BY t.from_location, t.to_location;

GRANT SELECT ON public.popular_routes TO anon, authenticated;

COMMIT;
