-- 085: index for the payout lookup by booking.
-- Already applied to the database on 24 Nov without a file in the repo; this records the same statement
-- (idempotent) so a fresh database ends up the same.
CREATE INDEX IF NOT EXISTS idx_wallet_txns_booking_payout
  ON public.wallet_transactions (booking_id)
  WHERE type = 'payout';
