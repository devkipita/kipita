import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FEE_FALLBACK = Number(Deno.env.get('KIPITA_FEE_PERCENT') ?? '12');

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function feePercent(
  supabase: ReturnType<typeof createClient>,
): Promise<number> {
  const { data } = await supabase.rpc('setting_numeric', {
    p_key: 'platform_fee_percent',
    p_default: FEE_FALLBACK,
  });
  const rate = Number(data ?? NaN);
  return Number.isFinite(rate) && rate > 0 ? rate : FEE_FALLBACK;
}

function escrowSplit(
  amount: number,
  percent: number,
): { fee: number; driverEarning: number } {
  const fee = round2((amount * percent) / 100);
  return { fee, driverEarning: round2(amount - fee) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const bearer = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');

    if (bearer !== serviceKey) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

    const { payment_id } = await req.json();

    // Fetch payment
    const { data: payment, error: paymentErr } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (paymentErr || !payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotent: already completed
    if (payment.status === 'completed') {
      return new Response(JSON.stringify(payment), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, trip:trips(*)')
      .eq('id', payment.booking_id)
      .single();

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', payment_id);

      return new Response(
        JSON.stringify({ error: 'This hold expired before payment completed' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Passenger payment captured to the Kipita paybill. Compute the escrow
    // split now and HOLD the funds — they are released to the driver (minus the
    // Kipita fee) only when the ride is ended. See release-escrow.
    const percent = await feePercent(supabase);
    const { fee, driverEarning } = escrowSplit(Number(payment.amount), percent);
    const { data: updatedPayment } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        escrow_status: 'held',
        platform_fee: fee,
        driver_earning: driverEarning,
        fee_percent: percent,
        held_at: new Date().toISOString(),
        paid_at: payment.paid_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment_id)
      .select('*')
      .single();

    await supabase.rpc('record_wallet_entry', {
      p_user_id: booking.passenger_id,
      p_amount: Number(payment.amount),
      p_type: 'escrow_hold',
      p_reference: payment_id,
      p_description: `Fare held for booking ${booking.booking_reference ?? String(booking.id).slice(0, 8)}`,
      p_booking_id: booking.id,
    });

    // Update booking to confirmed
    await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_id: payment_id,
        expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.booking_id);

    // Update ride request status if linked
    if (booking.request_id) {
      await supabase
        .from('ride_requests')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', booking.request_id);
    }

    // Increment trip counts for both users
    await supabase.rpc('increment_trip_count', { p_user_id: booking.passenger_id });
    await supabase.rpc('increment_trip_count', { p_user_id: booking.driver_id });

    // Create notifications
    const notifications = [
      {
        user_id: booking.passenger_id,
        type: 'payment_success',
        title: 'Payment Held Securely',
        body: `KES ${payment.amount} is held safely and released to your driver when your ride ends.`,
        data: { booking_id: booking.id, payment_id },
      },
      {
        user_id: booking.driver_id,
        type: 'ride_match',
        title: 'New Booking',
        body: `A passenger has booked ${booking.seats_booked} seat(s) on your ride.`,
        data: { booking_id: booking.id },
      },
    ];

    await supabase.from('notifications').insert(notifications);

    // Trigger confirmation emails via send-email function
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          template: 'trip_confirmation',
          to: booking.passenger_id,
          data: { booking_id: booking.id },
        },
      });
      await supabase.functions.invoke('send-email', {
        body: {
          template: 'payment_receipt',
          to: booking.passenger_id,
          data: { payment_id, booking_id: booking.id },
        },
      });
    } catch (emailErr) {
      // Non-blocking: log but don't fail
      console.error('Email send failed:', emailErr);
    }

    return new Response(JSON.stringify(updatedPayment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Payment confirmation error:', err);
    return new Response(JSON.stringify({ error: 'Confirmation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
