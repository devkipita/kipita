-- 071_admin_problem_queue_down.sql
-- Removes the admin problem list (migration 071). NOT a migration: run it by hand, only if 071 has to be undone.
-- It touches nothing else; the problems themselves (booking_problems, from 070) stay.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_booking_problems(TEXT);

COMMIT;
