-- Fix media uploads + add a dedicated avatars bucket.
--
-- Root cause of failing uploads: the client stores files under
--   <users.id>/<file>            (the PUBLIC profile id)
-- but the original chat-media storage policies compared the first folder to
-- auth.uid() (the AUTH id). Those two ids are never equal, so every image /
-- voice-note upload was rejected by RLS. We repoint the policies at the
-- caller's public users.id via the existing current_app_user_id() helper.

-- ── chat-media: correct the owner check ──────────────────────────────────
DROP POLICY IF EXISTS "chat-media insert own" ON storage.objects;
CREATE POLICY "chat-media insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

DROP POLICY IF EXISTS "chat-media delete own" ON storage.objects;
CREATE POLICY "chat-media delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

-- ── avatars: public bucket for profile pictures ──────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

CREATE POLICY "avatars update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

CREATE POLICY "avatars delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );
