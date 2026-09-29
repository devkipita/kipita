-- ══════════════════════════════════════════════════════════════
-- 025 — SUPPORT ATTACHMENTS
--
-- Screenshots sent to support carry receipts, chat logs and sometimes
-- documents, so unlike `alert-media` this bucket is PRIVATE and read back
-- through signed URLs. A random path is obscurity, not access control.
--
-- Objects are laid out as <users.id>/<case id>/<uuid>.<ext>, and the owner
-- check compares the first folder to current_app_user_id() (the PUBLIC
-- users.id), never auth.uid() — the mismatch migration 011 exists to fix.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.support_case_messages
  ADD COLUMN IF NOT EXISTS image_path TEXT;

-- A message may be an image with no words, so the body stops being required.
ALTER TABLE public.support_case_messages
  ALTER COLUMN body SET DEFAULT '';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-media',
  'support-media',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "support-media read own" ON storage.objects;
CREATE POLICY "support-media read own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-media'
    AND (
      (storage.foldername(name))[1] = public.current_app_user_id()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "support-media insert own" ON storage.objects;
CREATE POLICY "support-media insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-media'
    AND (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

DROP POLICY IF EXISTS "support-media delete own" ON storage.objects;
CREATE POLICY "support-media delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'support-media'
    AND (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

-- Staff replies have to arrive without a refresh.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'support_case_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_case_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'support_cases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_cases;
  END IF;
END $$;
