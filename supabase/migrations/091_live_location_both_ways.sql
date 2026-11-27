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
  SELECT b.trip_id, public.trip_departs_at(t.departure_date, t.departure_time)
    INTO v_trip, v_leaves
    FROM public.bookings b
    JOIN public.trips t ON t.id = b.trip_id
   WHERE b.id = p_booking_id
     AND b.passenger_id = v_me
     AND b.status IN ('confirmed', 'in_progress')
     AND t.status IN ('posted', 'active', 'in_progress');

  IF v_trip IS NULL THEN
    RAISE EXCEPTION 'Only a paid passenger on this ride can share their location' USING ERRCODE = '42501';
  END IF;

  IF NOW() < v_leaves - INTERVAL '20 minutes' THEN
    RAISE EXCEPTION 'Location sharing starts 20 minutes before the ride' USING ERRCODE = '22023';
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
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status::TEXT NOT IN ('confirmed', 'in_progress'))
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

CREATE OR REPLACE FUNCTION public.share_trip_location(
  p_trip_id   UUID,
  p_lat       DOUBLE PRECISION,
  p_lng       DOUBLE PRECISION,
  p_heading   REAL DEFAULT NULL,
  p_speed_kmh REAL DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := public.current_app_user_id();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.trips t
     WHERE t.id = p_trip_id
       AND t.driver_id = v_me
       AND (
         t.status = 'in_progress'
         OR (
           t.status IN ('posted', 'active')
           AND NOW() >= public.trip_departs_at(t.departure_date, t.departure_time) - INTERVAL '20 minutes'
           AND EXISTS (
             SELECT 1 FROM public.bookings b
              WHERE b.trip_id = t.id AND b.status = 'confirmed'
           )
         )
       )
  ) THEN
    RAISE EXCEPTION 'Location sharing starts 20 minutes before a ride with a paid passenger' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.trip_locations (trip_id, driver_id, lat, lng, heading, speed_kmh, updated_at)
  VALUES (p_trip_id, v_me, p_lat, p_lng, p_heading, p_speed_kmh, NOW())
  ON CONFLICT (trip_id) DO UPDATE
     SET lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         heading = EXCLUDED.heading,
         speed_kmh = EXCLUDED.speed_kmh,
         updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.share_trip_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL, REAL) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_trip_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL, REAL) TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_trip_locations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INTEGER;
  v_p INTEGER;
BEGIN
  DELETE FROM public.trip_locations l
   USING public.trips t
   WHERE t.id = l.trip_id
     AND (t.status NOT IN ('posted', 'active', 'in_progress') OR l.updated_at < NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS v_n = ROW_COUNT;

  DELETE FROM public.pickup_locations p
   USING public.bookings b
   WHERE b.id = p.booking_id
     AND (b.status NOT IN ('confirmed', 'in_progress') OR p.updated_at < NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS v_p = ROW_COUNT;

  RETURN v_n + v_p;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_trip_locations() FROM PUBLIC, anon, authenticated;
