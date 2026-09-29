import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/**
 * M-Pesa Daraja STK Push callback.
 *
 * Safaricom POSTs the result of a Lipa Na M-Pesa Online payment here (the URL
 * set as `CallBackURL` in initiate-payment, with `?payment_id=<id>` appended).
 * On success we record the M-Pesa receipt and hand off to `confirm-payment`,
 * which captures the fare into escrow and confirms the booking. On failure we
 * mark the payment failed and notify the passenger.
 *
 * Daraja expects a 200 with `{ ResultCode: 0 }` regardless, so it stops
 * retrying — application errors are logged, not surfaced to Safaricom.
 */
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const ack = () =>
    new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');
    const topupId = url.searchParams.get('topup_id');
    const body = await req.json();

    const stk = body?.Body?.stkCallback;
    if (!stk || (!paymentId && !topupId)) {
      console.error('mpesa-callback: missing payment_id/topup_id or stkCallback', {
        paymentId,
        topupId,
      });
      return ack();
    }

    const resultCode = Number(stk.ResultCode);

    if (topupId) {
      await settleTopup(supabase, topupId, resultCode, stk);
      return ack();
    }

    if (!paymentId) return ack();

    // Guard against replays / already-settled payments.
    const { data: payment } = await supabase
      .from('payments')
      .select('id, status, escrow_status')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      console.error('mpesa-callback: payment not found', { paymentId });
      return ack();
    }
    if (payment.status === 'completed') {
      return ack(); // idempotent — already captured
    }

    if (resultCode !== 0) {
      // Passenger cancelled the prompt, timed out, or had insufficient funds.
      await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', paymentId);

      const { data: failedBooking } = await supabase
        .from('payments')
        .select('booking_id, bookings(passenger_id)')
        .eq('id', paymentId)
        .single();

      const passengerId = (failedBooking as any)?.bookings?.passenger_id;
      if (passengerId) {
        await supabase.from('notifications').insert({
          user_id: passengerId,
          type: 'payment_failed',
          title: 'Payment Not Completed',
          body: stk.ResultDesc ?? 'The M-Pesa payment was not completed.',
          data: { payment_id: paymentId },
        });
      }
      return ack();
    }

    // Success — pull the M-Pesa receipt number & amount from the metadata items.
    const items: Array<{ Name: string; Value?: string | number }> =
      stk.CallbackMetadata?.Item ?? [];
    const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;

    await supabase
      .from('payments')
      .update({
        transaction_reference: receipt ? String(receipt) : null,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    // Capture into escrow + confirm the booking (idempotent, transactional).
    const { error: confirmErr } = await supabase.functions.invoke('confirm-payment', {
      body: { payment_id: paymentId },
    });
    if (confirmErr) {
      console.error('mpesa-callback: confirm-payment failed', confirmErr);
    }

    return ack();
  } catch (err) {
    console.error('mpesa-callback error:', err);
    return ack();
  }
});

async function settleTopup(
  supabase: ReturnType<typeof createClient>,
  topupId: string,
  resultCode: number,
  stk: Record<string, any>,
): Promise<void> {
  const { data: topup } = await supabase
    .from('wallet_topups')
    .select('id, user_id, amount, status')
    .eq('id', topupId)
    .single();

  if (!topup) {
    console.error('mpesa-callback: topup not found', { topupId });
    return;
  }
  if (topup.status === 'completed') return;

  if (resultCode !== 0) {
    await supabase
      .from('wallet_topups')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', topupId);

    await supabase.from('notifications').insert({
      user_id: topup.user_id,
      type: 'payment_failed',
      title: 'Top-Up Not Completed',
      body: stk.ResultDesc ?? 'The M-Pesa top-up was not completed.',
      data: { topup_id: topupId },
    });
    return;
  }

  const items: Array<{ Name: string; Value?: string | number }> =
    stk.CallbackMetadata?.Item ?? [];
  const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;

  const { data: claimed } = await supabase
    .from('wallet_topups')
    .update({
      status: 'completed',
      transaction_reference: receipt ? String(receipt) : null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', topupId)
    .neq('status', 'completed')
    .select('id')
    .maybeSingle();

  if (!claimed) return;

  await supabase.rpc('credit_wallet', {
    p_user_id: topup.user_id,
    p_amount: Number(topup.amount),
    p_type: 'topup',
    p_reference: topupId,
    p_description: receipt ? `M-Pesa top-up ${receipt}` : 'M-Pesa top-up',
  });

  await supabase.from('notifications').insert({
    user_id: topup.user_id,
    type: 'payment_success',
    title: 'Wallet Topped Up',
    body: `KES ${topup.amount} has been added to your Kipita wallet.`,
    data: { topup_id: topupId },
  });
}
