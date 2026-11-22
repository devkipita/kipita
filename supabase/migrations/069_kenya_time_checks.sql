-- 069_kenya_time_checks.sql
-- Rides are in Kenya time. Three database checks were comparing a ride's date and time to the clock as if
-- both were UTC, so they were three hours out.
--
-- A ride's departure_date and departure_time are stored without a zone and mean Kenya time (UTC+3, no
-- daylight saving). The database session runs in UTC. `(date + time) < NOW()` reads the ride's time as UTC,
-- which puts it three hours later than it really is:
--
--   publish_trip         let a driver publish a ride that had already left, up to three hours ago
--                        (a 14:00 ride could still be published at 16:59 Kenya time)
--   set_driver_approval  when an admin approved a driver, a saved ride that left in the last three hours
--                        was made live instead of being closed
--   list_return_capacity (Kipita Send) compared the date to the UTC date, so between midnight and 03:00 in
--                        Kenya, yesterday still counted as "not passed"
--
-- All three now use the same Kenya-time sum as request_seat, expire_departed_trips and the reminders:
-- trip_departs_at(date, time), or today's date in Africa/Nairobi. The bodies are otherwise unchanged,
-- and CREATE OR REPLACE keeps each function's owner and grants.
--
-- 067 also defines trip_departs_at. It is repeated here, identical, so this file runs on its own in
-- either order. Safe to run more than once.

BEGIN;

CREATE OR REPLACE FUNCTION public.trip_departs_at(p_date DATE, p_time TIME)
RETURNS TIMESTAMPTZ
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (p_date + COALESCE(p_time, TIME '23:59:59')) AT TIME ZONE 'Africa/Nairobi'
$$;

REVOKE ALL ON FUNCTION public.trip_departs_at(DATE, TIME) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trip_departs_at(DATE, TIME) TO service_role;

-- ── publish_trip ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publish_trip(p_from_location text, p_to_location text, p_departure_date date, p_departure_time time without time zone, p_seats_total integer, p_price_per_seat numeric, p_preferences jsonb DEFAULT '{}'::jsonb, p_vehicle_id uuid DEFAULT NULL::uuid, p_pickup_point text DEFAULT NULL::text, p_dropoff_point text DEFAULT NULL::text)
 RETURNS SETOF trips
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me   UUID;
  v_kyc  public.kyc_status;
  v_trip public.trips%ROWTYPE;
BEGIN
  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT d.approval_status INTO v_kyc
    FROM public.driver_profiles d WHERE d.user_id = v_me;

  IF v_kyc IS NULL OR v_kyc = 'not_submitted' THEN
    RAISE EXCEPTION 'Finish driver verification first' USING ERRCODE = '42501';
  END IF;

  IF v_kyc = 'rejected' THEN
    RAISE EXCEPTION 'Your driver application was not approved' USING ERRCODE = '42501';
  END IF;

  IF v_kyc <> 'approved' AND NOT public.flag_enabled('publish_before_approval') THEN
    RAISE EXCEPTION 'Your driver application is still being reviewed'
      USING ERRCODE = '42501';
  END IF;

  IF p_seats_total < 1 OR p_seats_total > 8 THEN
    RAISE EXCEPTION 'Seats must be between 1 and 8' USING ERRCODE = '22023';
  END IF;

  IF p_price_per_seat <= 0 THEN
    RAISE EXCEPTION 'Fare must be greater than zero' USING ERRCODE = '22023';
  END IF;

  IF public.trip_departs_at(p_departure_date, p_departure_time) < NOW() THEN
    RAISE EXCEPTION 'That departure is in the past' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.trips (
    driver_id, vehicle_id, from_location, to_location,
    departure_date, departure_time, seats_total, seats_available,
    price_per_seat, preferences, pickup_point, dropoff_point, status
  ) VALUES (
    v_me, p_vehicle_id, btrim(p_from_location), btrim(p_to_location),
    p_departure_date, p_departure_time, p_seats_total, p_seats_total,
    p_price_per_seat, COALESCE(p_preferences, '{}'::jsonb),
    p_pickup_point, p_dropoff_point, 'posted'
  )
  RETURNING * INTO v_trip;

  RETURN NEXT v_trip;
END;
$function$;

