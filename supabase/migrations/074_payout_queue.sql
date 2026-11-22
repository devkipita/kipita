-- The daily payout list and the statement check (pilot item 4, Admin > Payouts).
--
-- Decision (CEO, 20 Nov 2026, Q8, Q14, Q17, Q24 in kipita-pilot-decisions.md): in the pilot drivers are paid by
-- hand from the M-Pesa portal once a day. Released earnings sit in the driver's wallet (the B2C secrets are
-- unset), nobody taps Withdraw, and the CEO works from one screen: who is owed what, with the phone number in
-- the form the portal's bulk payment takes, a way to mark each payout paid, and a check of the payments and
-- payouts against the M-Pesa statement by receipt number.
--
-- How money moves here
--   * A payout is a row in wallet_withdrawals, as before. Someone who asks for a withdrawal (withdraw-wallet)
--     already has the money taken from their wallet and a row in status pending or processing. That is a
--     "request" line.
--   * A driver whose released earnings are in their wallet has no row yet. That is an "earnings" line: the
--     whole wallet balance, if it is at least KES 100 (the withdraw-wallet minimum), the phone number is
--     verified (072), the account is active, and the driver has no request open. Only people who have been
--     paid earnings (a 'payout' entry in their wallet) are listed this way; anyone else asks for a withdrawal.
--   * Mark paid, with the M-Pesa receipt number, records the payout. For an earnings line it takes the amount
--     out of the wallet at that moment and writes the paid row in one step, so nothing is taken from a wallet
--     before the money has gone. For a request line the money is already out of the wallet: the row becomes paid.
--   * Return puts a request back in the person's wallet (status failed, a reason is required), the same way
--     withdraw-wallet reverses a failed B2C. An earnings line needs no return: nothing was taken.
--   * A receipt can be used once for a payout, and cannot be a receipt of a passenger payment.
--   * Every decision is written to the admin audit log.
--
-- What this migration adds (all admin only unless said)
--   1. kenya_msisdn(text): 2547XXXXXXXX or NULL, the same rule as withdraw-wallet.
--   2. A unique index so one receipt cannot mark two payouts paid.
--   3. admin_payout_queue(): { min, lines[], waiting[] }. Lines are what can be paid today, oldest first;
--      waiting are drivers owed money who cannot be paid yet, with the reason (phone, account, minimum).
--   4. admin_payout_count(): the number of lines, for the sidebar badge.
--   5. admin_mark_payout_paid(user, withdrawal, amount, receipt).
--   6. admin_return_payout(withdrawal, reason).
--   7. admin_payout_history(days): paid, returned and failed payouts, newest first.
--   8. admin_reconcile_data(from, to): the M-Pesa payments, wallet top-ups and paid payouts in a period, with
--      their receipt numbers. The comparison with the statement itself is done in the app (packages/shared).
--
-- Not changed: withdraw-wallet and the wallet functions. A request still debits the wallet when it is made.
-- Known gap: the withdraw-wallet check for an open request counts "processing", so a request that nobody has
-- paid blocks that person's next request until it is marked paid or returned here. That is what this screen
-- is for; the edge function itself is item 5.
--
-- Safe to run more than once. Undo with supabase/rollbacks/074_payout_queue_down.sql.

BEGIN;

-- 1. Phone number in the form the portal takes -------------------------------------

