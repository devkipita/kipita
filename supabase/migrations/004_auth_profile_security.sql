-- Kipita authentication hardening and profile provisioning.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_prompt_dismissed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_name TEXT;
BEGIN
  profile_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(CONCAT_WS(' ', NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name')), ''),
    ''
  );

  INSERT INTO public.users (
    auth_id,
    full_name,
    first_name,
    last_name,
    phone,
    email,
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
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_changed
AFTER INSERT OR UPDATE OF email, phone, email_confirmed_at, phone_confirmed_at, raw_user_meta_data
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_profile();

-- Backfill profiles for any auth users created before the trigger was deployed.
INSERT INTO public.users (auth_id, full_name, phone, email, email_verified, phone_verified)
SELECT
  id,
  COALESCE(NULLIF(TRIM(raw_user_meta_data ->> 'full_name'), ''), ''),
  phone,
  email,
  email_confirmed_at IS NOT NULL,
  phone_confirmed_at IS NOT NULL
FROM auth.users
ON CONFLICT (auth_id) DO NOTHING;

DROP POLICY IF EXISTS "Users can update own" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Public app surfaces may read only non-sensitive profile attributes. Phone,
-- email and auth identifiers are never selectable through the client role.
REVOKE SELECT ON public.users FROM anon, authenticated;
GRANT SELECT (
  id,
  full_name,
  first_name,
  last_name,
  avatar_url,
  date_of_birth,
  gender,
  preferred_language,
  country,
  city,
  is_verified,
  rating,
  total_trips,
  created_at,
  updated_at,
  profile_prompt_dismissed_at
) ON public.users TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS SETOF public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_profile() TO authenticated;

-- Clients may update only non-sensitive profile fields. Verification and auth
-- identifiers remain owned by Supabase Auth and the database trigger above.
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (
  full_name,
  first_name,
  last_name,
  avatar_url,
  date_of_birth,
  gender,
  preferred_language,
  country,
  city,
  profile_prompt_dismissed_at,
  updated_at
) ON public.users TO authenticated;