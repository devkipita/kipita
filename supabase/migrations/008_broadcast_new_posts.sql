-- ════════════════════════════════════════════════════════════════════════
-- 008_broadcast_new_posts.sql
-- When a driver posts a trip or a passenger posts a ride request, fan a
-- notification out to every other active user. Because these rows land in
-- `notifications`, the push trigger from 007 also delivers them to devices —
-- so "new ride" / "new ride request" arrives both in-app and as a push.
--
-- Broadcasting must be SECURITY DEFINER: the notifications RLS policy only
-- lets a user insert rows for themselves, so a client can never notify others.
-- ════════════════════════════════════════════════════════════════════════

-- ── New trip (driver offering seats) → tell everyone else ────────────────
CREATE OR REPLACE FUNCTION public.broadcast_new_trip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'posted' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    u.id,
    'ride_match',
    'New ride available',
    NEW.from_location || ' → ' || NEW.to_location,
    jsonb_build_object(
      'trip_id', NEW.id,
      'from', NEW.from_location,
      'to', NEW.to_location
    )
  FROM public.users u
  WHERE u.id <> NEW.driver_id
    AND u.status = 'active';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_new_trip ON public.trips;
CREATE TRIGGER trg_broadcast_new_trip
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_new_trip();

-- ── New ride request (passenger looking for a ride) → tell everyone else ──
CREATE OR REPLACE FUNCTION public.broadcast_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    u.id,
    'request_match',
    'New ride request',
    NEW.from_location || ' → ' || NEW.to_location,
    jsonb_build_object(
      'request_id', NEW.id,
      'from', NEW.from_location,
      'to', NEW.to_location
    )
  FROM public.users u
  WHERE u.id <> NEW.passenger_id
    AND u.status = 'active';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_new_request ON public.ride_requests;
CREATE TRIGGER trg_broadcast_new_request
  AFTER INSERT ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_new_request();
