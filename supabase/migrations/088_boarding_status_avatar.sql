DROP FUNCTION IF EXISTS public.trip_boarding_status(UUID);

CREATE FUNCTION public.trip_boarding_status(p_trip_id UUID)
RETURNS TABLE (
  booking_id UUID,
  passenger_id UUID,
  passenger_name TEXT,
  seats_booked INTEGER,
  pickup_location TEXT,
  state TEXT,
  boarded_method TEXT,
  code_locked BOOLEAN,
  driver_earning NUMERIC,
  no_show_from TIMESTAMPTZ,
  passenger_avatar_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_me     UUID := public.current_app_user_id();
  v_trip   public.trips%ROWTYPE;
  v_max    INTEGER := public.setting_numeric('pickup_code_max_tries', 5)::INTEGER;
  v_wait   NUMERIC := public.setting_numeric('no_show_wait_minutes', 15);
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT t.* INTO v_trip FROM public.trips t WHERE t.id = p_trip_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_trip.driver_id <> v_me AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the driver can see this' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT b.id,
         b.passenger_id,
         COALESCE(NULLIF(btrim(u.full_name), ''), 'Passenger'),
         b.seats_booked,
         b.pickup_location,
         CASE WHEN b.status = 'cancelled' AND b.cancel_tier = 'no_show' THEN 'no_show'
              WHEN b.boarded_at IS NOT NULL THEN 'boarded'
              ELSE 'waiting' END,
         b.boarded_method,
         COALESCE(pc.wrong_tries >= v_max, TRUE),
         COALESCE(pay.driver_earning, 0),
         public.trip_departs_at(v_trip.departure_date, v_trip.departure_time)
           + v_wait::DOUBLE PRECISION * INTERVAL '1 minute',
         u.avatar_url
    FROM public.bookings b
    JOIN public.users u ON u.id = b.passenger_id
    LEFT JOIN public.booking_pickup_codes pc ON pc.booking_id = b.id
    LEFT JOIN LATERAL (
      SELECT p.driver_earning
        FROM public.payments p
       WHERE p.booking_id = b.id AND p.status = 'completed'
       ORDER BY p.created_at DESC
       LIMIT 1
    ) pay ON TRUE
   WHERE b.trip_id = p_trip_id
     AND (b.status IN ('confirmed', 'in_progress', 'completed')
          OR (b.status = 'cancelled' AND b.cancel_tier = 'no_show'))
   ORDER BY b.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trip_boarding_status(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trip_boarding_status(UUID) TO authenticated, service_role;
