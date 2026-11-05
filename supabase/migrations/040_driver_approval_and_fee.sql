BEGIN;

CREATE OR REPLACE FUNCTION public.set_driver_approval(
  p_user_id UUID,
  p_status  public.kyc_status
) RETURNS public.kyc_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old public.kyc_status;
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

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'system',
    CASE WHEN p_status = 'approved'
         THEN 'You are verified'
         ELSE 'Driver verification update' END,
    CASE WHEN p_status = 'approved'
         THEN 'Your licence checks out. You can publish rides now.'
         ELSE 'We could not verify your details. Open Kipita to resubmit.' END,
    jsonb_build_object('approval_status', p_status)
  );

  PERFORM public.record_admin_action(
    'driver.approval', 'driver_profiles', p_user_id::TEXT,
    jsonb_build_object('from', v_old, 'to', p_status)
  );

  RETURN p_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.pending_driver_applications()
RETURNS TABLE (
  user_id          UUID,
  full_name        TEXT,
  avatar_url       TEXT,
  phone            TEXT,
  national_id      TEXT,
  license_number   TEXT,
  license_expiry   DATE,
  license_photo    TEXT,
  selfie_photo     TEXT,
  approval_status  public.kyc_status,
  submitted_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT d.user_id, u.full_name, u.avatar_url, u.phone,
         d.national_id, d.license_number, d.license_expiry,
         d.license_photo, d.selfie_photo, d.approval_status,
         COALESCE(d.updated_at, d.created_at)
    FROM public.driver_profiles d
    JOIN public.users u ON u.id = d.user_id
   WHERE d.approval_status = 'pending'
   ORDER BY COALESCE(d.updated_at, d.created_at) ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_trip(
  p_from_location  TEXT,
  p_to_location    TEXT,
  p_departure_date DATE,
  p_departure_time TIME,
  p_seats_total    INTEGER,
  p_price_per_seat NUMERIC,
  p_preferences    JSONB DEFAULT '{}'::jsonb,
  p_vehicle_id     UUID  DEFAULT NULL,
  p_pickup_point   TEXT  DEFAULT NULL,
  p_dropoff_point  TEXT  DEFAULT NULL
) RETURNS SETOF public.trips
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF (p_departure_date + p_departure_time) < NOW() THEN
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
$$;

DROP POLICY IF EXISTS "Trips published by verified drivers" ON public.trips;
CREATE POLICY "Trips published by verified drivers" ON public.trips
  FOR INSERT WITH CHECK (
    driver_id = public.current_app_user_id()
    AND EXISTS (
      SELECT 1 FROM public.driver_profiles d
       WHERE d.user_id = public.current_app_user_id()
         AND (
           d.approval_status = 'approved'
           OR (d.approval_status = 'pending'
               AND public.flag_enabled('publish_before_approval'))
         )
    )
  );

CREATE OR REPLACE FUNCTION public.fare_breakdown(p_total NUMERIC)
RETURNS TABLE (total NUMERIC, fee NUMERIC, driver_earning NUMERIC, fee_percent NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_total,
         ROUND(p_total * public.setting_numeric('platform_fee_percent', 12) / 100, 2),
         ROUND(p_total - (p_total * public.setting_numeric('platform_fee_percent', 12) / 100), 2),
         public.setting_numeric('platform_fee_percent', 12);
$$;

INSERT INTO public.feature_flags (key, enabled, label) VALUES
  ('publish_before_approval', TRUE,
   'Let drivers publish while their application is still under review')
ON CONFLICT (key) DO NOTHING;

REVOKE ALL ON FUNCTION public.pending_driver_applications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pending_driver_applications() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fare_breakdown(NUMERIC) TO anon, authenticated, service_role;

COMMIT;
