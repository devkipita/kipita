-- Keep auth-provider avatars in sync for users who have not uploaded a
-- Kipita-managed avatar to the storage bucket.

CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

UPDATE public.users AS profile
SET avatar_url = source.avatar_url,
    updated_at = NOW()
FROM (
  SELECT
    id,
    COALESCE(
      NULLIF(TRIM(raw_user_meta_data ->> 'avatar_url'), ''),
      NULLIF(TRIM(raw_user_meta_data ->> 'picture'), '')
    ) AS avatar_url
  FROM auth.users
) AS source
WHERE profile.auth_id = source.id
  AND source.avatar_url IS NOT NULL
  AND (
    profile.avatar_url IS NULL
    OR profile.avatar_url = ''
    OR profile.avatar_url NOT LIKE '%/storage/v1/object/public/avatars/%'
  );