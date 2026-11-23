-- 079_late_payment_refund.sql
-- Money that arrives after a booking was cancelled goes back to the passenger's wallet, and payments left
-- in "processing" are cleaned up.
--
-- The hole: a passenger enters the M-Pesa PIN after the hold ended (or after they cancelled). mpesa-callback
-- stores the receipt and calls confirm-payment, which saw a cancelled booking, marked the payment "failed"
-- and returned. The money was in the paybill and the passenger got nothing back.
--
-- refund_late_payment(payment_id)
--   Called by confirm-payment when the booking is cancelled. If an M-Pesa receipt is stored the money has
--   arrived: the full amount is credited to the passenger's wallet (wallet entry type "refund", reference
--   "<payment id>:late"), the payment is marked refunded, and the passenger gets a notification. If no
--   receipt is stored the payment is marked failed, as before. Safe to call again: a payment that is
--   already refunded or completed is left alone. Returns one of:
--     refunded | already_refunded | no_money | completed | booking_live | not_found
--
-- sweep_stuck_payments()
--   Runs every 5 minutes (job kipita-sweep-stuck-payments).
--   1. A "processing" payment with no M-Pesa receipt is marked failed when it can no longer be waiting for a
--      callback: 3 minutes with no provider reference (the prompt was never sent), 15 minutes with one
--      (the prompt has long expired). A callback that still arrives later is handled by confirm-payment.
--   2. A payment that has a receipt, whose booking is cancelled, and that nothing refunded (confirm-payment
--      crashed or could not reach the database) is refunded the same way as above.
--
-- Not changed: payments that are completed, the cancellation policy refunds (063), refund_booking_payment.
-- Safe to run more than once. Deploy the confirm-payment function from the same change after this runs; the
-- old function keeps working without it (it just does not refund).

BEGIN;

CREATE OR REPLACE FUNCTION public.refund_late_payment(p_payment_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_ref     TEXT;
BEGIN
  -- Lock the payment first so two callers (confirm-payment and the sweep) cannot both refund it.
  SELECT p.* INTO v_payment
    FROM public.payments p
   WHERE p.id = p_payment_id
     FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RETURN 'not_found';
  END IF;

  IF v_payment.status = 'refunded' OR v_payment.escrow_status = 'refunded' THEN
    RETURN 'already_refunded';
  END IF;

  -- Taken and held (or released): the cancellation policy and the escrow release own it, not this function.
  IF v_payment.status = 'completed' OR v_payment.escrow_status <> 'none' THEN
    RETURN 'completed';
  END IF;

  SELECT b.* INTO v_booking
    FROM public.bookings b
   WHERE b.id = v_payment.booking_id;

  IF v_booking.id IS NULL OR v_booking.status <> 'cancelled' THEN
    RETURN 'booking_live';
  END IF;

  -- No receipt stored: no money arrived. Same result as before this migration.
  IF v_payment.transaction_reference IS NULL AND v_payment.paid_at IS NULL THEN
    IF v_payment.status <> 'failed' THEN
      UPDATE public.payments p
         SET status = 'failed',
             updated_at = NOW()
       WHERE p.id = v_payment.id;
    END IF;
    RETURN 'no_money';
  END IF;

  v_ref := v_payment.id::TEXT || ':late';

  -- Second lock on the same fact: a refund entry for this payment already exists.
  IF EXISTS (
    SELECT 1
      FROM public.wallet_transactions wt
      JOIN public.wallets w ON w.id = wt.wallet_id
     WHERE w.user_id = v_booking.passenger_id
       AND wt.type = 'refund'
       AND wt.reference = v_ref
  ) THEN
    RETURN 'already_refunded';
  END IF;

  PERFORM public.credit_wallet(
    v_booking.passenger_id,
    v_payment.amount,
    'refund',
    v_ref,
    'Refund for late payment, booking ' ||
      COALESCE(v_booking.booking_reference, left(v_booking.id::TEXT, 8)),
    v_booking.id
  );

  -- The trigger on escrow_status stamps the booking (refunded_amount, refunded_at, refund_to = wallet).
  UPDATE public.payments p
     SET status = 'refunded',
         escrow_status = 'refunded',
         refunded_at = NOW(),
         updated_at = NOW()
   WHERE p.id = v_payment.id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_booking.passenger_id,
    'system',
    'Payment refunded to your wallet',
    'Your hold had ended before you paid. KES ' || trim_scale(v_payment.amount)::TEXT ||
      ' is back in your wallet.',
    jsonb_build_object('booking_id', v_booking.id, 'payment_id', v_payment.id, 'amount', v_payment.amount)
  );

  RETURN 'refunded';
END;
$$;

REVOKE ALL ON FUNCTION public.refund_late_payment(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_late_payment(UUID) TO service_role;

COMMENT ON FUNCTION public.refund_late_payment(UUID) IS
  'Sends money that arrived after a booking was cancelled back to the passenger''s wallet. Idempotent. Returns refunded, already_refunded, no_money, completed, booking_live or not_found.';

CREATE OR REPLACE FUNCTION public.sweep_stuck_payments()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_failed   INTEGER := 0;
  v_refunded INTEGER := 0;
  v_row      RECORD;
BEGIN
  -- 1. Processing, no receipt, and too old to be waiting for a callback.
  WITH stuck AS (
    SELECT p.id
      FROM public.payments p
     WHERE p.status = 'processing'
       AND p.escrow_status = 'none'
       AND p.transaction_reference IS NULL
       AND p.paid_at IS NULL
       AND p.updated_at < NOW() - CASE
             WHEN p.provider_reference IS NULL THEN INTERVAL '3 minutes'
             ELSE INTERVAL '15 minutes'
           END
       FOR UPDATE SKIP LOCKED
  ),
  done AS (
    UPDATE public.payments p
       SET status = 'failed',
           updated_at = NOW()
      FROM stuck
     WHERE p.id = stuck.id
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_failed FROM done;

  -- 2. Money arrived, the booking is cancelled, nothing refunded it. The 2 minutes keep this away from a
  --    confirm-payment call that is still running.
  FOR v_row IN
    SELECT p.id
      FROM public.payments p
      JOIN public.bookings b ON b.id = p.booking_id
     WHERE p.status IN ('pending', 'processing', 'failed')
       AND p.escrow_status = 'none'
       AND (p.transaction_reference IS NOT NULL OR p.paid_at IS NOT NULL)
       AND b.status = 'cancelled'
       AND p.updated_at < NOW() - INTERVAL '2 minutes'
  LOOP
    IF public.refund_late_payment(v_row.id) = 'refunded' THEN
      v_refunded := v_refunded + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('failed', v_failed, 'refunded', v_refunded);
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_stuck_payments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_stuck_payments() TO service_role;

COMMENT ON FUNCTION public.sweep_stuck_payments() IS
  'Marks processing payments with no M-Pesa receipt as failed once they cannot be waiting for a callback, and refunds receipts on cancelled bookings that nothing refunded. Runs every 5 minutes.';

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'kipita-sweep-stuck-payments';
  PERFORM cron.schedule('kipita-sweep-stuck-payments', '*/5 * * * *', 'SELECT public.sweep_stuck_payments()');
END;
$$;

COMMIT;
