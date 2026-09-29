import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_TOPUP = 10;
const MAX_TOPUP = 150_000;

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

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: authData } = await supabase.auth.getUser(jwt);
    const authUid = authData.user?.id;
    if (!authUid) return json({ error: 'Unauthorized' }, 401);

    const { data: me } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUid)
      .single();
    if (!me) return json({ error: 'Profile not found' }, 404);

    const { amount, phone } = await req.json();
    const value = Number(amount);

    if (!Number.isFinite(value) || value < MIN_TOPUP || value > MAX_TOPUP) {
      return json({ error: `Enter an amount between KES ${MIN_TOPUP} and KES ${MAX_TOPUP}.` }, 400);
    }
    if (!phone) return json({ error: 'phone required' }, 400);

    const minute = Math.floor(Date.now() / 60_000);
    const idempotencyKey = `topup-${me.id}-${value}-${minute}`;

    const { data: existing } = await supabase
      .from('wallet_topups')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing && existing.status !== 'failed') {
      return json({ topup_id: existing.id, status: existing.status });
    }

    const { data: topup, error: topupErr } = await supabase
      .from('wallet_topups')
      .insert({
        user_id: me.id,
        amount: value,
        method: 'mpesa',
        phone,
        status: 'processing',
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    if (topupErr) throw topupErr;

    let providerReference: string | null = null;
    try {
      providerReference = await initiateMpesaSTK({ phone, amount: value, topupId: topup.id });
    } catch (stkErr) {
      await supabase
        .from('wallet_topups')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', topup.id);
      console.error('topup-wallet STK failed:', stkErr);
      return json({ error: 'Could not reach M-Pesa. Try again.' }, 502);
    }

    await supabase
      .from('wallet_topups')
      .update({ provider_reference: providerReference })
      .eq('id', topup.id);

    return json({
      topup_id: topup.id,
      status: 'processing',
      provider_reference: providerReference,
    });
  } catch (err) {
    console.error('topup-wallet error:', err);
    return json({ error: 'Top-up failed' }, 500);
  }
});

async function initiateMpesaSTK(params: {
  phone: string;
  amount: number;
  topupId: string;
}): Promise<string> {
  const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY')!;
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')!;
  const shortcode = Deno.env.get('MPESA_SHORTCODE')!;
  const passkey = Deno.env.get('MPESA_PASSKEY')!;
  const callbackUrl = Deno.env.get('MPESA_CALLBACK_URL')!;
  const baseUrl = Deno.env.get('MPESA_BASE_URL') ?? 'https://sandbox.safaricom.co.ke';

  const authStr = btoa(`${consumerKey}:${consumerSecret}`);
  const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${authStr}` },
  });
  const { access_token } = await tokenRes.json();

  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const password = btoa(`${shortcode}${passkey}${timestamp}`);

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
      CallBackURL: `${callbackUrl}?topup_id=${params.topupId}`,
      AccountReference: `KipitaWallet-${params.topupId.slice(0, 8)}`,
      TransactionDesc: 'Kipita wallet top-up',
    }),
  });

  const stkData = await stkRes.json();

  if (stkData.ResponseCode !== '0') {
    throw new Error(`M-Pesa STK Push failed: ${stkData.ResponseDescription}`);
  }

  return stkData.CheckoutRequestID;
}
