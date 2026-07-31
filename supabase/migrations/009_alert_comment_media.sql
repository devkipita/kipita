-- Allow image / GIF attachments on alert comments.
-- Images are uploaded to the public `chat-media` bucket (same as chat); GIFs are
-- stored as remote Giphy URLs. Either way we persist just the URL here.

ALTER TABLE public.alert_comments
  ADD COLUMN IF NOT EXISTS image_url TEXT;
