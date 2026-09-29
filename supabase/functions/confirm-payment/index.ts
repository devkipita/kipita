import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Kipita's platform commission, as a percentage of the fare (default 12%). */
const FEE_PERCENT = Number(Deno.env.get('KIPITA_FEE_PERCENT') ?? '12');

/** Round to 2 decimal places (KES cents). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Split a fare into Kipita's fee and the driver's earning. */
function escrowSplit(amount: number): { fee: number; driverEarning: number } {
  const fee = round2((amount * FEE_PERCENT) / 100);
  return { fee, driverEarning: round2(amount - fee) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

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
      .select('*, ride:rides(*)')
      .eq('id', payment.booking_id)
      .single();

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Transactional seat deduction
    const { data: seatResult } = await supabase.rpc('deduct_seats', {
      p_ride_id: booking.ride_id,
      p_seats: booking.seats_booked,
    });

    if (!seatResult) {
      // Not enough seats — payment fails
      await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', payment_id);

      return new Response(JSON.stringify({ error: 'Not enough seats available' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Passenger payment captured to the Kipita paybill. Compute the escrow
    // split now and HOLD the funds — they are released to the driver (minus the
    // Kipita fee) only when the ride is ended. See release-escrow.
    const { fee, driverEarning } = escrowSplit(Number(payment.amount));
    const { data: updatedPayment } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        escrow_status: 'held',
        platform_fee: fee,
        driver_earning: driverEarning,
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
