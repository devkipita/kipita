BEGIN;

REVOKE UPDATE, INSERT, DELETE ON public.driver_profiles FROM authenticated;

GRANT UPDATE (
  is_online, accepting_trips, current_latitude, current_longitude,
  last_seen, is_active, license_number, national_id, license_expiry,
  profile_photo, license_photo, selfie_photo, updated_at
) ON public.driver_profiles TO authenticated;

REVOKE UPDATE, DELETE ON public.trips FROM authenticated;

GRANT UPDATE (
  from_location, to_location, from_lat, from_lng, to_lat, to_lng,
  departure_date, departure_time, estimated_arrival, price_per_seat,
  discount_percent, description, pickup_point, dropoff_point,
  preferences, allows_luggage, allows_pets, allows_smoking,
  status, vehicle_id, origin_city_id, destination_city_id, updated_at
) ON public.trips TO authenticated;

REVOKE UPDATE, DELETE ON public.ride_requests FROM authenticated;

GRANT UPDATE (
  from_location, to_location, from_lat, from_lng, to_lat, to_lng,
  preferred_date, preferred_time, seats_needed, preferences,
  status, updated_at
) ON public.ride_requests TO authenticated;

REVOKE DELETE ON public.users FROM authenticated;

CREATE OR REPLACE FUNCTION public.submit_driver_kyc(
  p_national_id    TEXT,
  p_license_number TEXT,
  p_license_expiry DATE DEFAULT NULL
) RETURNS public.kyc_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID;
  v_current public.kyc_status;
BEGIN
  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF length(btrim(p_national_id)) < 4 OR length(btrim(p_license_number)) < 4 THEN
    RAISE EXCEPTION 'National ID and licence number are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT d.approval_status INTO v_current
    FROM public.driver_profiles d WHERE d.user_id = v_me;

  IF v_current = 'approved' THEN
    RETURN v_current;
  END IF;

  INSERT INTO public.driver_profiles (
    user_id, national_id, license_number, license_expiry,
    approval_status, background_check_status
  ) VALUES (
    v_me, btrim(p_national_id), btrim(p_license_number), p_license_expiry,
    'pending', 'pending'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    national_id             = btrim(p_national_id),
    license_number          = btrim(p_license_number),
    license_expiry          = p_license_expiry,
    approval_status         = 'pending',
    background_check_status = 'pending',
    updated_at              = NOW();

  RETURN 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_driver_kyc(TEXT, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_driver_kyc(TEXT, TEXT, DATE)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_driver_approval(
  p_user_id UUID,
  p_status  public.kyc_status
) RETURNS public.kyc_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.driver_profiles d
     SET approval_status = p_status,
         license_verified = (p_status = 'approved'),
         updated_at = NOW()
   WHERE d.user_id = p_user_id;

  RETURN p_status;
END;
$$;

REVOKE ALL ON FUNCTION public.set_driver_approval(UUID, public.kyc_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_driver_approval(UUID, public.kyc_status)
  TO authenticated, service_role;

UPDATE public.driver_profiles
   SET earnings = 0.00,
       license_verified = FALSE,
       updated_at = NOW()
 WHERE user_id = (
   SELECT id FROM public.users
    WHERE auth_id = '22222222-2222-4222-8222-222222222222'
 );

COMMIT;
