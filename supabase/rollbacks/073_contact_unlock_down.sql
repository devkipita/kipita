-- 073_contact_unlock_down.sql
-- Puts the database back as it was before 073 (chat and phone numbers open only while the seat is paid).
-- NOT a migration: do not put it in supabase/migrations. Run it by hand, and only if 073 has to be undone.
--
-- Before running: nothing needs redeploying. The trip page asks booking_contact_open; once that function is
-- gone the page treats a missing answer as "use the old rule" (confirmed or in progress), so the buttons
-- still load. If the web app from before 073 is wanted, redeploy it after this script.
--
-- What it does: booking_conversation goes back to its 053 body (a chat opens as soon as a driver accepts, and
-- stays open after the ride), booking_contact_phone goes back to its 072 body (confirmed or in progress
-- only, verified numbers only), the message insert policy and the conversation insert policy go back to
-- their 001 definitions (which let any signed-in person create a conversation with anyone and post into it
-- through the API, skipping the app), and the three new functions are dropped. Existing conversations and
-- messages are not touched.

BEGIN;

DROP POLICY IF EXISTS "Messages insert by participants" ON public.messages;
CREATE POLICY "Messages insert by participants" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE (SELECT id FROM public.users WHERE auth_id = auth.uid()) = ANY(participant_ids)
    )
  );

DROP POLICY IF EXISTS "Conversations create" ON public.conversations;
CREATE POLICY "Conversations create" ON public.conversations
  FOR INSERT WITH CHECK (
    (SELECT id FROM public.users WHERE auth_id = auth.uid()) = ANY(participant_ids)
  );

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

  SELECT u.phone INTO v_phone
    FROM public.users u
   WHERE u.id = CASE WHEN v_me = v_b.passenger_id THEN v_b.driver_id ELSE v_b.passenger_id END
     AND u.phone_verified;

  RETURN v_phone;
END;
$$;

REVOKE ALL ON FUNCTION public.booking_contact_phone(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_contact_phone(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.conversation_open(UUID);
DROP FUNCTION IF EXISTS public.booking_contact_open(UUID);
DROP FUNCTION IF EXISTS public.booking_contact_state(UUID);

COMMIT;
