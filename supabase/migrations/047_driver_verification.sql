BEGIN;

ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS document_type   TEXT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS document_photo  TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_photo   TEXT;

ALTER TABLE public.driver_profiles
  ALTER COLUMN license_number DROP NOT NULL;

ALTER TABLE public.driver_profiles
  DROP CONSTRAINT IF EXISTS driver_profiles_document_type_check;
ALTER TABLE public.driver_profiles
  ADD CONSTRAINT driver_profiles_document_type_check
  CHECK (document_type IS NULL OR document_type IN ('national_id', 'driving_licence', 'passport'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "kyc-documents read own or admin" ON storage.objects;
CREATE POLICY "kyc-documents read own or admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = public.current_app_user_id()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "kyc-documents insert own" ON storage.objects;
CREATE POLICY "kyc-documents insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

DROP POLICY IF EXISTS "kyc-documents delete own" ON storage.objects;
CREATE POLICY "kyc-documents delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

DROP FUNCTION IF EXISTS public.submit_driver_kyc(TEXT, TEXT, DATE);

CREATE OR REPLACE FUNCTION public.submit_driver_kyc(
  p_document_type   TEXT,
  p_document_number TEXT,
  p_document_photo  TEXT,
  p_selfie_photo    TEXT,
  p_vehicle_photo   TEXT
) RETURNS public.kyc_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me      UUID;
  v_current public.kyc_status;
  v_number  TEXT := upper(regexp_replace(coalesce(p_document_number, ''), '[^A-Za-z0-9]', '', 'g'));
  v_path    TEXT;
BEGIN
  v_me := public.current_app_user_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  IF p_document_type = 'national_id' AND v_number !~ '^[0-9]{7,9}$' THEN
    RAISE EXCEPTION 'Enter the 7 to 9 digits on your ID.' USING ERRCODE = '22023';
  ELSIF p_document_type = 'driving_licence' AND v_number !~ '^[A-Z]{1,3}[0-9]{5,9}$' THEN
    RAISE EXCEPTION 'Enter your licence number as printed, like DL0123456.' USING ERRCODE = '22023';
  ELSIF p_document_type = 'passport' AND v_number !~ '^[A-Z]{1,2}[0-9]{6,8}$' THEN
    RAISE EXCEPTION 'Enter your passport number as printed, like AK0123456.' USING ERRCODE = '22023';
  ELSIF p_document_type IS NULL OR p_document_type NOT IN ('national_id', 'driving_licence', 'passport') THEN
    RAISE EXCEPTION 'Choose a document to continue.' USING ERRCODE = '22023';
  END IF;

  FOREACH v_path IN ARRAY ARRAY[p_document_photo, p_selfie_photo, p_vehicle_photo] LOOP
    IF v_path IS NULL OR v_path NOT LIKE v_me::text || '/%' THEN
      RAISE EXCEPTION 'Add a photo of your document, yourself and your car.' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM storage.objects o
       WHERE o.bucket_id = 'kyc-documents' AND o.name = v_path
    ) THEN
      RAISE EXCEPTION 'One of the photos did not finish uploading. Add it again.' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  SELECT d.approval_status INTO v_current
    FROM public.driver_profiles d WHERE d.user_id = v_me;

  IF v_current = 'approved' THEN
    RETURN v_current;
  END IF;

  INSERT INTO public.driver_profiles AS dp (
    user_id, document_type, document_number, document_photo, selfie_photo, vehicle_photo,
    national_id, license_number, approval_status, background_check_status
  ) VALUES (
    v_me, p_document_type, v_number, p_document_photo, p_selfie_photo, p_vehicle_photo,
    CASE WHEN p_document_type = 'national_id' THEN v_number END,
    CASE WHEN p_document_type = 'driving_licence' THEN v_number END,
    'pending', 'pending'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    document_type           = EXCLUDED.document_type,
    document_number         = EXCLUDED.document_number,
    document_photo          = EXCLUDED.document_photo,
    selfie_photo            = EXCLUDED.selfie_photo,
    vehicle_photo           = EXCLUDED.vehicle_photo,
    national_id             = COALESCE(EXCLUDED.national_id, dp.national_id),
    license_number          = COALESCE(EXCLUDED.license_number, dp.license_number),
    approval_status         = 'pending',
    background_check_status = 'pending',
    updated_at              = NOW();

  RETURN 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_driver_kyc(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_driver_kyc(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.pending_driver_applications();

CREATE OR REPLACE FUNCTION public.pending_driver_applications()
RETURNS TABLE (
  user_id         UUID,
  full_name       TEXT,
  avatar_url      TEXT,
  phone           TEXT,
  document_type   TEXT,
  document_number TEXT,
  national_id     TEXT,
  license_number  TEXT,
  license_expiry  DATE,
  document_photo  TEXT,
  license_photo   TEXT,
  selfie_photo    TEXT,
  vehicle_photo   TEXT,
  approval_status public.kyc_status,
  waiting_rides   INTEGER,
  submitted_at    TIMESTAMPTZ
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
         d.document_type, d.document_number, d.national_id, d.license_number, d.license_expiry,
         d.document_photo, d.license_photo, d.selfie_photo, d.vehicle_photo,
         d.approval_status,
         (SELECT count(*)::INTEGER FROM public.trips t
           WHERE t.driver_id = d.user_id AND t.status = 'awaiting_approval'),
         COALESCE(d.updated_at, d.created_at)
    FROM public.driver_profiles d
    JOIN public.users u ON u.id = d.user_id
   WHERE d.approval_status = 'pending'
   ORDER BY COALESCE(d.updated_at, d.created_at) ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.pending_driver_applications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pending_driver_applications() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_driver_approval(
  p_user_id UUID,
  p_status  public.kyc_status
) RETURNS public.kyc_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
       AND (t.departure_date + t.departure_time) <= NOW();
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
           OR (
             d.approval_status = 'pending'
             AND (trips.status = 'awaiting_approval' OR public.flag_enabled('publish_before_approval'))
           )
         )
    )
  );

CREATE OR REPLACE FUNCTION public.guard_awaiting_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND OLD.status = 'awaiting_approval'
     AND NEW.status NOT IN ('awaiting_approval', 'cancelled') THEN
    RAISE EXCEPTION 'This ride goes live once your driver account is approved'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_awaiting_approval ON public.trips;
CREATE TRIGGER trg_guard_awaiting_approval
  BEFORE UPDATE OF status ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.guard_awaiting_approval();

DROP TRIGGER IF EXISTS trg_broadcast_approved_trip ON public.trips;
CREATE TRIGGER trg_broadcast_approved_trip
  AFTER UPDATE OF status ON public.trips
  FOR EACH ROW
  WHEN (OLD.status = 'awaiting_approval' AND NEW.status = 'posted')
  EXECUTE FUNCTION public.broadcast_new_trip();

UPDATE public.feature_flags
   SET enabled = FALSE, updated_at = NOW()
 WHERE key = 'publish_before_approval';

COMMIT;
