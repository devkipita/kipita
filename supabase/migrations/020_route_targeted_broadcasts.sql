-- ══════════════════════════════════════════════════════════════
-- 020 — ROUTE-TARGETED BROADCASTS
--
-- 008 fanned every new trip / ride request out to EVERY active user, with no
-- rate limit, synchronously inside the poster's transaction. That was already
-- noisy; now that the web app can post too, it is a liability — at 10k users
-- one post is a 10k-row insert on the submit path.
--
-- This migration narrows the audience to people who actually care about the
-- route:
--   * a trip notifies passengers with an open matching ride request, plus
--     anyone who recently searched that route;
--   * a ride request notifies drivers with a matching posted trip, plus
--     anyone who recently searched it.
--
-- Route interest comes from `route_interests`, written by the web home page on
-- every search via record_route_interest(). Mobile does not write these rows
-- yet, so its searches do not attract notifications until that lands.
--
-- Also adds a modest per-user posting throttle. It lives in the database, not
-- in the server action, because `trips` RLS permits a direct PostgREST insert
-- with a session cookie — an application-level check is one curl away from
-- being bypassed.
-- ══════════════════════════════════════════════════════════════

-- ── Location matching ───────────────────────────────────────────────────
-- Locations are free text ("Nairobi", "nairobi cbd", "Nairobi CBD"), so match
-- case-insensitively in either containment direction. position() is used
-- rather than LIKE because user input routinely contains % and _, which LIKE
-- would treat as wildcards.
CREATE OR REPLACE FUNCTION public.loc_matches(a TEXT, b TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN a IS NULL OR b IS NULL THEN FALSE
    ELSE position(lower(btrim(b)) IN lower(btrim(a))) > 0
      OR position(lower(btrim(a)) IN lower(btrim(b))) > 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.route_matches(
  a_from TEXT, a_to TEXT, b_from TEXT, b_to TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.loc_matches(a_from, b_from) AND public.loc_matches(a_to, b_to);
$$;

-- ── Route interest ──────────────────────────────────────────────────────
-- One row per user per route. Values are stored already normalised (trimmed,
-- lower-cased) because this table is a matching index, not display data.
CREATE TABLE IF NOT EXISTS public.route_interests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_location    TEXT NOT NULL,
  to_location      TEXT NOT NULL,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, from_location, to_location)
);

CREATE INDEX IF NOT EXISTS idx_route_interests_recent
  ON public.route_interests (last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_interests_user
  ON public.route_interests (user_id);

ALTER TABLE public.route_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Route interests own" ON public.route_interests;
CREATE POLICY "Route interests own" ON public.route_interests
  FOR ALL
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_interests TO authenticated;

-- Record (or refresh) the caller's interest in a route. SECURITY DEFINER so
-- the upsert, the users.id lookup and the normalisation all happen in one
-- place — the client just passes two strings.
CREATE OR REPLACE FUNCTION public.record_route_interest(p_from TEXT, p_to TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_from TEXT := lower(btrim(COALESCE(p_from, '')));
  v_to   TEXT := lower(btrim(COALESCE(p_to, '')));
BEGIN
  -- Ignore junk; a one-character "route" would match almost everything.
  IF length(v_from) < 2 OR length(v_to) < 2 THEN
    RETURN;
  END IF;

  SELECT id INTO v_user FROM public.users WHERE auth_id = auth.uid();
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.route_interests (user_id, from_location, to_location)
  VALUES (v_user, v_from, v_to)
  ON CONFLICT (user_id, from_location, to_location)
  DO UPDATE SET last_searched_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_route_interest(TEXT, TEXT) TO authenticated;

-- How far back a search still counts as interest.
-- (Inlined as an interval literal below; kept here as documentation.)

-- ── New trip → tell interested passengers ───────────────────────────────
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
    AND u.status = 'active'
    AND (
      EXISTS (
        SELECT 1 FROM public.ride_requests r
        WHERE r.passenger_id = u.id
          AND r.status = 'pending'
          AND public.route_matches(
                r.from_location, r.to_location,
                NEW.from_location, NEW.to_location)
      )
      OR EXISTS (
        SELECT 1 FROM public.route_interests ri
        WHERE ri.user_id = u.id
          AND ri.last_searched_at > NOW() - INTERVAL '30 days'
          AND public.route_matches(
                ri.from_location, ri.to_location,
                NEW.from_location, NEW.to_location)
      )
    )
  LIMIT 500;

  RETURN NEW;
END;
$$;

-- ── New ride request → tell drivers running that route ──────────────────
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
    AND u.status = 'active'
    AND (
      EXISTS (
        SELECT 1 FROM public.trips t
        WHERE t.driver_id = u.id
          AND t.status IN ('posted', 'active')
          AND public.route_matches(
                t.from_location, t.to_location,
                NEW.from_location, NEW.to_location)
      )
      OR EXISTS (
        SELECT 1 FROM public.route_interests ri
        WHERE ri.user_id = u.id
          AND ri.last_searched_at > NOW() - INTERVAL '30 days'
          AND public.route_matches(
                ri.from_location, ri.to_location,
                NEW.from_location, NEW.to_location)
      )
    )
  LIMIT 500;

  RETURN NEW;
END;
$$;

-- Triggers themselves are unchanged from 008; re-created so this migration is
-- self-contained if 008 was never applied.
DROP TRIGGER IF EXISTS trg_broadcast_new_trip ON public.trips;
CREATE TRIGGER trg_broadcast_new_trip
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_new_trip();

DROP TRIGGER IF EXISTS trg_broadcast_new_request ON public.ride_requests;
CREATE TRIGGER trg_broadcast_new_request
  AFTER INSERT ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_new_request();

-- ── Posting throttle ────────────────────────────────────────────────────
-- Five posts per hour per user. Generous for a real driver, ruinous for a
-- script. Raised as 54000 (program_limit_exceeded) so the app can recognise
-- it and show friendly copy instead of a raw Postgres error.
CREATE OR REPLACE FUNCTION public.throttle_new_trip()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_recent INT;
BEGIN
  SELECT count(*) INTO v_recent
  FROM public.trips
  WHERE driver_id = NEW.driver_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'Too many rides posted in the last hour'
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.throttle_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_recent INT;
BEGIN
  SELECT count(*) INTO v_recent
  FROM public.ride_requests
  WHERE passenger_id = NEW.passenger_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'Too many ride requests posted in the last hour'
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_new_trip ON public.trips;
CREATE TRIGGER trg_throttle_new_trip
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.throttle_new_trip();

DROP TRIGGER IF EXISTS trg_throttle_new_request ON public.ride_requests;
CREATE TRIGGER trg_throttle_new_request
  BEFORE INSERT ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.throttle_new_request();

-- The throttle's lookup, and the "my recent posts" reads the app does.
CREATE INDEX IF NOT EXISTS idx_trips_driver_created
  ON public.trips (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_passenger_created
  ON public.ride_requests (passenger_id, created_at DESC);
