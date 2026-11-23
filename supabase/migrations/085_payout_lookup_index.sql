CREATE INDEX IF NOT EXISTS idx_wallet_txns_booking_payout
  ON public.wallet_transactions (booking_id)
  WHERE type = 'payout';
