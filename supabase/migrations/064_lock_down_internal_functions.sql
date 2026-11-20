-- 064_lock_down_internal_functions.sql
-- Closes eight server-only functions to anonymous and signed-in callers.
--
-- These functions move money, seats and counters and never check who is calling:
--   credit_wallet, debit_wallet, record_wallet_entry   add to or subtract from any wallet
--   deduct_seats, release_seats                         change seats left on any ride
--   increment_trip_count                                change any user's trip count
--   convert_referral                                    pay out a referral bonus
--   expire_stale_bookings                               run the booking expiry sweep
--
-- Migrations 025, 030 and 034 revoked EXECUTE from PUBLIC only. Supabase also grants EXECUTE on new
-- functions straight to anon and authenticated, and those grants survive a PUBLIC revoke. So anyone
-- holding the public app key could call them through /rest/v1/rpc/<name>. (063 hit the same gap on
-- cancel_booking and closed it there.)
--
-- Who legitimately calls them, checked 20 Nov 2026:
--   edge functions (release-escrow, resolve-refund, mpesa-callback, withdraw-wallet, confirm-payment),
--     all of which use the service-role key  -> keep service_role
--   other SQL functions (cancel_booking, start_trip, pay_booking_with_wallet, refund_booking_payment,
--     settle_cancellation), all SECURITY DEFINER, so they run as the owner and do not need the grant
--   the kipita-expire-stale-bookings cron job, which runs as the database owner
--   no web or mobile code calls any of them
--
-- Safe to run more than once.

BEGIN;

REVOKE ALL ON FUNCTION public.credit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_wallet_entry(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deduct_seats(UUID, INTEGER)                                           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_seats(UUID, INTEGER)                                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_trip_count(UUID)                                            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.convert_referral(UUID, UUID)                                          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_bookings()                                               FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID)       TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID)        TO service_role;
GRANT EXECUTE ON FUNCTION public.record_wallet_entry(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_seats(UUID, INTEGER)                                           TO service_role;
GRANT EXECUTE ON FUNCTION public.release_seats(UUID, INTEGER)                                          TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_trip_count(UUID)                                            TO service_role;
GRANT EXECUTE ON FUNCTION public.convert_referral(UUID, UUID)                                          TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_bookings()                                               TO service_role;

COMMIT;