CREATE OR REPLACE FUNCTION public.kenya_msisdn(p_phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN p ~ '^254[0-9]{9}$' THEN p END
    FROM (
      SELECT CASE
               WHEN s = ''        THEN NULL
               WHEN s LIKE '0%'   THEN '254' || substr(s, 2)
               WHEN s LIKE '254%' THEN s
               ELSE '254' || s
             END AS p
        FROM (SELECT regexp_replace(regexp_replace(COALESCE(p_phone, ''), '\s+', '', 'g'), '^\+', '') AS s) x
    ) y;
$$;

REVOKE ALL ON FUNCTION public.kenya_msisdn(TEXT) FROM PUBLIC, anon, authenticated;

-- 2. One receipt, one payout ------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_withdrawals_paid_receipt
  ON public.wallet_withdrawals (upper(provider_reference))
  WHERE status = 'paid' AND provider_reference IS NOT NULL;

-- 3. The list ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_payout_queue()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min   CONSTANT NUMERIC := 100;
  v_lines JSONB;
  v_wait  JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(l) - 'sort_key' ORDER BY l.sort_key, l.name), '[]'::JSONB) INTO v_lines
    FROM (
      -- requests: already taken out of the wallet, waiting to be paid
      SELECT 'request'::TEXT                  AS kind,
             w.id                             AS withdrawal_id,
             w.user_id                        AS user_id,
             u.full_name                      AS name,
             public.kenya_msisdn(w.phone)     AS phone,
             COALESCE(u.phone_verified, FALSE) AS verified,
             u.phone_verified_via             AS verified_via,
             w.amount                         AS amount,
             w.created_at                     AS since,
             w.created_at                     AS sort_key
        FROM public.wallet_withdrawals w
        JOIN public.users u ON u.id = w.user_id
       WHERE w.status IN ('pending', 'processing')
      UNION ALL
      -- earnings: a driver's wallet balance, not yet taken out
      SELECT 'earnings',
             NULL::UUID,
             u.id,
             u.full_name,
             public.kenya_msisdn(u.phone),
             TRUE,
             u.phone_verified_via,
             wl.balance,
             (SELECT max(t.created_at) FROM public.wallet_transactions t
               WHERE t.wallet_id = wl.id AND t.type::TEXT = 'payout'),
             (SELECT max(t.created_at) FROM public.wallet_transactions t
               WHERE t.wallet_id = wl.id AND t.type::TEXT = 'payout')
        FROM public.wallets wl
        JOIN public.users u ON u.id = wl.user_id
       WHERE wl.balance >= v_min
         AND COALESCE(u.phone_verified, FALSE)
         AND public.kenya_msisdn(u.phone) IS NOT NULL
         AND u.status::TEXT = 'active'
         AND u.deleted_at IS NULL
         AND u.erased_at IS NULL
         AND EXISTS (SELECT 1 FROM public.wallet_transactions t
                      WHERE t.wallet_id = wl.id AND t.type::TEXT = 'payout')
         AND NOT EXISTS (SELECT 1 FROM public.wallet_withdrawals o
                          WHERE o.user_id = u.id AND o.status IN ('pending', 'processing'))
    ) l;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) - 'sort_key' ORDER BY x.sort_key, x.name), '[]'::JSONB) INTO v_wait
    FROM (
      SELECT u.id                       AS user_id,
             u.full_name                AS name,
             u.phone                    AS phone,
             wl.balance                 AS amount,
             CASE
               WHEN u.status::TEXT <> 'active' OR u.deleted_at IS NOT NULL OR u.erased_at IS NOT NULL THEN 'account'
               WHEN NOT COALESCE(u.phone_verified, FALSE) OR public.kenya_msisdn(u.phone) IS NULL     THEN 'phone'
               ELSE 'minimum'
             END                        AS reason,
             (SELECT max(t.created_at) FROM public.wallet_transactions t
               WHERE t.wallet_id = wl.id AND t.type::TEXT = 'payout') AS since,
             (SELECT max(t.created_at) FROM public.wallet_transactions t
               WHERE t.wallet_id = wl.id AND t.type::TEXT = 'payout') AS sort_key
        FROM public.wallets wl
        JOIN public.users u ON u.id = wl.user_id
       WHERE wl.balance > 0
         AND EXISTS (SELECT 1 FROM public.wallet_transactions t
                      WHERE t.wallet_id = wl.id AND t.type::TEXT = 'payout')
         AND NOT EXISTS (SELECT 1 FROM public.wallet_withdrawals o
                          WHERE o.user_id = u.id AND o.status IN ('pending', 'processing'))
         AND NOT (
               wl.balance >= v_min
           AND COALESCE(u.phone_verified, FALSE)
           AND public.kenya_msisdn(u.phone) IS NOT NULL
           AND u.status::TEXT = 'active'
           AND u.deleted_at IS NULL
           AND u.erased_at IS NULL
         )
    ) x;

  RETURN jsonb_build_object('min', v_min, 'lines', v_lines, 'waiting', v_wait);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_payout_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_payout_queue() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_payout_count()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN 0;
  END IF;
  RETURN jsonb_array_length(public.admin_payout_queue() -> 'lines');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_payout_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_payout_count() TO authenticated, service_role;

