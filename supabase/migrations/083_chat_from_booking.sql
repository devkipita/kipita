CREATE OR REPLACE FUNCTION public.booking_conversation(p_booking_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_me    UUID := public.current_app_user_id();
  v_b     public.bookings%ROWTYPE;
  v_conv  UUID;
  v_state TEXT;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_me IS NULL OR v_me NOT IN (v_b.passenger_id, v_b.driver_id) THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  v_state := public.booking_contact_state(p_booking_id);
  IF v_state NOT IN ('open', 'unpaid') THEN
    RAISE EXCEPTION 'Chat is closed.' USING ERRCODE = '22023';
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
$function$;

CREATE OR REPLACE FUNCTION public.conversation_open(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.conversations c
      JOIN public.bookings b
        ON b.trip_id = c.ride_id
       AND b.passenger_id = ANY (c.participant_ids)
       AND b.driver_id    = ANY (c.participant_ids)
     WHERE c.id = p_conversation_id
       AND cardinality(c.participant_ids) = 2
       AND public.current_app_user_id() = ANY (c.participant_ids)
       AND public.booking_contact_state(b.id) IN ('open', 'unpaid')
  );
$function$;