-- ── set_driver_approval ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_driver_approval(p_user_id uuid, p_status kyc_status)
 RETURNS kyc_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old   public.kyc_status;
  v_live  INTEGER := 0;
  v_gone  INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT d.approval_status INTO v_old
    FROM public.driver_profiles d WHERE d.user_id = p_user_id;

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'No driver application for that user' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.driver_profiles d
     SET approval_status  = p_status,
         license_verified = (p_status = 'approved'),
         updated_at       = NOW()
   WHERE d.user_id = p_user_id;

  UPDATE public.users u
     SET is_verified = (p_status = 'approved'),
         updated_at  = NOW()
   WHERE u.id = p_user_id;

  IF p_status = 'approved' THEN
    UPDATE public.trips t
       SET status = 'cancelled', updated_at = NOW()
     WHERE t.driver_id = p_user_id
       AND t.status = 'awaiting_approval'
       AND public.trip_departs_at(t.departure_date, t.departure_time) <= NOW();
    GET DIAGNOSTICS v_gone = ROW_COUNT;

    UPDATE public.trips t
       SET status = 'posted', updated_at = NOW()
     WHERE t.driver_id = p_user_id
       AND t.status = 'awaiting_approval';
    GET DIAGNOSTICS v_live = ROW_COUNT;
  ELSIF p_status = 'rejected' THEN
    UPDATE public.trips t
       SET status = 'cancelled', updated_at = NOW()
     WHERE t.driver_id = p_user_id
       AND t.status = 'awaiting_approval';
    GET DIAGNOSTICS v_gone = ROW_COUNT;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'system',
    CASE WHEN p_status = 'approved' THEN 'You are verified' ELSE 'Driver verification update' END,
    CASE
      WHEN p_status = 'approved' AND v_live = 1 THEN 'Your details check out, and your saved ride is now live.'
      WHEN p_status = 'approved' AND v_live > 1 THEN 'Your details check out, and your ' || v_live || ' saved rides are now live.'
      WHEN p_status = 'approved' THEN 'Your details check out. You can publish rides now.'
      ELSE 'We could not verify your details. Open Kipita to send them again.'
    END,
    jsonb_build_object('approval_status', p_status, 'rides_live', v_live, 'rides_cancelled', v_gone)
  );

  PERFORM public.record_admin_action(
    'driver.approval', 'driver_profiles', p_user_id::TEXT,
    jsonb_build_object('from', v_old, 'to', p_status, 'rides_live', v_live, 'rides_cancelled', v_gone)
  );

  RETURN p_status;
END;
$function$;

-- ── list_return_capacity (Kipita Send) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_return_capacity(p_from_location text, p_to_location text, p_depart_date date, p_depart_time time without time zone DEFAULT NULL::time without time zone, p_vehicle_type vehicle_class DEFAULT 'car'::vehicle_class, p_max_load load_size DEFAULT 'boot'::load_size, p_price_from numeric DEFAULT NULL::numeric, p_capacity_note text DEFAULT NULL::text, p_vehicle_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF send_capacity
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me  UUID;
  v_kyc public.kyc_status;
  v_row public.send_capacity%ROWTYPE;
BEGIN
  IF NOT public.flag_enabled('send') THEN
    RAISE EXCEPTION 'Kipita Send is not available yet' USING ERRCODE = '22023';
  END IF;

  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT d.approval_status INTO v_kyc
    FROM public.driver_profiles d WHERE d.user_id = v_me;

  IF v_kyc IS NULL OR v_kyc <> 'approved' THEN
    RAISE EXCEPTION 'Only verified drivers can offer space' USING ERRCODE = '42501';
  END IF;

  IF p_depart_date < (NOW() AT TIME ZONE 'Africa/Nairobi')::DATE THEN
    RAISE EXCEPTION 'That date has passed' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.send_capacity (
    driver_id, vehicle_id, from_location, to_location, depart_date, depart_time,
    vehicle_type, max_load, capacity_note, price_from, quote_only
  ) VALUES (
    v_me, p_vehicle_id, btrim(p_from_location), btrim(p_to_location),
    p_depart_date, p_depart_time, p_vehicle_type, p_max_load,
    p_capacity_note, p_price_from, p_price_from IS NULL
  )
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$function$;

COMMIT;
