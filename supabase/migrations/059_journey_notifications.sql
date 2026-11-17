BEGIN;

CREATE OR REPLACE FUNCTION public.notify_booking_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := public.current_app_user_id();
  v_trip  public.trips%ROWTYPE;
  v_name  TEXT;
  v_route TEXT;
BEGIN
  SELECT * INTO v_trip FROM public.trips WHERE id = NEW.trip_id;
  v_route := COALESCE(v_trip.from_location, 'Your ride') || ' to ' || COALESCE(v_trip.to_location, '');
  SELECT split_part(COALESCE(full_name, ''), ' ', 1) INTO v_name FROM public.users WHERE id = NEW.passenger_id;
  v_name := COALESCE(NULLIF(v_name, ''), 'Your passenger');

  IF NEW.cancel_reason = 'Payment hold expired' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data) VALUES
      (NEW.passenger_id, 'system', 'Your seat hold ran out',
       v_route || ' was not paid in time, so the seat was released. Nothing was charged.',
       jsonb_build_object('booking_id', NEW.id, 'trip_id', NEW.trip_id)),
      (NEW.driver_id, 'system', v_name || ' didn''t pay in time',
       'The ' || CASE WHEN NEW.seats_booked = 1 THEN 'seat' ELSE 'seats' END ||
       ' on ' || v_route || ' are back on sale.',
       jsonb_build_object('booking_id', NEW.id, 'trip_id', NEW.trip_id));
    RETURN NEW;
  END IF;

  IF v_actor IS NOT NULL AND v_actor = NEW.passenger_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.driver_id, 'system', v_name || ' cancelled',
      v_route || ' · ' || NEW.seats_booked ||
        CASE WHEN NEW.seats_booked = 1 THEN ' seat is' ELSE ' seats are' END ||
        ' back on sale.' ||
        COALESCE(' Reason: ' || NULLIF(btrim(NEW.cancel_reason), ''), ''),
      jsonb_build_object('booking_id', NEW.id, 'trip_id', NEW.trip_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_booking_cancelled() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bookings_notify_cancelled ON public.bookings;
CREATE TRIGGER bookings_notify_cancelled
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled'
        AND OLD.status IN ('requested', 'pending_payment', 'confirmed'))
  EXECUTE FUNCTION public.notify_booking_cancelled();

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv    public.conversations%ROWTYPE;
  v_to      UUID;
  v_sender  TEXT;
  v_booking UUID;
BEGIN
  SELECT * INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(split_part(full_name, ' ', 1), ''), 'Kipita user') INTO v_sender
    FROM public.users WHERE id = NEW.sender_id;

  FOREACH v_to IN ARRAY v_conv.participant_ids LOOP
    CONTINUE WHEN v_to = NEW.sender_id;

    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.notifications n
       WHERE n.user_id = v_to
         AND n.type = 'new_message'
         AND n.read = FALSE
         AND n.data->>'conversation_id' = NEW.conversation_id::TEXT
         AND n.created_at > NOW() - INTERVAL '2 minutes'
    );

    SELECT b.id INTO v_booking
      FROM public.bookings b
     WHERE b.trip_id = v_conv.ride_id
       AND NEW.sender_id IN (b.passenger_id, b.driver_id)
       AND v_to IN (b.passenger_id, b.driver_id)
     ORDER BY b.created_at DESC
     LIMIT 1;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_to, 'new_message', v_sender,
      CASE WHEN char_length(NEW.content) > 90 THEN left(NEW.content, 89) || '…' ELSE NEW.content END,
      jsonb_strip_nulls(jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'booking_id', v_booking,
        'chat', true
      ))
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS messages_notify_new ON public.messages;
CREATE TRIGGER messages_notify_new
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

COMMIT;
