import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Admin decision on a pending refund request.
 *
 *   approve → refund the full fare to the passenger's Kipita wallet;
 *             escrow → 'refunded'.
 *   reject  → release the escrow to the driver (wallet payout, minus the
 *             Kipita fee already computed at capture); escrow → 'released'.
 *
 * Admin-only. Idempotent: a request that's no longer 'pending' returns its
 * current state without moving money twice.
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
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve the caller and require admin.
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: authData } = await admin.auth.getUser(jwt);
    const authUid = authData.user?.id;
    if (!authUid) return json({ error: 'Unauthorized' }, 401);

    const { data: me } = await admin
      .from('users')
      .select('id, is_admin')
      .eq('auth_id', authUid)
      .single();
    if (!me?.is_admin) return json({ error: 'Admin only' }, 403);

    const { refund_id, decision, note } = await req.json();
    if (!refund_id || (decision !== 'approve' && decision !== 'reject')) {
      return json({ error: 'refund_id and decision (approve|reject) required' }, 400);
    }

    // Claim the request — flip it out of 'pending' atomically so two admins
    // can't both act on it.
    const nextStatus = decision === 'approve' ? 'approved' : 'rejected';
    const { data: claimed } = await admin
      .from('refund_requests')
      .update({
        status: nextStatus,
        reviewed_by: me.id,
        reviewed_at: new Date().toISOString(),
        review_note: note ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', refund_id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();

    if (!claimed) {
      // Already resolved (or not found) — report current state.
      const { data: current } = await admin
        .from('refund_requests')
        .select('status')
        .eq('id', refund_id)
        .maybeSingle();
      return json({ resolved: true, already: true, status: current?.status ?? 'unknown' });
    }

    const { data: payment } = await admin
      .from('payments')
      .select('*')
      .eq('id', claimed.payment_id)
      .single();

    if (decision === 'approve') {
      // Refund the full fare to the passenger's wallet.
      await admin.rpc('credit_wallet', {
        p_user_id: claimed.passenger_id,
        p_amount: Number(claimed.amount),
        p_type: 'refund',
        p_reference: claimed.payment_id,
        p_description: `Refund for booking ${claimed.booking_id.slice(0, 8)}`,
      });

      await admin
        .from('payments')
        .update({
          escrow_status: 'refunded',
          status: 'refunded',
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimed.payment_id);

      await admin.from('notifications').insert({
        user_id: claimed.passenger_id,
        type: 'payment_success',
        title: 'Refund Approved',
        body: `KES ${claimed.amount} has been refunded to your Kipita wallet.`,
        data: { booking_id: claimed.booking_id, payment_id: claimed.payment_id },
      });

      return json({ resolved: true, decision, amount: Number(claimed.amount) });
    }

    // ── reject → release the fare to the driver (minus the Kipita fee) ──
    const driverEarning = Number(payment?.driver_earning) || Number(claimed.amount);
    const fee = Number(payment?.platform_fee) || 0;

    if (claimed.driver_id) {
      await admin.rpc('credit_wallet', {
        p_user_id: claimed.driver_id,
        p_amount: driverEarning,
        p_type: 'payout',
        p_reference: claimed.payment_id,
        p_description: `Ride earning for booking ${claimed.booking_id.slice(0, 8)}`,
      });
    }

    await admin
      .from('payments')
      .update({
        escrow_status: 'released',
        released_at: new Date().toISOString(),
        payout_status: 'wallet',
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimed.payment_id);

    await admin.from('notifications').insert([
      {
        user_id: claimed.passenger_id,
        type: 'payment_failed',
        title: 'Refund Declined',
        body: 'After review, your refund request was not approved. Contact support if you have questions.',
        data: { booking_id: claimed.booking_id, payment_id: claimed.payment_id },
      },
      ...(claimed.driver_id
        ? [{
            user_id: claimed.driver_id,
            type: 'payment_success',
            title: 'You’ve Been Paid',
            body: `KES ${driverEarning} added to your Kipita wallet (Kipita fee KES ${fee}).`,
            data: { booking_id: claimed.booking_id, payment_id: claimed.payment_id },
          }]
        : []),
    ]);

    return json({ resolved: true, decision, driver_earning: driverEarning, platform_fee: fee });
  } catch (err) {
    console.error('resolve-refund error:', err);
    return json({ error: 'Resolve failed' }, 500);
  }
});
