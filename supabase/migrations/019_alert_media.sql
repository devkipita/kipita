-- ══════════════════════════════════════════════════════════════
-- 019 — ALERT MEDIA BUCKET
--
-- Storage for photos attached to road alerts (public.announcements.image_url).
--
-- Mirrors the `avatars` block in 011 exactly, including the one detail that
-- matters: the owner check compares the first folder to current_app_user_id()
-- (the PUBLIC users.id), NOT auth.uid(). Those two ids are never equal, and
-- comparing against auth.uid() is precisely what broke chat-media uploads
-- before 011 fixed them.
--
-- Objects are laid out as  <users.id>/<uuid>.<ext>.
--
-- Note: public.announcements has no DELETE policy, so an alert can never be
-- removed from a client — and neither, therefore, can its object be orphaned
-- by a delete. Cleanup of objects whose alert insert failed is left to the
-- uploader, which deletes on a failed insert.
-- ══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'alert-media',
  'alert-media',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "alert-media read" ON storage.objects;
CREATE POLICY "alert-media read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'alert-media');

DROP POLICY IF EXISTS "alert-media insert own" ON storage.objects;
CREATE POLICY "alert-media insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'alert-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

DROP POLICY IF EXISTS "alert-media update own" ON storage.objects;
CREATE POLICY "alert-media update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'alert-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );

DROP POLICY IF EXISTS "alert-media delete own" ON storage.objects;
CREATE POLICY "alert-media delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'alert-media'
    AND (storage.foldername(name))[1] = current_app_user_id()::text
  );
