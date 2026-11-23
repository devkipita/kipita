CREATE TABLE IF NOT EXISTS public.pickup_locations (
  booking_id   UUID PRIMARY KEY REFERENCES public.bookings (id) ON DELETE CASCADE,
  trip_id      UUID NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.users (id),
  lat          DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng          DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  accuracy_m   REAL CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pickup_locations_trip_idx ON public.pickup_locations (trip_id);

ALTER TABLE public.pickup_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pickup location readable by passenger and driver" ON public.pickup_locations;
CREATE POLICY "Pickup location readable by passenger and driver" ON public.pickup_locations
  FOR SELECT TO authenticated
  USING (
    passenger_id = (SELECT public.current_app_user_id())
    OR EXISTS (
      SELECT 1 FROM public.trips t
       WHERE t.id = pickup_locations.trip_id
         AND t.driver_id = (SELECT public.current_app_user_id())
    )
  );

REVOKE ALL ON public.pickup_locations FROM anon;
GRANT SELECT ON public.pickup_locations TO authenticated;

CREATE OR REPLACE FUNCTION public.share_pickup_location(
  p_booking_id UUID,
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_accuracy_m REAL DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me     UUID := public.current_app_user_id();
  v_trip   UUID;
  v_leaves TIMESTAMPTZ;
BEGIN
  SELECT b.trip_id,
         ((t.departure_date + COALESCE(t.departure_time, TIME '00:00')) AT TIME ZONE 'Africa/Nairobi')
    INTO v_trip, v_leaves
    FROM public.bookings b
    JOIN public.trips t ON t.id = b.trip_id
   WHERE b.id = p_booking_id
     AND b.passenger_id = v_me
     AND b.status = 'confirmed'
     AND b.boarded_at IS NULL
     AND t.status IN ('posted', 'active');

  IF v_trip IS NULL THEN
    RAISE EXCEPTION 'Only a paid passenger waiting for pickup can share their location' USING ERRCODE = '42501';
  END IF;

  IF NOW() < v_leaves - INTERVAL '30 minutes' THEN
    RAISE EXCEPTION 'Location sharing starts 30 minutes before the ride' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.pickup_locations (booking_id, trip_id, passenger_id, lat, lng, accuracy_m, updated_at)
  VALUES (p_booking_id, v_trip, v_me, p_lat, p_lng, p_accuracy_m, NOW())
  ON CONFLICT (booking_id) DO UPDATE
     SET lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         accuracy_m = EXCLUDED.accuracy_m,
         updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.share_pickup_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_pickup_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_pickup_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pickup_locations WHERE booking_id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_pickup_location() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bookings_clear_pickup_location ON public.bookings;
CREATE TRIGGER trg_bookings_clear_pickup_location
  AFTER UPDATE OF status, boarded_at ON public.bookings
  FOR EACH ROW
  WHEN (NEW.boarded_at IS NOT NULL OR NEW.status::TEXT <> 'confirmed')
  EXECUTE FUNCTION public.clear_pickup_location();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pickup_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_locations;
  END IF;
END $$;
