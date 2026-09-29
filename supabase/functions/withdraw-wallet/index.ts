import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_WITHDRAWAL = 100;

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
      .select('id, phone')
      .eq('auth_id', authUid)
      .single();
    if (!me) return json({ error: 'Profile not found' }, 404);

    const body = await req.json();
    const value = Number(body?.amount);
    const phone = normalisePhone(String(body?.phone ?? me.phone ?? ''));

    if (!Number.isFinite(value) || value < MIN_WITHDRAWAL) {
      return json({ error: `The smallest withdrawal is KES ${MIN_WITHDRAWAL}.` }, 400);
    }
    if (!phone) return json({ error: 'An M-Pesa number is required.' }, 400);

    const { data: open } = await supabase
      .from('wallet_withdrawals')
      .select('id')
      .eq('user_id', me.id)
      .in('status', ['pending', 'processing'])
      .maybeSingle();

    if (open) {
      return json({ error: 'You already have a withdrawal in progress.' }, 409);
    }

    const { data: withdrawal, error: insertErr } = await supabase
      .from('wallet_withdrawals')
      .insert({ user_id: me.id, amount: value, phone, status: 'processing' })
      .select('id')
      .single();

    if (insertErr) throw insertErr;

    const { error: debitErr } = await supabase.rpc('debit_wallet', {
      p_user_id: me.id,
      p_amount: value,
      p_type: 'withdrawal',
      p_reference: withdrawal.id,
      p_description: `Withdrawal to ${phone}`,
    });

    if (debitErr) {
      await supabase
        .from('wallet_withdrawals')
        .update({
          status: 'failed',
          failure_reason: 'insufficient_funds',
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawal.id);

      return json({ error: 'Your wallet balance is too low for that amount.' }, 409);
    }

    const b2cReady =
      !!Deno.env.get('MPESA_INITIATOR_NAME') &&
      !!Deno.env.get('MPESA_SECURITY_CREDENTIAL') &&
      !!Deno.env.get('MPESA_B2C_SHORTCODE');

    if (!b2cReady) {
      return json({
        requested: true,
        withdrawal_id: withdrawal.id,
        status: 'pending',
        message: 'Your withdrawal is queued and will be sent to M-Pesa shortly.',
      });
    }

    try {
      const reference = await sendB2C({
        phone,
        amount: value,
        remarks: `Kipita withdrawal ${withdrawal.id.slice(0, 8)}`,
      });

      await supabase
        .from('wallet_withdrawals')
        .update({
          status: 'paid',
          provider_reference: reference,
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawal.id);

      await supabase.from('notifications').insert({
        user_id: me.id,
        type: 'payment_success',
        title: 'Withdrawal Sent',
        body: `KES ${value} is on its way to ${phone}.`,
        data: { withdrawal_id: withdrawal.id },
      });

      return json({
        requested: true,
        withdrawal_id: withdrawal.id,
        status: 'paid',
        provider_reference: reference,
      });
    } catch (b2cErr) {
      console.error('withdraw-wallet B2C failed, refunding wallet:', b2cErr);

      await supabase.rpc('credit_wallet', {
        p_user_id: me.id,
        p_amount: value,
        p_type: 'refund',
        p_reference: `${withdrawal.id}-reversal`,
        p_description: 'Withdrawal could not be sent — returned to your wallet',
      });

      await supabase
        .from('wallet_withdrawals')
        .update({
          status: 'failed',
          failure_reason: 'mpesa_unavailable',
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawal.id);

      return json({ error: 'M-Pesa could not be reached. Your balance is unchanged.' }, 502);
    }
  } catch (err) {
    console.error('withdraw-wallet error:', err);
    return json({ error: 'Withdrawal failed' }, 500);
  }
});

function normalisePhone(value: string): string {
  let phone = value.replace(/\s+/g, '');
  if (!phone) return '';
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0')) phone = `254${phone.slice(1)}`;
  if (!phone.startsWith('254')) phone = `254${phone}`;
  return /^254\d{9}$/.test(phone) ? phone : '';
}

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
      PartyB: params.phone,
      Remarks: params.remarks,
      QueueTimeOutURL: timeoutUrl,
      ResultURL: resultUrl,
      Occasion: 'WalletWithdrawal',
    }),
  });

  const data = await res.json();
  if (data.ResponseCode !== '0') {
    throw new Error(`B2C failed: ${data.ResponseDescription ?? JSON.stringify(data)}`);
  }
  return data.ConversationID ?? data.OriginatorConversationID ?? 'b2c';
}
