-- ══════════════════════════════════════════
-- MESSAGE ATTACHMENTS (images, GIFs, voice notes)
-- ══════════════════════════════════════════
-- Adds attachment columns to messages and a public 'chat-media' storage bucket.
-- Text messages keep using `content`; media-only messages send content = '' and
-- carry the file in attachment_url with type/meta describing it.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_type TEXT
    CHECK (attachment_type IN ('image', 'gif', 'audio')),
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT,
  ADD COLUMN IF NOT EXISTS attachment_meta JSONB;

-- Allow media-only messages (empty text) without dropping the NOT NULL guard.
ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';

-- ── Storage bucket for chat media ──────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  TRUE,
  26214400, -- 25 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','audio/m4a','audio/mp4','audio/mpeg','audio/aac','audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (bucket is public); only authenticated users can upload,
-- and each user may only write under their own <uid>/ prefix.
CREATE POLICY "chat-media read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');

CREATE POLICY "chat-media insert own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chat-media delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
