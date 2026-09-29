ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS confirms_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleared_count  INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.alert_confirmations (
  alert_id   UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('still_there','cleared')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (alert_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_confirmations_alert
  ON public.alert_confirmations(alert_id);

CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower
  ON public.user_follows(follower_id);

CREATE TABLE IF NOT EXISTS public.alert_saves (
  alert_id   UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (alert_id, user_id)
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trusted_reporter BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.sync_alert_confirmation_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target UUID;
BEGIN
  target := COALESCE(NEW.alert_id, OLD.alert_id);

  UPDATE public.announcements a
     SET confirms_count = (
           SELECT count(*) FROM public.alert_confirmations c
            WHERE c.alert_id = target AND c.kind = 'still_there'
         ),
         cleared_count = (
           SELECT count(*) FROM public.alert_confirmations c
            WHERE c.alert_id = target AND c.kind = 'cleared'
         ),
         updated_at = NOW()
   WHERE a.id = target;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_alert_confirmations ON public.alert_confirmations;
CREATE TRIGGER trg_alert_confirmations
AFTER INSERT OR UPDATE OR DELETE ON public.alert_confirmations
FOR EACH ROW EXECUTE FUNCTION public.sync_alert_confirmation_counts();

CREATE OR REPLACE FUNCTION public.sync_trusted_reporter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users u
     SET trusted_reporter = (
           SELECT count(*) >= 3
             FROM public.announcements a
            WHERE a.user_id = NEW.user_id
              AND a.confirms_count >= 2
         )
   WHERE u.id = NEW.user_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_trusted_reporter ON public.announcements;
CREATE TRIGGER trg_trusted_reporter
AFTER UPDATE OF confirms_count ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.sync_trusted_reporter();

ALTER TABLE public.alert_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_saves         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alert confirmations readable" ON public.alert_confirmations;
CREATE POLICY "Alert confirmations readable" ON public.alert_confirmations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Alert confirmations own write" ON public.alert_confirmations;
CREATE POLICY "Alert confirmations own write" ON public.alert_confirmations
  FOR ALL USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Follows readable" ON public.user_follows;
CREATE POLICY "Follows readable" ON public.user_follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Follows own write" ON public.user_follows;
CREATE POLICY "Follows own write" ON public.user_follows
  FOR ALL USING (follower_id = public.current_app_user_id())
  WITH CHECK (follower_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Saves own" ON public.alert_saves;
CREATE POLICY "Saves own" ON public.alert_saves
  FOR ALL USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Alerts editable for five minutes" ON public.announcements;
CREATE POLICY "Alerts editable for five minutes" ON public.announcements
  FOR UPDATE
  USING (
    user_id = public.current_app_user_id()
    AND created_at > NOW() - INTERVAL '5 minutes'
  )
  WITH CHECK (
    user_id = public.current_app_user_id()
    AND created_at > NOW() - INTERVAL '5 minutes'
  );

DROP POLICY IF EXISTS "Alerts deletable for five minutes" ON public.announcements;
CREATE POLICY "Alerts deletable for five minutes" ON public.announcements
  FOR DELETE
  USING (
    user_id = public.current_app_user_id()
    AND created_at > NOW() - INTERVAL '5 minutes'
  );

REVOKE UPDATE ON public.announcements FROM authenticated;
GRANT UPDATE (location, category, content, image_url, lat, lng, updated_at)
  ON public.announcements TO authenticated;
GRANT DELETE ON public.announcements TO authenticated;

GRANT SELECT (trusted_reporter) ON public.users TO anon, authenticated;

GRANT SELECT ON public.alert_confirmations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.alert_confirmations TO authenticated;
GRANT SELECT ON public.user_follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.user_follows TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.alert_saves TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END $$;

UPDATE public.announcements a
   SET lat = c.latitude, lng = c.longitude
  FROM public.cities c
 WHERE a.lat IS NULL
   AND a.location ILIKE '%' || c.name || '%';
