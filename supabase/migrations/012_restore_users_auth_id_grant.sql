-- Fix widespread "permission denied for table users" (42501) → 403 errors.
--
-- Migration 004 revoked SELECT on public.users and re-granted every profile
-- column EXCEPT auth_id. But almost every RLS policy scopes rows with:
--     (SELECT id FROM public.users WHERE auth_id = auth.uid())
-- (bookings, notifications, driver_profiles, payments, conversations, messages,
--  rides, ride_requests, alert_reactions, alert_comments, ratings, and the
--  current_app_user_id() helper used by the migration-003 tables).
--
-- Evaluating that subquery requires the caller to read users.auth_id. Without
-- the grant every such policy throws 42501, so all owner-scoped reads/writes
-- 403. Restoring SELECT on just auth_id unblocks them.
--
-- Security: auth_id is a non-secret link to auth.users. Knowing another user's
-- auth_id grants no access — RLS still keys on the caller's own JWT via
-- auth.uid(); phone and email remain hidden.
GRANT SELECT (auth_id) ON public.users TO authenticated;

-- Harden the shared helper so function-based policies no longer depend on the
-- caller's column privileges (defence in depth; also fixes it under any role).
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$;
