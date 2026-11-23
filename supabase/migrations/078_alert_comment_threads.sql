ALTER TABLE public.alert_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID
  REFERENCES public.alert_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_alert_comments_parent
  ON public.alert_comments (parent_id, created_at)
  WHERE parent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.alert_comment_thread_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_parent public.alert_comments%ROWTYPE;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_parent FROM public.alert_comments WHERE id = NEW.parent_id;

  IF NOT FOUND OR v_parent.alert_id <> NEW.alert_id THEN
    RAISE EXCEPTION 'Reply target is not on this alert' USING ERRCODE = '23503';
  END IF;

  IF v_parent.parent_id IS NOT NULL THEN
    NEW.parent_id := v_parent.parent_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Alert comments delete own" ON public.alert_comments;
CREATE POLICY "Alert comments delete own" ON public.alert_comments
  FOR DELETE USING (user_id = public.current_app_user_id());

GRANT DELETE ON public.alert_comments TO authenticated;

DROP TRIGGER IF EXISTS trg_alert_comment_thread_guard ON public.alert_comments;
CREATE TRIGGER trg_alert_comment_thread_guard
BEFORE INSERT ON public.alert_comments
FOR EACH ROW EXECUTE FUNCTION public.alert_comment_thread_guard();
