ALTER TYPE wallet_txn_type ADD VALUE IF NOT EXISTS 'escrow_hold';
ALTER TYPE wallet_txn_type ADD VALUE IF NOT EXISTS 'escrow_release';
ALTER TYPE wallet_txn_type ADD VALUE IF NOT EXISTS 'withdrawal';

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS balance_after NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS booking_id    UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency             TEXT NOT NULL DEFAULT 'KES',
  method               payment_method NOT NULL DEFAULT 'mpesa',
  phone                TEXT,
  status               payment_status NOT NULL DEFAULT 'pending',
  provider_reference   TEXT,
  transaction_reference TEXT,
  idempotency_key      TEXT UNIQUE,
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_topups_user
  ON public.wallet_topups(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_wallet_topups_updated ON public.wallet_topups;
CREATE TRIGGER trg_wallet_topups_updated
  BEFORE UPDATE ON public.wallet_topups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$ BEGIN
  CREATE TYPE withdrawal_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount             NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency           TEXT NOT NULL DEFAULT 'KES',
  phone              TEXT NOT NULL,
  status             withdrawal_status NOT NULL DEFAULT 'pending',
  provider_reference TEXT,
  failure_reason     TEXT,
  transaction_id     UUID REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user
  ON public.wallet_withdrawals(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_open
  ON public.wallet_withdrawals(user_id)
  WHERE status IN ('pending', 'processing');

DROP TRIGGER IF EXISTS trg_wallet_withdrawals_updated ON public.wallet_withdrawals;
CREATE TRIGGER trg_wallet_withdrawals_updated
  BEFORE UPDATE ON public.wallet_withdrawals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP FUNCTION IF EXISTS public.credit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id     UUID,
  p_amount      NUMERIC,
  p_type        wallet_txn_type,
  p_reference   TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_booking_id  UUID DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance   NUMERIC(12,2);
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'credit_wallet: amount must be positive';
  END IF;

  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO v_wallet_id
    FROM public.wallets
   WHERE user_id = p_user_id
     FOR UPDATE;

  UPDATE public.wallets
     SET balance    = balance + p_amount,
         updated_at = NOW()
   WHERE id = v_wallet_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_transactions
    (wallet_id, amount, type, reference, description, balance_after, booking_id)
  VALUES
    (v_wallet_id, p_amount, p_type, p_reference, p_description, v_balance, p_booking_id);

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id     UUID,
  p_amount      NUMERIC,
  p_type        wallet_txn_type,
  p_reference   TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_booking_id  UUID DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance   NUMERIC(12,2);
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'debit_wallet: amount must be positive';
  END IF;

  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id, balance INTO v_wallet_id, v_balance
    FROM public.wallets
   WHERE user_id = p_user_id
     FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_funds' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.wallets
     SET balance    = balance - p_amount,
         updated_at = NOW()
   WHERE id = v_wallet_id
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_transactions
    (wallet_id, amount, type, reference, description, balance_after, booking_id)
  VALUES
    (v_wallet_id, -p_amount, p_type, p_reference, p_description, v_balance, p_booking_id);

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_wallet_entry(
  p_user_id     UUID,
  p_amount      NUMERIC,
  p_type        wallet_txn_type,
  p_reference   TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_booking_id  UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_entry_id  UUID;
BEGIN
  INSERT INTO public.wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;

  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE wallet_id = v_wallet_id
       AND type = p_type
       AND reference IS NOT DISTINCT FROM p_reference
       AND p_reference IS NOT NULL
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.wallet_transactions
    (wallet_id, amount, type, reference, description, booking_id)
  VALUES
    (v_wallet_id, p_amount, p_type, p_reference, p_description, p_booking_id)
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_summary()
RETURNS TABLE (
  balance             NUMERIC,
  currency            TEXT,
  in_escrow           NUMERIC,
  pending_earnings    NUMERIC,
  lifetime_earnings   NUMERIC,
  lifetime_topups     NUMERIC,
  pending_withdrawals NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_wallet_id UUID;
BEGIN
  v_user_id := public.current_app_user_id();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT w.id INTO v_wallet_id FROM public.wallets w WHERE w.user_id = v_user_id;

  RETURN QUERY
  SELECT
    COALESCE((SELECT w.balance FROM public.wallets w WHERE w.id = v_wallet_id), 0)::NUMERIC,
    COALESCE((SELECT w.currency FROM public.wallets w WHERE w.id = v_wallet_id), 'KES')::TEXT,
    COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
       WHERE p.user_id = v_user_id AND p.escrow_status = 'held'
    ), 0)::NUMERIC,
    COALESCE((
      SELECT SUM(p.driver_earning) FROM public.payments p
       JOIN public.bookings b ON b.id = p.booking_id
       WHERE b.driver_id = v_user_id AND p.escrow_status = 'held'
    ), 0)::NUMERIC,
    COALESCE((
      SELECT SUM(t.amount) FROM public.wallet_transactions t
       WHERE t.wallet_id = v_wallet_id AND t.type = 'payout'
    ), 0)::NUMERIC,
    COALESCE((
      SELECT SUM(t.amount) FROM public.wallet_transactions t
       WHERE t.wallet_id = v_wallet_id AND t.type = 'topup'
    ), 0)::NUMERIC,
    COALESCE((
      SELECT SUM(x.amount) FROM public.wallet_withdrawals x
       WHERE x.user_id = v_user_id AND x.status IN ('pending', 'processing')
    ), 0)::NUMERIC;
END;
$$;

ALTER TABLE public.wallet_topups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Topups own" ON public.wallet_topups;
CREATE POLICY "Topups own" ON public.wallet_topups
  FOR SELECT USING (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS "Withdrawals own" ON public.wallet_withdrawals;
CREATE POLICY "Withdrawals own" ON public.wallet_withdrawals
  FOR SELECT USING (user_id = public.current_app_user_id());

GRANT SELECT ON public.wallets             TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT ON public.wallet_topups       TO authenticated;
GRANT SELECT ON public.wallet_withdrawals  TO authenticated;

REVOKE ALL ON FUNCTION public.wallet_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wallet_summary() TO authenticated;

REVOKE ALL ON FUNCTION public.credit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.debit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_wallet_entry(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_wallet(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_wallet_entry(UUID, NUMERIC, wallet_txn_type, TEXT, TEXT, UUID) TO service_role;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_withdrawals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
