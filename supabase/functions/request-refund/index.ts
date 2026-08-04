import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Open an admin-verified refund request for a cancelled paid ride.
 *
 * Called by the passenger when they cancel a booking whose fare is held in
 * escrow. This does NOT move any money — it records a pending request and
 * parks the escrow at 'refund_pending'. An admin later approves (→ wallet
 * refund) or rejects (→ release to driver) via resolve-refund.
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

    // Resolve the caller → their public.users row.
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: authData } = await admin.auth.getUser(jwt);
    const authUid = authData.user?.id;
    if (!authUid) return json({ error: 'Unauthorized' }, 401);

    const { data: me } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', authUid)
      .single();
    if (!me) return json({ error: 'Unauthorized' }, 401);

    const { booking_id, reason } = await req.json();
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    const { data: booking } = await admin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();
    if (!booking) return json({ error: 'Booking not found' }, 404);

    // Only the passenger who paid may open a refund.
    if (booking.passenger_id !== me.id) {
      return json({ error: 'Not authorized for this booking' }, 403);
    }

    // Find the captured (held) payment.
    const { data: payment } = await admin
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) {
      return json({ requested: false, reason: 'no_escrow' });
    }

    // Already released to the driver — nothing to refund.
    if (payment.escrow_status === 'released') {
      return json({ requested: false, reason: 'already_released' });
    }
    if (payment.escrow_status === 'refunded') {
      return json({ requested: false, reason: 'already_refunded' });
    }

    // If a request is already open, return it (idempotent).
    const { data: existing } = await admin
      .from('refund_requests')
      .select('id, status')
      .eq('payment_id', payment.id)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing) {
      return json({ requested: true, status: 'pending', refund_id: existing.id, already: true });
    }

    // Create the pending request.
    const { data: created, error: insertErr } = await admin
      .from('refund_requests')
      .insert({
        payment_id: payment.id,
        booking_id,
        passenger_id: booking.passenger_id,
        driver_id: booking.driver_id,
        amount: payment.amount,
        reason: reason ?? null,
      })
      .select('id')
      .single();

    if (insertErr) {
      // Unique-violation race — someone opened it a moment ago.
      if ((insertErr as any).code === '23505') {
        return json({ requested: true, status: 'pending', already: true });
      }
      throw insertErr;
    }

    // Park the escrow until an admin decides.
    await admin
      .from('payments')
      .update({ escrow_status: 'refund_pending', updated_at: new Date().toISOString() })
      .eq('id', payment.id);

    // Tell the passenger it's under review.
    await admin.from('notifications').insert({
      user_id: booking.passenger_id,
      type: 'system',
      title: 'Refund Requested',
      body: `Your refund of KES ${payment.amount} is under review. We'll notify you once it's processed.`,
      data: { booking_id, payment_id: payment.id },
    });

    // Ping the admins who review refunds.
    const { data: admins } = await admin
      .from('users')
      .select('id')
      .eq('is_admin', true);
    if (admins?.length) {
      await admin.from('notifications').insert(
        admins.map((a: { id: string }) => ({
          user_id: a.id,
          type: 'system',
          title: 'Refund To Review',
          body: `A KES ${payment.amount} refund request is awaiting your review.`,
          data: { refund_id: created.id, booking_id },
        })),
      );
    }

    return json({ requested: true, status: 'pending', refund_id: created.id });
  } catch (err) {
    console.error('request-refund error:', err);
    return json({ error: 'Refund request failed' }, 500);
  }
});
