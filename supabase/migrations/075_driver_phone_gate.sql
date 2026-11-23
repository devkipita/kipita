-- A driver must have a confirmed phone number to publish a ride (pilot, CEO 23 Nov 2026).
--
-- Why: the phone number is how a passenger and a driver reach each other once a booking is paid (item 3), and
-- the only number a payout can go to (072, withdraw-wallet, Admin > Payouts). On 22 Nov all 6 approved drivers
-- had no confirmed number: they had been approved before 072, and nothing checked the number when they
-- published, so they could take rides and then not be paid. New drivers already confirm a number before they
-- can submit driver verification (submit_driver_kyc). This closes the gap for the rest.
--
-- What this changes
--   1. my_phone_verified(): whether the signed-in person's number is confirmed. Reads only their own row.
--   2. The insert rule on trips ("Trips published by verified drivers") now also needs a confirmed number.
--      The web app writes straight to trips, so this rule is the real gate.
--   3. publish_trip (used only by the old mobile app) refuses the same way, with the short message
--      "Confirm your phone number first." (SQLSTATE 42501). The rest of the function is the live 069 body.
--
-- Not changed: rides already published stay. Admin and server (service role) writes are not affected.
-- Safe to run more than once. Undo with supabase/rollbacks/075_driver_phone_gate_down.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.my_phone_verified()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT u.phone_verified FROM public.users u WHERE u.id = public.current_app_user_id()), FALSE)
$$;

REVOKE ALL ON FUNCTION public.my_phone_verified() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_phone_verified() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Trips published by verified drivers" ON public.trips;
CREATE POLICY "Trips published by verified drivers" ON public.trips
  FOR INSERT
  WITH CHECK (
    driver_id = public.current_app_user_id()
    AND EXISTS (
      SELECT 1 FROM public.driver_profiles d
       WHERE d.user_id = public.current_app_user_id()
         AND (d.approval_status = 'approved'::public.kyc_status
              OR (d.approval_status = 'pending'::public.kyc_status
                  AND (trips.status = 'awaiting_approval'::public.trip_status
                       OR public.flag_enabled('publish_before_approval'::text))))
    )
    AND public.my_phone_verified()
  );

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

  IF NOT public.my_phone_verified() THEN
    RAISE EXCEPTION 'Confirm your phone number first.' USING ERRCODE = '42501';
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

COMMIT;
