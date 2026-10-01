ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS discount_percent SMALLINT;

DO $$ BEGIN
  ALTER TABLE public.trips
    ADD CONSTRAINT trips_discount_percent_range CHECK (
      discount_percent IS NULL
      OR (discount_percent >= 5 AND discount_percent <= 60)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_trips_discounted
  ON public.trips (departure_date)
  WHERE discount_percent IS NOT NULL;
