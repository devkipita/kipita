-- 071_admin_problem_queue.sql
-- The admin's morning list for the pilot: rides a passenger reported and passengers a driver boarded by hand
-- (both from migration 070), one row per booking, with the people, the ride and the money held.
--
-- The admin decides with resolve_booking_problem (070): clear (the fare is paid to the driver as planned) or
-- refund (the passenger gets the fare back in their wallet). Deciding resolves every open problem on that
-- booking at once, which is why this list is per booking and not per report.
--
-- Phone numbers are included so the admin can call both sides, the same as admin_reports does.
--
-- Run after 070. Safe to run more than once. Rollback: supabase/rollbacks/071_admin_problem_queue_down.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_booking_problems(p_status TEXT DEFAULT 'open')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_out JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('open', 'resolved') THEN
    RAISE EXCEPTION 'Unsupported status' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(r) - 'sort_key' ORDER BY r.sort_key), '[]'::JSONB) INTO v_out
    FROM (
      SELECT b.id                              AS booking_id,
             b.booking_reference               AS reference,
             b.status                          AS booking_status,
             b.boarded_method                  AS boarded_method,
             b.seats_booked                    AS seats,
             t.id                              AS trip_id,
             t.from_location                   AS "from",
             t.to_location                     AS "to",
             t.departure_date                  AS departure_date,
             t.departure_time                  AS departure_time,
             pay.amount                        AS amount,
             pay.driver_earning                AS driver_earning,
             pay.escrow_status                 AS escrow_status,
             pay.release_due_at                AS release_due_at,
             jsonb_build_object('id', pu.id, 'name', pu.full_name, 'phone', pu.phone) AS passenger,
             jsonb_build_object('id', du.id, 'name', du.full_name, 'phone', du.phone) AS driver,
             g.opened_at                       AS opened_at,
             g.resolved_at                     AS resolved_at,
             g.problems                        AS problems,
             -- Open: oldest first, so the longest wait is on top. Resolved: newest first.
             CASE WHEN p_status = 'open' THEN EXTRACT(EPOCH FROM g.opened_at)
                  ELSE -EXTRACT(EPOCH FROM g.resolved_at) END AS sort_key
        FROM (
          SELECT pr.booking_id,
                 MIN(pr.created_at)  AS opened_at,
                 MAX(pr.resolved_at) AS resolved_at,
                 jsonb_agg(
                   jsonb_build_object(
                     'id', pr.id, 'source', pr.source, 'kind', pr.kind, 'note', pr.note,
                     'status', pr.status, 'outcome', pr.outcome, 'resolved_note', pr.resolved_note,
                     'created_at', pr.created_at
                   ) ORDER BY pr.created_at
                 ) AS problems
            FROM public.booking_problems pr
           WHERE pr.status = p_status
           GROUP BY pr.booking_id
        ) g
        JOIN public.bookings b ON b.id = g.booking_id
        JOIN public.trips t ON t.id = b.trip_id
        JOIN public.users pu ON pu.id = b.passenger_id
        JOIN public.users du ON du.id = b.driver_id
        LEFT JOIN LATERAL (
          SELECT p.amount, p.driver_earning, p.escrow_status, p.release_due_at
            FROM public.payments p
           WHERE p.booking_id = b.id AND p.status = 'completed'
           ORDER BY p.created_at DESC
           LIMIT 1
        ) pay ON TRUE
       ORDER BY sort_key
       LIMIT 100
    ) r;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_booking_problems(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_booking_problems(TEXT) TO authenticated, service_role;

COMMIT;
