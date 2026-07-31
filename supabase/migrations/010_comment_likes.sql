-- Likes on individual alert comments. Mirrors the alert_reactions pattern:
-- a join table for who liked, plus a denormalised counter maintained by trigger.

ALTER TABLE public.alert_comments
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.alert_comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes(comment_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone may read (needed so a signed-in user can see which comments they liked);
-- users may only add/remove their own likes.
CREATE POLICY "Comment likes read" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Comment likes write own" ON public.comment_likes
  FOR ALL
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Keep alert_comments.likes_count in sync.
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.alert_comments
      SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.alert_comments
      SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_comment_likes
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_like_count();
