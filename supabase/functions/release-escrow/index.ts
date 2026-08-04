import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FEE_PERCENT = Number(Deno.env.get('KIPITA_FEE_PERCENT') ?? '12');

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function escrowSplit(amount: number): { fee: number; driverEarning: number } {
  const fee = round2((amount * FEE_PERCENT) / 100);
  return { fee, driverEarning: round2(amount - fee) };
}

/**
 * Release escrowed ride funds to the driver.
 *
 * Called when the driver ends the ride. Kipita takes its platform fee and
 * settles the remainder to the driver:
 *   • If M-Pesa B2C is configured, we push the driver's earning to their phone
 *     from the paybill (payout_status = 'paid').
 *   • Otherwise the earning is credited to the driver's in-app Kipita wallet
 *     for later withdrawal (payout_status = 'wallet').
 *
 * Idempotent: a booking whose escrow is already 'released' returns the existing
 * settlement without paying twice.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { booking_id, driver_id } = await req.json();
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    // Fetch the booking + the held payment for it.
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (!booking) return json({ error: 'Booking not found' }, 404);

    // Only the driver on the booking may release the funds.
    if (driver_id && booking.driver_id !== driver_id) {
      return json({ error: 'Not authorized to release this payment' }, 403);
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) {
      // No captured payment (e.g. cash/mock ride) — nothing to release.
      return json({ released: false, reason: 'no_escrow' });
    }

    // Idempotent: already released.
    if (payment.escrow_status === 'released') {
      return json({
        released: true,
        already: true,
        driver_earning: Number(payment.driver_earning),
        platform_fee: Number(payment.platform_fee),
        payout_reference: payment.payout_reference,
      });
    }

    if (payment.escrow_status !== 'held') {
      return json({ error: `Cannot release funds in state '${payment.escrow_status}'` }, 409);
    }

    // Prefer stored split; fall back to recomputing from the amount.
    const stored = Number(payment.driver_earning) > 0;
    const { fee, driverEarning } = stored
      ? { fee: Number(payment.platform_fee), driverEarning: Number(payment.driver_earning) }
      : escrowSplit(Number(payment.amount));

    // Settle the driver — try M-Pesa B2C, else credit the Kipita wallet.
    let payoutReference: string | null = null;
    let payoutStatus = 'wallet';

    const b2cReady =
      !!Deno.env.get('MPESA_INITIATOR_NAME') &&
      !!Deno.env.get('MPESA_SECURITY_CREDENTIAL') &&
      !!Deno.env.get('MPESA_B2C_SHORTCODE');

    if (b2cReady) {
      try {
        const { data: driver } = await supabase
          .from('users')
          .select('phone')
          .eq('id', booking.driver_id)
          .single();
        if (driver?.phone) {
          payoutReference = await sendB2C({
            phone: driver.phone,
            amount: driverEarning,
            remarks: `Kipita payout ${booking.booking_reference ?? booking_id.slice(0, 8)}`,
          });
          payoutStatus = 'paid';
        }
      } catch (b2cErr) {
        console.error('B2C payout failed, falling back to wallet:', b2cErr);
      }
    }

    if (payoutStatus === 'wallet') {
      // Credit the driver's in-app wallet as the settlement of record.
      await supabase.rpc('credit_wallet', {
        p_user_id: booking.driver_id,
        p_amount: driverEarning,
        p_type: 'payout',
        p_reference: payment.id,
        p_description: `Ride earning for ${booking.booking_reference ?? booking_id.slice(0, 8)}`,
      });
    }

    // Mark the escrow released.
    const { data: released } = await supabase
      .from('payments')
      .update({
        escrow_status: 'released',
        platform_fee: fee,
        driver_earning: driverEarning,
        released_at: new Date().toISOString(),
        payout_reference: payoutReference,
        payout_status: payoutStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .eq('escrow_status', 'held') // guard against concurrent double-release
      .select('*')
      .maybeSingle();

    if (!released) {
      // Lost the race — another request released it first. Treat as success.
      return json({ released: true, already: true, driver_earning: driverEarning, platform_fee: fee });
    }

    // Ensure the booking is marked completed.
    await supabase
      .from('bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', booking_id);

    // Notify the driver of the settlement.
    await supabase.from('notifications').insert({
      user_id: booking.driver_id,
      type: 'payment_success',
      title: 'You’ve Been Paid',
      body:
        payoutStatus === 'paid'
          ? `KES ${driverEarning} sent to your M-Pesa (Kipita fee KES ${fee}).`
          : `KES ${driverEarning} added to your Kipita wallet (Kipita fee KES ${fee}).`,
      data: { booking_id, payment_id: payment.id },
    });

    return json({
      released: true,
      driver_earning: driverEarning,
      platform_fee: fee,
      payout_status: payoutStatus,
      payout_reference: payoutReference,
    });
  } catch (err) {
    console.error('release-escrow error:', err);
    return json({ error: 'Release failed' }, 500);
  }
});

/**
 * M-Pesa Daraja B2C — pay a driver from the Kipita paybill to their phone.
 * Returns the ConversationID; final settlement is confirmed async on the
 * B2C result URL (out of scope here — wallet path is the ledger of record).
 */
async function sendB2C(params: {
  phone: string;
  amount: number;
  remarks: string;
}): Promise<string> {
  const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY')!;
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')!;
  const shortcode = Deno.env.get('MPESA_B2C_SHORTCODE')!;
  const initiatorName = Deno.env.get('MPESA_INITIATOR_NAME')!;
  const securityCredential = Deno.env.get('MPESA_SECURITY_CREDENTIAL')!;
  const resultUrl = Deno.env.get('MPESA_B2C_RESULT_URL')!;
  const timeoutUrl = Deno.env.get('MPESA_B2C_TIMEOUT_URL') ?? resultUrl;
  const baseUrl = Deno.env.get('MPESA_BASE_URL') ?? 'https://sandbox.safaricom.co.ke';

  const authStr = btoa(`${consumerKey}:${consumerSecret}`);
  const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${authStr}` },
  });
  const { access_token } = await tokenRes.json();

  let phone = params.phone.replace(/\s+/g, '');
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0')) phone = `254${phone.slice(1)}`;

  const res = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      InitiatorName: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: 'BusinessPayment',
      Amount: Math.floor(params.amount),
      PartyA: shortcode,
      PartyB: phone,
      Remarks: params.remarks,
      QueueTimeOutURL: timeoutUrl,
      ResultURL: resultUrl,
      Occasion: 'RidePayout',
    }),
  });

  const data = await res.json();
  if (data.ResponseCode !== '0') {
    throw new Error(`B2C failed: ${data.ResponseDescription ?? JSON.stringify(data)}`);
  }
  return data.ConversationID ?? data.OriginatorConversationID ?? 'b2c';
}
