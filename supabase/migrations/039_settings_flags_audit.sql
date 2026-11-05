BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by  UUID REFERENCES public.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  label       TEXT NOT NULL DEFAULT '',
  updated_by  UUID REFERENCES public.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES public.users(id),
  action      TEXT NOT NULL,
  subject     TEXT,
  subject_id  TEXT,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created
  ON public.admin_actions (created_at DESC);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public settings readable" ON public.platform_settings;
CREATE POLICY "Public settings readable" ON public.platform_settings
  FOR SELECT USING (is_public OR public.is_admin());

DROP POLICY IF EXISTS "Flags readable" ON public.feature_flags;
CREATE POLICY "Flags readable" ON public.feature_flags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Audit readable by admins" ON public.admin_actions;
CREATE POLICY "Audit readable by admins" ON public.admin_actions
  FOR SELECT USING (public.is_admin());

GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT SELECT ON public.admin_actions TO authenticated;

CREATE OR REPLACE FUNCTION public.setting(p_key TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.value FROM public.platform_settings s WHERE s.key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.setting_numeric(p_key TEXT, p_default NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((public.setting(p_key) #>> '{}')::NUMERIC, p_default);
$$;

CREATE OR REPLACE FUNCTION public.flag_enabled(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT f.enabled FROM public.feature_flags f WHERE f.key = p_key), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.record_admin_action(
  p_action     TEXT,
  p_subject    TEXT DEFAULT NULL,
  p_subject_id TEXT DEFAULT NULL,
  p_detail     JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.admin_actions (actor_id, action, subject, subject_id, detail)
  VALUES (public.current_app_user_id(), p_action, p_subject, p_subject_id, p_detail)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_setting(p_key TEXT, p_value JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT s.value INTO v_old FROM public.platform_settings s WHERE s.key = p_key;

  INSERT INTO public.platform_settings (key, value, updated_by, updated_at)
  VALUES (p_key, p_value, public.current_app_user_id(), NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = p_value,
        updated_by = public.current_app_user_id(),
        updated_at = NOW();

  PERFORM public.record_admin_action(
    'setting.update', 'platform_settings', p_key,
    jsonb_build_object('from', v_old, 'to', p_value)
  );

  RETURN p_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_flag(p_key TEXT, p_enabled BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT f.enabled INTO v_old FROM public.feature_flags f WHERE f.key = p_key;

  INSERT INTO public.feature_flags (key, enabled, updated_by, updated_at)
  VALUES (p_key, p_enabled, public.current_app_user_id(), NOW())
  ON CONFLICT (key) DO UPDATE
    SET enabled = p_enabled,
        updated_by = public.current_app_user_id(),
        updated_at = NOW();

  PERFORM public.record_admin_action(
    'flag.update', 'feature_flags', p_key,
    jsonb_build_object('from', v_old, 'to', p_enabled)
  );

  RETURN p_enabled;
END;
$$;

INSERT INTO public.platform_settings (key, value, label, is_public) VALUES
  ('platform_fee_percent', '12'::jsonb,   'Kipita fee, percent of the fare', TRUE),
  ('hold_minutes',         '30'::jsonb,   'Minutes a passenger has to pay',  TRUE),
  ('fuel_cost_per_km',     '12.5'::jsonb, 'KES per km used to suggest a fare', TRUE),
  ('fare_margin_percent',  '15'::jsonb,   'Headroom above fuel cost in the suggestion', TRUE)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.feature_flags (key, enabled, label) VALUES
  ('send',            FALSE, 'Kipita Send — parcels on return trips'),
  ('live_tracking',   FALSE, 'Share live location during a trip'),
  ('road_alerts',     TRUE,  'Road alerts feed'),
  ('instant_booking', FALSE, 'Skip driver approval and hold the seat immediately'),
  ('ride_chat',       TRUE,  'Chat between driver and passenger on a live ride'),
  ('web_push',        FALSE, 'Browser push notifications')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS fee_percent NUMERIC(5,2);

REVOKE ALL ON FUNCTION public.set_setting(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_flag(TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_admin_action(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.setting(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.setting_numeric(TEXT, NUMERIC) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.flag_enabled(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_setting(TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_flag(TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_admin_action(TEXT, TEXT, TEXT, JSONB) TO service_role;

COMMIT;
