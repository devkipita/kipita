BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS accepted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS refunded_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_to       TEXT CHECK (refund_to IN ('wallet', 'mpesa'));

CREATE INDEX IF NOT EXISTS idx_bookings_passenger_created ON public.bookings (passenger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_created ON public.bookings (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_ride ON public.conversations (ride_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_escrow ON public.payments (booking_id, escrow_status);

CREATE OR REPLACE FUNCTION public.bookings_stamp_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'pending_payment' THEN NEW.accepted_at  := COALESCE(NEW.accepted_at, NOW());
      WHEN 'confirmed'       THEN NEW.paid_at      := COALESCE(NEW.paid_at, NOW());
      WHEN 'in_progress'     THEN NEW.started_at   := COALESCE(NEW.started_at, NOW());
      WHEN 'completed'       THEN NEW.completed_at := COALESCE(NEW.completed_at, NOW());
      WHEN 'cancelled'       THEN NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW());
      WHEN 'rejected'        THEN NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW());
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_stamp_status ON public.bookings;
CREATE TRIGGER trg_bookings_stamp_status
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_stamp_status();

UPDATE public.bookings b
   SET paid_at = p.paid_at
  FROM public.payments p
 WHERE p.booking_id = b.id
   AND p.paid_at IS NOT NULL
   AND b.paid_at IS NULL;

CREATE OR REPLACE FUNCTION public.payments_stamp_refund()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.escrow_status = 'refunded' AND OLD.escrow_status IS DISTINCT FROM 'refunded' THEN
    UPDATE public.bookings
       SET refunded_amount = NEW.amount,
           refunded_at     = COALESCE(NEW.refunded_at, NOW()),
           refund_to       = 'wallet'
     WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.payments_stamp_refund() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_payments_stamp_refund ON public.payments;
CREATE TRIGGER trg_payments_stamp_refund
  AFTER UPDATE OF escrow_status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_stamp_refund();

UPDATE public.bookings b
   SET refunded_amount = p.amount,
       refunded_at     = COALESCE(p.refunded_at, p.updated_at),
       refund_to       = 'wallet'
  FROM public.payments p
 WHERE p.booking_id = b.id
   AND p.escrow_status = 'refunded'
   AND b.refunded_at IS NULL;

CREATE OR REPLACE FUNCTION public.booking_conversation(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me   UUID := public.current_app_user_id();
  v_b    public.bookings%ROWTYPE;
  v_conv UUID;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_me IS NULL OR v_me NOT IN (v_b.passenger_id, v_b.driver_id) THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;
  IF v_b.status NOT IN ('pending_payment', 'confirmed', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Messages open once the driver accepts' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_conv
    FROM public.conversations
   WHERE ride_id = v_b.trip_id
     AND participant_ids @> ARRAY[v_b.passenger_id, v_b.driver_id]
     AND cardinality(participant_ids) = 2
   LIMIT 1;

  IF v_conv IS NULL THEN
    INSERT INTO public.conversations (participant_ids, ride_id)
    VALUES (ARRAY[v_b.passenger_id, v_b.driver_id], v_b.trip_id)
    RETURNING id INTO v_conv;
  END IF;

  RETURN v_conv;
END;
$$;

REVOKE ALL ON FUNCTION public.booking_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.booking_contact_phone(p_booking_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_phone TEXT;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_me IS NULL OR v_me NOT IN (v_b.passenger_id, v_b.driver_id) THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;
  IF v_b.status NOT IN ('confirmed', 'in_progress') THEN
    RAISE EXCEPTION 'Calling opens once the seat is paid' USING ERRCODE = '22023';
  END IF;

  SELECT phone INTO v_phone
    FROM public.users
   WHERE id = CASE WHEN v_me = v_b.passenger_id THEN v_b.driver_id ELSE v_b.passenger_id END;

  RETURN v_phone;
END;
$$;

REVOKE ALL ON FUNCTION public.booking_contact_phone(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_contact_phone(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.rate_booking(
  p_booking_id UUID,
  p_score      INTEGER,
  p_comment    TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := public.current_app_user_id();
  v_b  public.bookings%ROWTYPE;
BEGIN
  IF p_score IS NULL OR p_score < 1 OR p_score > 5 THEN
    RAISE EXCEPTION 'Pick one to five stars' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_me IS NULL OR v_me NOT IN (v_b.passenger_id, v_b.driver_id) THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;
  IF v_b.status <> 'completed' THEN
    RAISE EXCEPTION 'You can rate once the trip is complete' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ratings (booking_id, from_user_id, to_user_id, score, comment)
  VALUES (
    p_booking_id,
    v_me,
    CASE WHEN v_me = v_b.passenger_id THEN v_b.driver_id ELSE v_b.passenger_id END,
    p_score,
    NULLIF(btrim(p_comment), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rate_booking(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rate_booking(UUID, INTEGER, TEXT) TO authenticated;

CREATE TABLE IF NOT EXISTS public.trip_locations (
  trip_id    UUID PRIMARY KEY REFERENCES public.trips (id) ON DELETE CASCADE,
  driver_id  UUID NOT NULL REFERENCES public.users (id),
  lat        DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng        DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  heading    REAL,
  speed_kmh  REAL CHECK (speed_kmh IS NULL OR speed_kmh >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trip_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip location readable by riders" ON public.trip_locations;
CREATE POLICY "Trip location readable by riders" ON public.trip_locations
  FOR SELECT TO authenticated
  USING (
    driver_id = (SELECT public.current_app_user_id())
    OR EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.trip_id = trip_locations.trip_id
         AND b.passenger_id = (SELECT public.current_app_user_id())
         AND b.status IN ('confirmed', 'in_progress')
    )
  );

CREATE OR REPLACE FUNCTION public.share_trip_location(
  p_trip_id   UUID,
  p_lat       DOUBLE PRECISION,
  p_lng       DOUBLE PRECISION,
  p_heading   REAL DEFAULT NULL,
  p_speed_kmh REAL DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := public.current_app_user_id();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.trips
     WHERE id = p_trip_id AND driver_id = v_me AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'Only the driver of a ride under way can share its location' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.trip_locations (trip_id, driver_id, lat, lng, heading, speed_kmh, updated_at)
  VALUES (p_trip_id, v_me, p_lat, p_lng, p_heading, p_speed_kmh, NOW())
  ON CONFLICT (trip_id) DO UPDATE
     SET lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         heading = EXCLUDED.heading,
         speed_kmh = EXCLUDED.speed_kmh,
         updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.share_trip_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL, REAL) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_trip_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, REAL, REAL) TO authenticated;
GRANT SELECT ON public.trip_locations TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trip_locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_locations;
  END IF;
END $$;

UPDATE public.feature_flags SET enabled = TRUE WHERE key = 'live_tracking';

COMMIT;
