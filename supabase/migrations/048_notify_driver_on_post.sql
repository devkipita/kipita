BEGIN;

-- `broadcast_new_trip` (migration 020) tells everyone on the route about a new
-- ride but deliberately skips the driver who posted it, so publishing left no
-- trace in the driver's own notifications. Without that first entry there is
-- nothing for the approval notice in 047 to follow, and a driver whose ride is
-- parked at `awaiting_approval` has no way to watch its progress.

CREATE OR REPLACE FUNCTION public.notify_driver_trip_posted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waiting BOOLEAN := NEW.status = 'awaiting_approval';
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.driver_id,
    'system',
    CASE WHEN v_waiting THEN 'Ride saved' ELSE 'Ride published' END,
    NEW.from_location || ' → ' || NEW.to_location || ' · ' ||
      CASE
        WHEN v_waiting THEN 'it goes live as soon as verification clears'
        ELSE 'passengers can book a seat now'
      END,
    jsonb_build_object(
      'trip_id', NEW.id,
      'status', NEW.status,
      'from', NEW.from_location,
      'to', NEW.to_location,
      'departure_date', NEW.departure_date,
      'departure_time', NEW.departure_time
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_driver_trip_posted ON public.trips;
CREATE TRIGGER trg_notify_driver_trip_posted
  AFTER INSERT ON public.trips
  FOR EACH ROW
  WHEN (NEW.status IN ('posted', 'awaiting_approval'))
  EXECUTE FUNCTION public.notify_driver_trip_posted();

COMMIT;
