BEGIN;

CREATE OR REPLACE FUNCTION public.notify_trip_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_who   UUID;
  v_role  TEXT;
  v_count INTEGER;
  v_title TEXT;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  FOREACH v_who IN ARRAY ARRAY[NEW.passenger_id, NEW.driver_id] LOOP
    v_role := CASE WHEN v_who = NEW.driver_id THEN 'driver' ELSE 'passenger' END;

    SELECT COUNT(*) INTO v_count
      FROM public.bookings b
     WHERE b.status = 'completed'
       AND (CASE WHEN v_role = 'driver' THEN b.driver_id ELSE b.passenger_id END) = v_who;

    IF v_count NOT IN (1, 5, 10, 25, 50, 100, 250, 500) THEN
      CONTINUE;
    END IF;

    v_title := CASE
      WHEN v_count = 1 AND v_role = 'driver' THEN 'Your first passenger, delivered'
      WHEN v_count = 1 THEN 'Your first Kipita ride'
      WHEN v_role = 'driver' THEN v_count || ' passengers delivered'
      ELSE v_count || ' rides with Kipita'
    END;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_who,
      'trip_completed',
      v_title,
      CASE WHEN v_role = 'driver'
        THEN 'Every seat you share puts a car''s empty space to work.'
        ELSE 'Every shared seat is one less car on the road.'
      END,
      jsonb_build_object('booking_id', NEW.id, 'milestone', v_count, 'role', v_role)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_trip_milestone() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_trip_milestone ON public.bookings;
CREATE TRIGGER bookings_trip_milestone
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.notify_trip_milestone();

CREATE INDEX IF NOT EXISTS idx_bookings_passenger_completed
  ON public.bookings (passenger_id) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_bookings_driver_completed
  ON public.bookings (driver_id) WHERE status = 'completed';

COMMIT;
