DROP TRIGGER IF EXISTS trg_bookings_clear_pickup_location ON public.bookings;
DROP FUNCTION IF EXISTS public.clear_pickup_location();
DROP FUNCTION IF EXISTS public.share_pickup_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pickup_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.pickup_locations;
  END IF;
END $$;

DROP TABLE IF EXISTS public.pickup_locations;
