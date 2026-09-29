ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.alert_views (
  alert_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (alert_id, user_id)
);

ALTER TABLE public.alert_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alert views own" ON public.alert_views;
CREATE POLICY "Alert views own" ON public.alert_views
  FOR SELECT USING (user_id = public.current_app_user_id());

CREATE OR REPLACE FUNCTION public.record_alert_view(p_alert_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_rows INTEGER := 0;
  v_total INTEGER;
BEGIN
  v_user_id := public.current_app_user_id();

  IF v_user_id IS NULL THEN
    SELECT views_count INTO v_total FROM public.announcements WHERE id = p_alert_id;
    RETURN COALESCE(v_total, 0);
  END IF;

  INSERT INTO public.alert_views (alert_id, user_id)
  VALUES (p_alert_id, v_user_id)
  ON CONFLICT (alert_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    UPDATE public.announcements
       SET views_count = views_count + 1
     WHERE id = p_alert_id
    RETURNING views_count INTO v_total;
  ELSE
    SELECT views_count INTO v_total FROM public.announcements WHERE id = p_alert_id;
  END IF;

  RETURN COALESCE(v_total, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.record_alert_view(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_alert_view(UUID) TO anon, authenticated;

GRANT SELECT ON public.alert_views TO authenticated;

-- An ungranted column makes Postgres deny the whole table rather than the one
-- field, which is what emptied the home page after migration 004.
GRANT SELECT (
  id, user_id, location, category, content, image_url, lat, lng,
  reactions_count, comments_count, confirms_count, cleared_count, views_count,
  created_at, updated_at
) ON public.announcements TO anon, authenticated;
