-- 066_lock_down_settings_readers.sql
-- Closes the two helpers that read any platform setting to anonymous and signed-in callers.
--
-- platform_settings is protected by row-level security: a visitor can read only rows marked
-- is_public (policy "Public settings readable"). But setting(key) and setting_numeric(key, default)
-- are SECURITY DEFINER, so they skip that policy, and Supabase grants new functions to anon and
-- authenticated as well as PUBLIC. So anyone holding the public app key could read ANY setting
-- through /rest/v1/rpc/setting, private ones included.
--
-- Nothing was exposed: all 16 settings in production were public on 20 Nov 2026. The gap would
-- have opened the day a private setting was added.
--
-- Who legitimately calls them, checked 20 Nov 2026:
--   setting_numeric calls setting; ten SECURITY DEFINER functions call setting_numeric
--     (bookings_set_price, cancellation_terms, dispute_no_show, fare_breakdown, mark_no_show,
--      pay_booking_with_wallet, send_cancel_window_reminders, service_fee_for, settle_cancellation,
--      settle_no_shows). All are owned by postgres and run as their owner, so they do not need
--     the grant, and the screens that call them keep working.
--   the edge functions release-escrow and confirm-payment call setting_numeric with the
--     service-role key -> keep service_role
--   no web or mobile code, and no policy, column default, constraint, view or cron job uses either
-- The web and mobile apps read public settings straight from the table, which row-level security
-- already limits to public rows, so they are not affected.
--
-- Safe to run more than once.

BEGIN;

REVOKE ALL ON FUNCTION public.setting(TEXT)                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.setting_numeric(TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.setting(TEXT)                TO service_role;
GRANT EXECUTE ON FUNCTION public.setting_numeric(TEXT, NUMERIC) TO service_role;

COMMIT;
