-- 072_verified_phone_down.sql
-- Puts the database back as it was before 072 (verified phone numbers). NOT a migration: do not put it in
-- supabase/migrations. Run it by hand, and only if 072 has to be undone.
--
-- Before running:
--   * Redeploy the web app from before the verified-phone work first. The new screens and the driver phone
--     step expect the rules below; the old Phone tab on sign-in needs the old sign-in code.
--   * This deletes users.phone_verified_via, users.phone_verified_at and payments.payer_phone. Export them
--     first if any number has been verified by payment: after this script nothing records how a number was
--     verified, or which number each M-Pesa prompt went to.
--   * Redeploy the edge functions from before the work too. confirm-payment would otherwise keep calling
--     mark_phone_verified_by_payment, which this script drops (it only logs the error; the payment still
--     completes).
--
-- What it does: sync_auth_user_profile, booking_contact_phone and submit_driver_kyc go back to their pre-072
-- bodies (copied from a database at 067; grants are untouched by CREATE OR REPLACE and 072 never changed
-- them), mark_phone_verified_by_payment is dropped, the three columns and their two checks are dropped, and
-- the two Help answers go back to their old wording (text read from the live database on 20 Nov 2026; an
-- answer an admin has edited since will not match and is left alone). Phone numbers that 072 kept in
-- users.phone are not removed.
-- Note: the pre-072 sync_auth_user_profile copies a NULL auth phone over a stored phone again, so any number
-- verified by payment is erased the next time that person's auth record changes.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_name TEXT;
  profile_avatar_url TEXT;
BEGIN
  profile_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(CONCAT_WS(' ', NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name')), ''),
    ''
  );

  profile_avatar_url := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'picture'), '')
  );

  INSERT INTO public.users (
    auth_id,
    full_name,
    first_name,
    last_name,
    phone,
    email,
    avatar_url,
    email_verified,
    phone_verified
  )
  VALUES (
    NEW.id,
    profile_name,
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'first_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'last_name'), ''),
    NEW.phone,
    NEW.email,
    profile_avatar_url,
    NEW.email_confirmed_at IS NOT NULL,
    NEW.phone_confirmed_at IS NOT NULL
  )
  ON CONFLICT (auth_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    email_verified = EXCLUDED.email_verified,
    phone_verified = EXCLUDED.phone_verified,
    full_name = CASE
      WHEN public.users.full_name = '' THEN EXCLUDED.full_name
      ELSE public.users.full_name
    END,
    avatar_url = CASE
      WHEN public.users.avatar_url IS NULL
        OR public.users.avatar_url = ''
        OR public.users.avatar_url NOT LIKE '%/storage/v1/object/public/avatars/%'
      THEN COALESCE(EXCLUDED.avatar_url, public.users.avatar_url)
      ELSE public.users.avatar_url
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.booking_contact_phone(p_booking_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_phone TEXT;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_me IS NULL OR v_me NOT IN (v_b.passenger_id, v_b.driver_id) THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;
  IF v_b.status NOT IN ('confirmed', 'in_progress') THEN
    RAISE EXCEPTION 'Calling opens once the seat is paid' USING ERRCODE = '22023';
  END IF;

  SELECT phone INTO v_phone
    FROM public.users
   WHERE id = CASE WHEN v_me = v_b.passenger_id THEN v_b.driver_id ELSE v_b.passenger_id END;

  RETURN v_phone;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_driver_kyc(p_document_type text, p_document_number text, p_document_photo text, p_selfie_photo text, p_vehicle_photo text)
 RETURNS kyc_status
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

DROP FUNCTION IF EXISTS public.mark_phone_verified_by_payment(UUID, TEXT);

ALTER TABLE public.users    DROP CONSTRAINT IF EXISTS users_phone_verified_via_check;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payer_phone_check;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS phone_verified_via,
  DROP COLUMN IF EXISTS phone_verified_at;

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS payer_phone;

UPDATE public.faqs
   SET question = 'Can I sign up with my phone number?',
       answer   = 'Yes. Choose the Phone tab on sign in, enter your Kenyan number, and we''ll text you a 6-digit code to verify it.'
 WHERE question = 'Do I need a phone number to sign up?'
   AND answer   = 'No. You sign up and sign in with your email. Add your phone number in your profile when you are ready: drivers confirm it once with a code we text them, and a passenger''s number is confirmed the first time they pay by M-Pesa.';

UPDATE public.faqs
   SET answer = 'Head to your profile, edit your details, and confirm the change via the code or link we send you.'
 WHERE question = 'How do I change my email or phone?'
   AND answer   = 'Head to your profile. Your phone number has its own card: add or change it there and confirm it with the code we text you. To change your email, edit your details and confirm the link we send you.';

COMMIT;
