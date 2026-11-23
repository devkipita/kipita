-- 079_late_payment_refund_down.sql
-- Puts the database back as it was before 079 (late-payment refund and the stuck-payment sweep).
-- NOT a migration: do not put it in supabase/migrations. Run it by hand, and only if 079 has to be undone.
--
-- Before running:
--   * Redeploy confirm-payment from before this change first. The new one calls refund_late_payment, and
--     without the function a payment on a cancelled booking would fail with a 500 instead of being marked failed.
--
-- What it does not undo: money already sent back to wallets by refund_late_payment or the sweep. Those
-- wallet entries (type refund, reference "<payment id>:late") and the payments marked refunded stay, and
-- so do payments the sweep marked failed.

BEGIN;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'kipita-sweep-stuck-payments';
END;
$$;

DROP FUNCTION IF EXISTS public.sweep_stuck_payments();
DROP FUNCTION IF EXISTS public.refund_late_payment(UUID);

COMMIT;
