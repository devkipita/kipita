-- ══════════════════════════════════════════════════════════════
-- 013 — PAYMENT ESCROW
--
-- Kipita's ride-payment business model:
--   1. Passenger pays the full fare to the Kipita paybill (M-Pesa STK push).
--   2. Kipita HOLDS the funds in escrow (escrow_status = 'held').
--   3. When the driver ends the ride, Kipita RELEASES the funds to the
--      driver minus the Kipita platform fee (escrow_status = 'released').
--   4. If the trip is cancelled while held, the fare is refunded
--      (escrow_status = 'refunded').
--
-- This migration adds the escrow bookkeeping columns to `payments` and a
-- transactional `credit_wallet()` helper used when settling the driver.
-- ══════════════════════════════════════════════════════════════

-- ── Escrow lifecycle enum ──
DO $$ BEGIN
  CREATE TYPE escrow_status AS ENUM ('none', 'held', 'released', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Escrow bookkeeping on payments ──
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS escrow_status    escrow_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS platform_fee     NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_earning   NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS held_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_reference TEXT,
  ADD COLUMN IF NOT EXISTS payout_status    TEXT;   -- 'wallet' | 'paid' | 'failed'

CREATE INDEX IF NOT EXISTS idx_payments_escrow ON public.payments(escrow_status);

-- ── Wallet credit helper ──
-- Upserts the user's wallet and records a transaction atomically, returning
-- the new balance. Used by release-escrow to settle the driver's earning and
-- by the refund path to return a passenger's fare.
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id     UUID,
  p_amount      NUMERIC,
  p_type        wallet_txn_type,
  p_reference   TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance   NUMERIC(12,2);
BEGIN
  -- Ensure the wallet exists (idempotent per user).
  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;

  UPDATE public.wallets
     SET balance    = balance + p_amount,
         updated_at = NOW()
   WHERE id = v_wallet_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_transactions (wallet_id, amount, type, reference, description)
  VALUES (v_wallet_id, p_amount, p_type, p_reference, p_description);

  RETURN v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT) TO service_role;
