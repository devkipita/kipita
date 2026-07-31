-- ════════════════════════════════════════════════════════════════════════
-- 007_push_notifications.sql
-- Device push tokens + automatic Expo delivery for every notification row.
--
-- The client (registerForPushNotifications) stores an Expo push token on the
-- user's row. A trigger on notifications INSERT then delivers a push via the
-- Expo Push API using pg_net, so ANY code path that inserts a notification
-- (edge functions, future triggers) produces a device push automatically —
-- differentiated by the row's own type / title / body / data.
-- ════════════════════════════════════════════════════════════════════════

-- pg_net lets Postgres make outbound HTTP calls (available on Supabase).
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── Token storage ───────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_platform TEXT,
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

-- ── Delivery trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.push_notification_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT push_token INTO v_token
  FROM public.users
  WHERE id = NEW.user_id;

  -- No registered device → nothing to deliver (in-app row still stands).
  IF v_token IS NULL OR v_token = '' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept', 'application/json'
    ),
    body    := jsonb_build_object(
      'to', v_token,
      'title', NEW.title,
      'body', NEW.body,
      'sound', 'default',
      'channelId', 'default',
      -- Carry the type so the app can theme + route the tap (see routeFromData).
      'data', COALESCE(NEW.data, '{}'::jsonb) || jsonb_build_object('type', NEW.type)
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let a delivery hiccup roll back the notification insert.
  RAISE WARNING 'push delivery failed for notification %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_notification ON public.notifications;
CREATE TRIGGER trg_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.push_notification_on_insert();
