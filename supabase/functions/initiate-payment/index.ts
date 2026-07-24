import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { booking_id, user_id, amount, method, phone } = await req.json();

    // Validate booking exists and belongs to user
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('passenger_id', user_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check idempotency — don't create duplicate payments
    const idempotencyKey = `${booking_id}-${method}-${amount}`;
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingPayment && existingPayment.status !== 'failed') {
      return new Response(JSON.stringify({
        payment_id: existingPayment.id,
        status: existingPayment.status,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create payment record
    const { data: payment, error: paymentErr } = await supabase
      .from('payments')
      .insert({
        booking_id,
        user_id,
        amount,
        method,
        currency: 'KES',
        status: 'processing',
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    if (paymentErr) throw paymentErr;

    let providerReference: string | null = null;

    if (method === 'mpesa') {
      // M-Pesa STK Push via Daraja API
      providerReference = await initiateMpesaSTK({
        phone: phone!,
        amount,
        paymentId: payment.id,
      });
    } else if (method === 'card') {
      // Card payment — placeholder for provider adapter
      providerReference = `card-${payment.id}`;
    }

    // Update payment with provider reference
    if (providerReference) {
      await supabase
        .from('payments')
        .update({ provider_reference: providerReference })
        .eq('id', payment.id);
    }

    return new Response(JSON.stringify({
      payment_id: payment.id,
      status: 'processing',
      provider_reference: providerReference,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Payment initiation error:', err);
    return new Response(JSON.stringify({ error: 'Payment initiation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * M-Pesa Daraja STK Push
 * Uses Safaricom Daraja API to initiate Lipa Na M-Pesa
 */
async function initiateMpesaSTK(params: {
  phone: string;
  amount: number;
  paymentId: string;
}): Promise<string> {
  const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY')!;
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')!;
  const shortcode = Deno.env.get('MPESA_SHORTCODE')!;
  const passkey = Deno.env.get('MPESA_PASSKEY')!;
  const callbackUrl = Deno.env.get('MPESA_CALLBACK_URL')!;
  const baseUrl = Deno.env.get('MPESA_BASE_URL') ?? 'https://sandbox.safaricom.co.ke';

  // Get access token
  const authStr = btoa(`${consumerKey}:${consumerSecret}`);
  const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${authStr}` },
  });
  const { access_token } = await tokenRes.json();

  // Format timestamp
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const password = btoa(`${shortcode}${passkey}${timestamp}`);

  // Format phone (ensure 254...)
  let phone = params.phone.replace(/\s+/g, '');
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0')) phone = `254${phone.slice(1)}`;

  const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(params.amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: `${callbackUrl}?payment_id=${params.paymentId}`,
      AccountReference: `Kipita-${params.paymentId.slice(0, 8)}`,
      TransactionDesc: 'Kipita ride payment',
    }),
  });

  const stkData = await stkRes.json();

  if (stkData.ResponseCode !== '0') {
    throw new Error(`M-Pesa STK Push failed: ${stkData.ResponseDescription}`);
  }

  return stkData.CheckoutRequestID;
}
