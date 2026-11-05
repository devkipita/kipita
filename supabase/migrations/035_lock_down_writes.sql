BEGIN;

REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;

DROP POLICY IF EXISTS "Payments own" ON public.payments;
CREATE POLICY "Payments readable by owner" ON public.payments
  FOR SELECT USING (user_id = public.current_app_user_id());

REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM authenticated;

DROP POLICY IF EXISTS "Bookings insert" ON public.bookings;
DROP POLICY IF EXISTS "Bookings update" ON public.bookings;
DROP POLICY IF EXISTS "Bookings participants" ON public.bookings;
CREATE POLICY "Bookings readable by participants" ON public.bookings
  FOR SELECT USING (
    passenger_id = public.current_app_user_id()
    OR driver_id = public.current_app_user_id()
    OR public.is_admin()
  );

REVOKE UPDATE (
  id, driver_id, seats_available, seats_total, created_at
) ON public.trips FROM authenticated;

DROP POLICY IF EXISTS "Rides own update" ON public.trips;
CREATE POLICY "Trips updated by owner" ON public.trips
  FOR UPDATE USING (driver_id = public.current_app_user_id())
  WITH CHECK (driver_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Rides own write" ON public.trips;
CREATE POLICY "Trips published by verified drivers" ON public.trips
  FOR INSERT WITH CHECK (
    driver_id = public.current_app_user_id()
    AND EXISTS (
      SELECT 1 FROM public.driver_profiles d
       WHERE d.user_id = public.current_app_user_id()
         AND d.approval_status <> 'not_submitted'
    )
  );

DROP POLICY IF EXISTS "Requests own update" ON public.ride_requests;
CREATE POLICY "Requests updated by owner" ON public.ride_requests
  FOR UPDATE USING (passenger_id = public.current_app_user_id())
  WITH CHECK (passenger_id = public.current_app_user_id());

REVOKE UPDATE (
  user_id, approval_status, license_verified, background_check_status,
  earnings, rating, completed_trips, cancelled_trips
) ON public.driver_profiles FROM authenticated;

REVOKE INSERT (
  approval_status, license_verified, background_check_status,
  earnings, rating, completed_trips, cancelled_trips
) ON public.driver_profiles FROM authenticated;

DROP POLICY IF EXISTS "Driver profiles own" ON public.driver_profiles;
CREATE POLICY "Driver profile readable by owner" ON public.driver_profiles
  FOR SELECT USING (
    user_id = public.current_app_user_id() OR public.is_admin()
  );
CREATE POLICY "Driver profile created by owner" ON public.driver_profiles
  FOR INSERT WITH CHECK (user_id = public.current_app_user_id());
CREATE POLICY "Driver profile updated by owner" ON public.driver_profiles
  FOR UPDATE USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

REVOKE INSERT ON public.users FROM authenticated;

DELETE FROM public.ratings a
 USING public.ratings b
 WHERE a.ctid < b.ctid
   AND a.booking_id = b.booking_id
   AND a.from_user_id = b.from_user_id;

DELETE FROM public.ratings r
 WHERE NOT EXISTS (
   SELECT 1 FROM public.bookings b
    WHERE b.id = r.booking_id
      AND (b.passenger_id = r.from_user_id OR b.driver_id = r.from_user_id)
 );

CREATE UNIQUE INDEX IF NOT EXISTS uq_ratings_booking_author
  ON public.ratings (booking_id, from_user_id);

DROP POLICY IF EXISTS "Ratings own write" ON public.ratings;
CREATE POLICY "Ratings written by participants" ON public.ratings
  FOR INSERT WITH CHECK (
    from_user_id = public.current_app_user_id()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.id = booking_id
         AND b.status = 'completed'
         AND (
           b.passenger_id = public.current_app_user_id()
           OR b.driver_id = public.current_app_user_id()
         )
         AND to_user_id IN (b.passenger_id, b.driver_id)
         AND to_user_id <> public.current_app_user_id()
    )
  );

COMMIT;