-- 5. Mark a payout paid -----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(
  p_user_id       UUID,
  p_withdrawal_id UUID,
  p_amount        NUMERIC,
  p_receipt       TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min     CONSTANT NUMERIC := 100;
  v_receipt TEXT := upper(btrim(COALESCE(p_receipt, '')));
  v_w       public.wallet_withdrawals%ROWTYPE;
  v_u       public.users%ROWTYPE;
  v_balance NUMERIC;
  v_id      UUID;
  v_phone   TEXT;
  v_amount  NUMERIC;
  v_kind    TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  IF v_receipt !~ '^[A-Z0-9]{8,14}$' THEN
    RAISE EXCEPTION 'Enter the M-Pesa receipt number.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_withdrawals w
              WHERE w.status = 'paid' AND upper(w.provider_reference) = v_receipt) THEN
    RAISE EXCEPTION 'That receipt is already used.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments p WHERE upper(p.transaction_reference) = v_receipt)
     OR EXISTS (SELECT 1 FROM public.wallet_topups t WHERE upper(t.transaction_reference) = v_receipt) THEN
    RAISE EXCEPTION 'That is a payment receipt, not a payout.' USING ERRCODE = '22023';
  END IF;

  IF p_withdrawal_id IS NOT NULL THEN
    -- a request: the money is already out of the wallet
    v_kind := 'request';
    SELECT * INTO v_w FROM public.wallet_withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
    IF NOT FOUND OR v_w.status NOT IN ('pending', 'processing') THEN
      RAISE EXCEPTION 'This payout is not waiting.' USING ERRCODE = '22023';
    END IF;
    IF p_amount IS NOT NULL AND p_amount <> v_w.amount THEN
      RAISE EXCEPTION 'The amount changed. Reload the page.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.wallet_withdrawals
       SET status = 'paid', provider_reference = v_receipt, failure_reason = NULL, processed_at = NOW()
     WHERE id = v_w.id;

    v_id := v_w.id;
    v_amount := v_w.amount;
    p_user_id := v_w.user_id;
  ELSE
    -- earnings: take the amount out of the wallet now, in the same step
    v_kind := 'earnings';
    SELECT * INTO v_u FROM public.users WHERE id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Person not found.' USING ERRCODE = '22023';
    END IF;

    SELECT wl.balance INTO v_balance FROM public.wallets wl WHERE wl.user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No wallet.' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (SELECT 1 FROM public.wallet_withdrawals o
                WHERE o.user_id = p_user_id AND o.status IN ('pending', 'processing')) THEN
      RAISE EXCEPTION 'This person has a request open. Reload the page.' USING ERRCODE = '22023';
    END IF;
    IF NOT COALESCE(v_u.phone_verified, FALSE) OR public.kenya_msisdn(v_u.phone) IS NULL THEN
      RAISE EXCEPTION 'Their phone number is not verified.' USING ERRCODE = '22023';
    END IF;
    IF p_amount IS NULL OR p_amount < v_min THEN
      RAISE EXCEPTION 'The smallest payout is KES 100.' USING ERRCODE = '22023';
    END IF;
    IF p_amount > v_balance THEN
      RAISE EXCEPTION 'The balance changed. Reload the page.' USING ERRCODE = '22023';
    END IF;

    v_phone := public.kenya_msisdn(v_u.phone);
    v_amount := p_amount;

    INSERT INTO public.wallet_withdrawals (user_id, amount, phone, status, provider_reference, processed_at)
    VALUES (p_user_id, v_amount, v_phone, 'paid', v_receipt, NOW())
    RETURNING id INTO v_id;

    PERFORM public.debit_wallet(p_user_id, v_amount, 'withdrawal', v_id::TEXT, 'Payout to ' || v_phone);

    UPDATE public.wallet_withdrawals w
       SET transaction_id = (SELECT t.id FROM public.wallet_transactions t
                              JOIN public.wallets wl ON wl.id = t.wallet_id
                             WHERE wl.user_id = p_user_id AND t.type::TEXT = 'withdrawal' AND t.reference = v_id::TEXT
                             ORDER BY t.created_at DESC LIMIT 1)
     WHERE w.id = v_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (p_user_id, 'payment_success', 'Payout sent',
          'KES ' || to_char(v_amount, 'FM999G999G990') || ' sent to your M-Pesa.',
          jsonb_build_object('withdrawal_id', v_id));

  PERFORM public.record_admin_action('payout.paid', 'wallet_withdrawals', v_id::TEXT,
    jsonb_build_object('user_id', p_user_id, 'amount', v_amount, 'receipt', v_receipt, 'kind', v_kind));

  RETURN jsonb_build_object('id', v_id, 'amount', v_amount, 'receipt', v_receipt, 'kind', v_kind);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_payout_paid(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_payout_paid(UUID, UUID, NUMERIC, TEXT) TO authenticated, service_role;

-- 6. Put a request back ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_return_payout(p_withdrawal_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
  v_w      public.wallet_withdrawals%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF v_reason = '' THEN
    RAISE EXCEPTION 'Give a reason.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_w FROM public.wallet_withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND OR v_w.status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'This payout is not waiting.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.wallet_withdrawals
     SET status = 'failed', failure_reason = left(v_reason, 200), processed_at = NOW()
   WHERE id = v_w.id;

  PERFORM public.credit_wallet(v_w.user_id, v_w.amount, 'refund', v_w.id::TEXT || '-reversal',
                               'Withdrawal returned to your wallet');

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (v_w.user_id, 'payment_failed', 'Withdrawal returned',
          'KES ' || to_char(v_w.amount, 'FM999G999G990') || ' is back in your wallet.',
          jsonb_build_object('withdrawal_id', v_w.id));

  PERFORM public.record_admin_action('payout.returned', 'wallet_withdrawals', v_w.id::TEXT,
    jsonb_build_object('user_id', v_w.user_id, 'amount', v_w.amount, 'reason', left(v_reason, 200)));

  RETURN jsonb_build_object('id', v_w.id, 'amount', v_w.amount);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_return_payout(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_return_payout(UUID, TEXT) TO authenticated, service_role;

-- 7. What was paid -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_payout_history(p_days INTEGER DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 14), 1), 365);
  v_out  JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(h) - 'sort_key' ORDER BY h.sort_key DESC), '[]'::JSONB) INTO v_out
    FROM (
      SELECT w.id                          AS id,
             u.full_name                   AS name,
             public.kenya_msisdn(w.phone)  AS phone,
             w.amount                      AS amount,
             w.status::TEXT                AS status,
             w.provider_reference          AS receipt,
             w.failure_reason              AS reason,
             w.processed_at                AS at,
             w.processed_at                AS sort_key
        FROM public.wallet_withdrawals w
        JOIN public.users u ON u.id = w.user_id
       WHERE w.status IN ('paid', 'failed', 'cancelled')
         AND w.processed_at >= NOW() - (v_days::DOUBLE PRECISION * INTERVAL '1 day')
       ORDER BY w.processed_at DESC
       LIMIT 300
    ) h;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_payout_history(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_payout_history(INTEGER) TO authenticated, service_role;

-- 8. What Kipita has on record for a period ------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_reconcile_data(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payments JSONB;
  v_topups   JSONB;
  v_payouts  JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Give a period.' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'kind', 'payment', 'id', p.id, 'receipt', p.transaction_reference, 'amount', p.amount,
           'at', p.paid_at, 'who', u.full_name, 'ref', b.booking_reference
         ) ORDER BY p.paid_at), '[]'::JSONB) INTO v_payments
    FROM public.payments p
    LEFT JOIN public.users u    ON u.id = p.user_id
    LEFT JOIN public.bookings b ON b.id = p.booking_id
   WHERE p.status = 'completed' AND p.method::TEXT = 'mpesa'
     AND p.paid_at >= p_from AND p.paid_at <= p_to;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'kind', 'topup', 'id', t.id, 'receipt', t.transaction_reference, 'amount', t.amount,
           'at', t.paid_at, 'who', u.full_name, 'ref', NULL
         ) ORDER BY t.paid_at), '[]'::JSONB) INTO v_topups
    FROM public.wallet_topups t
    LEFT JOIN public.users u ON u.id = t.user_id
   WHERE t.status = 'completed' AND t.method::TEXT = 'mpesa'
     AND t.paid_at >= p_from AND t.paid_at <= p_to;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'kind', 'payout', 'id', w.id, 'receipt', w.provider_reference, 'amount', w.amount,
           'at', w.processed_at, 'who', u.full_name, 'ref', NULL
         ) ORDER BY w.processed_at), '[]'::JSONB) INTO v_payouts
    FROM public.wallet_withdrawals w
    LEFT JOIN public.users u ON u.id = w.user_id
   WHERE w.status = 'paid'
     AND w.processed_at >= p_from AND w.processed_at <= p_to;

  RETURN jsonb_build_object('records', v_payments || v_topups || v_payouts);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reconcile_data(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reconcile_data(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

COMMIT;
