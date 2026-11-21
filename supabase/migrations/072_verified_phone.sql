-- Verified phone numbers: where a number came from, and who may see it.
--
-- Decision (CEO, 20 Nov 2026, Q22 to Q24 in kipita-pilot-decisions.md): sign-in is by
-- email only. A phone number is a separate detail that is verified once:
--   * a driver verifies it with an SMS code before submitting driver verification;
--   * a passenger's M-Pesa number is marked verified by their first successful
--     payment (the M-Pesa prompt only reaches the phone holding that SIM, and the
--     payer must enter their PIN);
--   * a number is shown to the other person on a booking, and used for payouts,
--     only when it is verified.
--
-- What this migration does
--   1. users.phone_verified_via ('sms' | 'mpesa') and users.phone_verified_at.
--   2. payments.payer_phone: the number the M-Pesa prompt was sent to. Safaricom
--      masks the payer's number in callbacks since 24 Mar 2026, so the number we
--      sent the prompt to is the only reliable record of it.
--   3. sync_auth_user_profile(): stops wiping users.phone / phone_verified when the
--      auth record has no phone. Until now every email, confirmation or metadata
--      update on auth.users copied a NULL phone over a stored one, which would
--      erase a number verified by payment. When the auth record does carry a
--      phone, it still wins (that is the SMS-verified number) and is marked 'sms'.
--   4. mark_phone_verified_by_payment(user, phone): server only. Marks the number
--      verified by payment, but never replaces a number that is already verified
--      (changing a verified number goes through the SMS flow, so a payment cannot
--      quietly redirect payouts).
--   5. booking_contact_phone(): returns the other person's number only if it is
--      verified (NULL otherwise). No web screen calls it yet.
--   6. submit_driver_kyc(): refuses a driver whose phone is not verified. The
--      check sits straight after the sign-in check, before any photo is looked at.
--   7. Two Help answers that described phone sign-in are reworded.
--
-- Not changed: column grants. The new columns get no grant for anon or
-- authenticated, so nobody reads them with a plain select; the signed-in person
-- reads their own through current_user_profile(), which returns the whole row.
-- Not in this migration: the waiting period before payouts go to a changed number
-- (length not decided yet). phone_verified_at is stored so the payout code can
-- apply it later.
--
-- Caller audit (repo, 20 Nov): mark_phone_verified_by_payment is called only by the
-- confirm-payment edge function (service role). booking_contact_phone has no
-- caller in apps/web. submit_driver_kyc is called by lib/driver/actions.ts.
--
-- Safe to run more than once.

BEGIN;

-- 1. How and when a number was verified -----------------------------------------

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_verified_via TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified_at  TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_verified_via_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_phone_verified_via_check
      CHECK (phone_verified_via IN ('sms', 'mpesa'));
  END IF;
END $$;

-- Numbers already verified before this migration came from an SMS code.
UPDATE public.users
   SET phone_verified_via = 'sms',
       phone_verified_at  = COALESCE(phone_verified_at, updated_at, NOW())
 WHERE phone_verified
   AND phone_verified_via IS NULL;

-- 2. The number each M-Pesa prompt was sent to ----------------------------------

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payer_phone TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_payer_phone_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_payer_phone_check
      CHECK (payer_phone IS NULL OR payer_phone ~ '^254[17][0-9]{8}$');
  END IF;
END $$;

-- 3. Keep a verified number when the auth record has none -----------------------

CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_name        TEXT;
  profile_avatar_url  TEXT;
  auth_phone_verified BOOLEAN := NEW.phone_confirmed_at IS NOT NULL;
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
    phone_verified,
    phone_verified_via,
    phone_verified_at
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
    auth_phone_verified,
    CASE WHEN auth_phone_verified THEN 'sms' END,
    CASE WHEN auth_phone_verified THEN NEW.phone_confirmed_at END
  )
  ON CONFLICT (auth_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    -- The auth record wins when it has a phone; otherwise keep what we hold
    -- (a number verified by payment is not in the auth record).
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    email_verified = EXCLUDED.email_verified,
    phone_verified = CASE
      WHEN EXCLUDED.phone IS NOT NULL THEN EXCLUDED.phone_verified
      ELSE public.users.phone_verified
    END,
    phone_verified_via = CASE
      WHEN EXCLUDED.phone IS NULL THEN public.users.phone_verified_via
      WHEN EXCLUDED.phone_verified THEN 'sms'
      ELSE NULL
    END,
    phone_verified_at = CASE
      WHEN EXCLUDED.phone IS NULL THEN public.users.phone_verified_at
      WHEN EXCLUDED.phone_verified
        THEN COALESCE(EXCLUDED.phone_verified_at, public.users.phone_verified_at, NOW())
      ELSE NULL
    END,
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
$$;

-- 4. Mark a number verified by a successful payment (server only) ---------------

CREATE OR REPLACE FUNCTION public.mark_phone_verified_by_payment(
  p_user_id UUID,
  p_phone   TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
BEGIN
  IF v_phone ~ '^0[17][0-9]{8}$' THEN
    v_phone := '254' || substr(v_phone, 2);
  END IF;
  IF v_phone !~ '^254[17][0-9]{8}$' THEN
    RETURN FALSE;
  END IF;

  -- Never replace a number that is already verified.
  UPDATE public.users
     SET phone              = v_phone,
         phone_verified     = TRUE,
         phone_verified_via = 'mpesa',
         phone_verified_at  = NOW(),
         updated_at         = NOW()
   WHERE id = p_user_id
     AND COALESCE(phone_verified, FALSE) = FALSE;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_phone_verified_by_payment(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_phone_verified_by_payment(UUID, TEXT)
  TO service_role;

-- 5. Show the other person's number only when it is verified --------------------

CREATE OR REPLACE FUNCTION public.booking_contact_phone(p_booking_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT u.phone INTO v_phone
    FROM public.users u
   WHERE u.id = CASE WHEN v_me = v_b.passenger_id THEN v_b.driver_id ELSE v_b.passenger_id END
     AND u.phone_verified;

  RETURN v_phone;
END;
$$;

REVOKE ALL ON FUNCTION public.booking_contact_phone(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_contact_phone(UUID) TO authenticated;

-- 6. Driver verification needs a verified phone ---------------------------------

CREATE OR REPLACE FUNCTION public.submit_driver_kyc(
  p_document_type  TEXT,
  p_document_number TEXT,
  p_document_photo TEXT,
  p_selfie_photo   TEXT,
  p_vehicle_photo  TEXT
)
RETURNS public.kyc_status
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

  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = v_me AND u.phone_verified
  ) THEN
    RAISE EXCEPTION 'Verify your phone number first.' USING ERRCODE = '22023';
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

-- 7. Help answers that described phone sign-in ---------------------------------
-- Matched by question text (ids differ between environments). Apply this migration
-- together with the web deploy that removes the Phone tab, so the answer and the
-- sign-in page change at the same time. Running it again changes nothing.

UPDATE public.faqs
   SET question = 'Do I need a phone number to sign up?',
       answer   = 'No. You sign up and sign in with your email. Add your phone number in your profile when you are ready: drivers confirm it once with a code we text them, and a passenger''s number is confirmed the first time they pay by M-Pesa.'
 WHERE question = 'Can I sign up with my phone number?';

UPDATE public.faqs
   SET answer = 'Head to your profile. Your phone number has its own card: add or change it there and confirm it with the code we text you. To change your email, edit your details and confirm the link we send you.'
 WHERE question = 'How do I change my email or phone?'
   AND answer = 'Head to your profile, edit your details, and confirm the change via the code or link we send you.';

COMMIT;
