
DO $$
DECLARE
  v_rider    UUID;
  v_driver   UUID;
  v_booking  RECORD;
  v_payment  UUID;
  v_fee      NUMERIC(10,2);
  v_earning  NUMERIC(10,2);
  v_escrow   TEXT;
  v_wallet   UUID;
  v_n        INT := 0;
BEGIN
  IF to_regprocedure(
       'public.record_wallet_entry(UUID,NUMERIC,wallet_txn_type,TEXT,TEXT,UUID)'
     ) IS NULL THEN
    RAISE NOTICE 'Migration 025 is not applied - nothing seeded.';
    RETURN;
  END IF;

  SELECT id INTO v_rider  FROM public.users WHERE email = 'rider@kipita.test';
  SELECT id INTO v_driver FROM public.users WHERE email = 'driver@kipita.test';

  IF v_rider IS NULL THEN
    RAISE NOTICE 'rider@kipita.test not found - run seed.sql first.';
    RETURN;
  END IF;

  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_rider;

  IF v_wallet IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE wallet_id = v_wallet AND reference = 'seed-topup-1'
  ) THEN
    PERFORM public.credit_wallet(
      v_rider, 3000, 'topup', 'seed-topup-1', 'M-Pesa top-up RJT4KX9QLM'
    );
  END IF;

  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_rider;

  IF NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE wallet_id = v_wallet AND reference = 'seed-topup-2'
  ) THEN
    PERFORM public.credit_wallet(
      v_rider, 1500, 'topup', 'seed-topup-2', 'M-Pesa top-up RJT7PP2WQA'
    );
  END IF;

  FOR v_booking IN
    SELECT b.id, b.driver_id, b.total_price, b.status, b.created_at,
           b.booking_reference
      FROM public.bookings b
     WHERE b.passenger_id = v_rider
       AND b.status <> 'pending_payment'
     ORDER BY b.created_at DESC
  LOOP
    v_escrow := CASE v_booking.status
                  WHEN 'confirmed'   THEN 'held'
                  WHEN 'in_progress' THEN 'held'
                  WHEN 'completed'   THEN 'released'
                  WHEN 'cancelled'   THEN 'refunded'
                END;

    CONTINUE WHEN v_escrow IS NULL;

    v_fee     := ROUND(v_booking.total_price * 0.12, 2);
    v_earning := ROUND(v_booking.total_price - v_fee, 2);

    INSERT INTO public.payments (
      booking_id, user_id, amount, currency, method, status,
      idempotency_key, transaction_reference, escrow_status,
      platform_fee, driver_earning, held_at, released_at, refunded_at,
      payout_status, paid_at, created_at, updated_at
    )
    VALUES (
      v_booking.id, v_rider, v_booking.total_price, 'KES', 'mpesa',
      CASE WHEN v_escrow = 'refunded' THEN 'refunded' ELSE 'completed' END,
      'seed-wallet-' || v_booking.id,
      'SEED' || UPPER(SUBSTRING(REPLACE(v_booking.id::TEXT, '-', '') FROM 1 FOR 8)),
      v_escrow::public.escrow_status,
      v_fee, v_earning,
      v_booking.created_at,
      CASE WHEN v_escrow = 'released' THEN v_booking.created_at + INTERVAL '6 hours' END,
      CASE WHEN v_escrow = 'refunded' THEN v_booking.created_at + INTERVAL '2 days' END,
      CASE WHEN v_escrow = 'released' THEN 'wallet' END,
      v_booking.created_at,
      v_booking.created_at,
      v_booking.created_at
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    SELECT id INTO v_payment
      FROM public.payments
     WHERE idempotency_key = 'seed-wallet-' || v_booking.id;

    CONTINUE WHEN v_payment IS NULL;

    PERFORM public.record_wallet_entry(
      v_rider, v_booking.total_price, 'escrow_hold', v_payment::TEXT,
      'Fare held for ' || COALESCE(v_booking.booking_reference,
                                   SUBSTRING(v_booking.id::TEXT FROM 1 FOR 8)),
      v_booking.id
    );

    IF v_escrow = 'released' THEN
      PERFORM public.record_wallet_entry(
        v_rider, v_booking.total_price, 'escrow_release', v_payment::TEXT,
        'Fare released to your driver for ' ||
          COALESCE(v_booking.booking_reference,
                   SUBSTRING(v_booking.id::TEXT FROM 1 FOR 8)),
        v_booking.id
      );

      SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_booking.driver_id;
      IF v_wallet IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions
         WHERE wallet_id = v_wallet AND type = 'payout' AND reference = v_payment::TEXT
      ) THEN
        PERFORM public.credit_wallet(
          v_booking.driver_id, v_earning, 'payout', v_payment::TEXT,
          'Ride earning for ' || COALESCE(v_booking.booking_reference,
                                          SUBSTRING(v_booking.id::TEXT FROM 1 FOR 8)),
          v_booking.id
        );
      END IF;
    END IF;

    IF v_escrow = 'refunded' THEN
      SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_rider;
      IF NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions
         WHERE wallet_id = v_wallet AND type = 'refund' AND reference = v_payment::TEXT
      ) THEN
        PERFORM public.credit_wallet(
          v_rider, v_booking.total_price, 'refund', v_payment::TEXT,
          'Refund for ' || COALESCE(v_booking.booking_reference,
                                    SUBSTRING(v_booking.id::TEXT FROM 1 FOR 8)),
          v_booking.id
        );
      END IF;
    END IF;

    v_n := v_n + 1;
  END LOOP;

  IF v_driver IS NOT NULL THEN
    SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_driver;

    IF v_wallet IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions
       WHERE wallet_id = v_wallet AND reference = 'seed-payout-1'
    ) THEN
      PERFORM public.credit_wallet(
        v_driver, 2464, 'payout', 'seed-payout-1',
        'Ride earning for Nairobi to Nakuru'
      );
    END IF;

    SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_driver;

    IF NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions
       WHERE wallet_id = v_wallet AND reference = 'seed-payout-2'
    ) THEN
      PERFORM public.credit_wallet(
        v_driver, 1056, 'payout', 'seed-payout-2',
        'Ride earning for Nairobi to Naivasha'
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.wallet_withdrawals
       WHERE user_id = v_driver AND provider_reference = 'seed-withdrawal-1'
    ) THEN
      INSERT INTO public.wallet_withdrawals (
        user_id, amount, phone, status, provider_reference, processed_at
      )
      VALUES (v_driver, 1000, '254700000002', 'paid', 'seed-withdrawal-1', NOW());

      PERFORM public.debit_wallet(
        v_driver, 1000, 'withdrawal', 'seed-withdrawal-1',
        'Withdrawal to 254700000002'
      );
    END IF;
  END IF;

  RAISE NOTICE 'Wallet seed complete: % booking payment(s) processed.', v_n;
END $$;

SELECT
  u.email,
  w.balance                                              AS available,
  COALESCE((SELECT SUM(p.amount) FROM public.payments p
             WHERE p.user_id = u.id AND p.escrow_status = 'held'), 0) AS in_escrow,
  (SELECT COUNT(*) FROM public.wallet_transactions t
    WHERE t.wallet_id = w.id)                            AS ledger_rows
FROM public.users u
JOIN public.wallets w ON w.user_id = u.id
WHERE u.email IN ('rider@kipita.test', 'driver@kipita.test')
ORDER BY u.email;
