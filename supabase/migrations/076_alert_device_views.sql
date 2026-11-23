ALTER TABLE public.alert_views
  ADD COLUMN IF NOT EXISTS device_id UUID;

ALTER TABLE public.alert_views
  DROP CONSTRAINT IF EXISTS alert_views_pkey;

ALTER TABLE public.alert_views
  ALTER COLUMN user_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_views_alert_user_key'
  ) THEN
    ALTER TABLE public.alert_views
      ADD CONSTRAINT alert_views_alert_user_key UNIQUE (alert_id, user_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS alert_views_alert_device_key
  ON public.alert_views (alert_id, device_id)
  WHERE device_id IS NOT NULL;

ALTER TABLE public.alert_views
  DROP CONSTRAINT IF EXISTS alert_views_owner_present;
ALTER TABLE public.alert_views
  ADD CONSTRAINT alert_views_owner_present
  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.record_alert_impressions(
  p_alert_ids UUID[],
  p_device_id UUID
)
RETURNS TABLE (alert_id UUID, views_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID := public.current_app_user_id();
  v_id UUID;
  v_rows INTEGER;
BEGIN
  IF p_device_id IS NULL OR p_alert_ids IS NULL THEN
    RETURN;
  END IF;

  FOREACH v_id IN ARRAY p_alert_ids[1:50] LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM public.announcements a
       WHERE a.id = v_id
         AND (v_user_id IS NULL OR a.user_id <> v_user_id)
    );

    INSERT INTO public.alert_views (alert_id, user_id, device_id)
    VALUES (v_id, NULL, p_device_id)
    ON CONFLICT (alert_id, device_id) WHERE device_id IS NOT NULL DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
      UPDATE public.announcements
         SET views_count = public.announcements.views_count + 1
       WHERE id = v_id;
    END IF;

    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.alert_views (alert_id, user_id)
      VALUES (v_id, v_user_id)
      ON CONFLICT (alert_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN QUERY
    SELECT a.id, a.views_count
      FROM public.announcements a
     WHERE a.id = ANY (p_alert_ids[1:50]);
END;
$$;

REVOKE ALL ON FUNCTION public.record_alert_impressions(UUID[], UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_alert_impressions(UUID[], UUID) TO anon, authenticated;
