-- 074_payout_queue_down.sql
-- Puts the database back as it was before 074 (the daily payout list and the statement check).
-- NOT a migration: do not put it in supabase/migrations. Run it by hand, and only if 074 has to be undone.
--
-- Before running: nothing needs redeploying except the web app, whose Payouts screen calls these functions.
-- Without them the screen shows an error and the sidebar badge shows nothing; no other screen is affected.
--
-- What it does: drops the seven functions and the unique index on paid receipts. It does NOT undo what the
-- functions already did: payouts marked paid stay paid (their wallet entries, receipts and notifications stay),
-- requests returned stay returned, and the admin audit entries stay.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_reconcile_data(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.admin_payout_history(INTEGER);
DROP FUNCTION IF EXISTS public.admin_return_payout(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_mark_payout_paid(UUID, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.admin_payout_count();
DROP FUNCTION IF EXISTS public.admin_payout_queue();
DROP INDEX IF EXISTS public.uq_wallet_withdrawals_paid_receipt;
DROP FUNCTION IF EXISTS public.kenya_msisdn(TEXT);

COMMIT;
