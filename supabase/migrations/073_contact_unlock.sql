-- Chat and phone numbers open when the seat is paid, and close when the release window ends.
--
-- Decision (CEO, 20 Nov 2026, Q10 in kipita-pilot-decisions.md): the ride chat opens and the other
-- person's phone number becomes visible only once the booking is paid, driver to passenger only
-- (never passenger to passenger). The number is hidden again once the problem window closes.
--
-- Why this is a migration and not only a screen change
--   Until now the only gates were in the app. booking_conversation() let a chat open before payment
--   and after the ride, and the table policies let any signed-in person create a conversation with
--   anyone and post into it straight through the API, which skips every screen. This moves the rule
--   into the database.
--
-- The rule (one place: booking_contact_state)
--   open    the booking is confirmed or in progress (the seat is paid), or it is completed and its
--           fare is still held before the release time (payments.release_due_at, 070).
--   unpaid  the booking is still a request or waiting for payment.
--   closed  everything else: cancelled or rejected, or completed once the fare has been released,
--           refunded, or the release time has passed. A reported problem does not keep it open: the
--           report window ends at the release time too, and an admin works from Admin > Problems.
--
-- What this migration does
--   1. booking_contact_state(booking): internal, nobody can call it directly.
--   2. booking_contact_open(booking): true only for the passenger or driver of that booking while the
--      state is open. The trip page asks it so the Message and Call buttons match the database.
--   3. conversation_open(conversation): the same answer for a conversation, used by the message policy.
--   4. booking_conversation(): refuses unless the state is open ("Chat opens once the seat is paid." /
--      "Chat is closed.").
--   5. booking_contact_phone(): same rule ("Calling opens once the seat is paid." / "Calling is
--      closed."). A number is still only returned when it is verified (072).
--   6. Policies: nobody can create a conversation straight through the API any more (booking_conversation
--      creates it, and it runs with the table owner's rights). A message can be posted only into a
--      conversation that is open. Reading stays as it was: you can always read your own conversations.
--
-- Not changed: users.phone has no select grant for anon or authenticated (checked on 22 Nov), so a number
-- still reaches the other person only through booking_contact_phone.
-- Known gap: a ride that is started and never completed stays "in progress", so its chat and numbers stay
-- open until someone completes or cancels it (the same gap as the held fare in kipita-pilot-build-log.md).
-- A conversation that matches no booking (one found on 22 Nov) can still be read but takes no new message.
--
-- Caller audit (repo, 22 Nov): booking_conversation is called by ChatSheet.tsx; booking_contact_phone by
-- contactPhoneAction in journey-actions.ts; nothing else inserts into conversations or messages (no edge
-- function, no other SQL). The old React Native app in apps/mobile is dead code and is not considered.
--
-- Safe to run more than once. Undo with supabase/rollbacks/073_contact_unlock_down.sql.

BEGIN;

-- 1. The rule ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.booking_contact_state(p_booking_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT b.status::TEXT INTO v_status FROM public.bookings b WHERE b.id = p_booking_id;
  IF NOT FOUND THEN
    RETURN 'closed';
  END IF;

  IF v_status IN ('confirmed', 'in_progress') THEN
    RETURN 'open';
  END IF;

  IF v_status IN ('requested', 'pending_payment') THEN
    RETURN 'unpaid';
  END IF;

  IF v_status = 'completed' AND EXISTS (
    SELECT 1
      FROM public.payments p
     WHERE p.booking_id = p_booking_id
       AND p.escrow_status::TEXT = 'held'
       AND p.release_due_at > NOW()
  ) THEN
    RETURN 'open';
  END IF;

  RETURN 'closed';
END;
$$;

REVOKE ALL ON FUNCTION public.booking_contact_state(UUID) FROM PUBLIC, anon, authenticated;

-- 2. Does this booking's chat and number work for me right now? --------------------

CREATE OR REPLACE FUNCTION public.booking_contact_open(p_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
           SELECT 1
             FROM public.bookings b
            WHERE b.id = p_booking_id
              AND public.current_app_user_id() IN (b.passenger_id, b.driver_id)
         )
     AND public.booking_contact_state(p_booking_id) = 'open';
$$;

REVOKE ALL ON FUNCTION public.booking_contact_open(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_contact_open(UUID) TO authenticated;

-- 3. The same for a conversation (used by the message policy) -----------------------

CREATE OR REPLACE FUNCTION public.conversation_open(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
       AND public.booking_contact_state(b.id) = 'open'
  );
$$;

REVOKE ALL ON FUNCTION public.conversation_open(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_open(UUID) TO authenticated;

-- 4. Opening the chat ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.booking_conversation(p_booking_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF v_state = 'unpaid' THEN
    RAISE EXCEPTION 'Chat opens once the seat is paid.' USING ERRCODE = '22023';
  ELSIF v_state <> 'open' THEN
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
$$;

REVOKE ALL ON FUNCTION public.booking_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_conversation(UUID) TO authenticated;

-- 5. The other person's number ------------------------------------------------------

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
  v_state TEXT;
BEGIN
  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_me IS NULL OR v_me NOT IN (v_b.passenger_id, v_b.driver_id) THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  v_state := public.booking_contact_state(p_booking_id);
  IF v_state = 'unpaid' THEN
    RAISE EXCEPTION 'Calling opens once the seat is paid.' USING ERRCODE = '22023';
  ELSIF v_state <> 'open' THEN
    RAISE EXCEPTION 'Calling is closed.' USING ERRCODE = '22023';
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

-- 6. Table policies -----------------------------------------------------------------

-- No more direct conversation inserts: booking_conversation() creates them.
DROP POLICY IF EXISTS "Conversations create" ON public.conversations;

-- A message can be posted only into your own conversation while it is open.
DROP POLICY IF EXISTS "Messages insert by participants" ON public.messages;
CREATE POLICY "Messages insert by participants" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE (SELECT id FROM public.users WHERE auth_id = auth.uid()) = ANY(participant_ids)
    )
    AND public.conversation_open(conversation_id)
  );

COMMIT;
