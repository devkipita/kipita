import { supabase } from '@/lib/supabase';
import { bookingAmounts, DEFAULT_FARE_CONFIG, splitPaidTotal } from '@kipita/shared';
import type { Booking, Payment, PaymentMethod } from '@/types';

/**
 * What a booking's total is made of. Since migration 052 the Kipita fee is added on top of the seat
 * price when the booking is created (bookings.service_fee) and the driver keeps the full seat price.
 * Bookings without a stored fee (older ones) have the fee deducted from the driver at 12% instead.
 * Client-side this only drives what is shown: the edge functions use the database values when money moves.
 */
export function paymentBreakdown(
  booking: Pick<Booking, 'total_price' | 'service_fee'>,
): { fee: number; driverEarning: number; onTop: boolean } {
  return splitPaidTotal(booking.total_price, booking.service_fee);
}

/**
 * A preview of the amounts for a seat booking, for bookings the app builds locally before a row exists.
 * Uses the default 12% fee on top. A real booking row always carries the database's own figures.
 */
export function previewBooking(
  seatPriceKes: number,
  seats = 1,
): { total_price: number; service_fee: number } {
  try {
    const a = bookingAmounts(seatPriceKes, seats, DEFAULT_FARE_CONFIG);
    return { total_price: a.totalKes, service_fee: a.serviceFeeKes };
  } catch {
    // A seat price that is not a whole number of shillings.
    const subtotal = seatPriceKes * seats;
    const fee = Math.round((subtotal * DEFAULT_FARE_CONFIG.feeBps) / 10000);
    return { total_price: subtotal + fee, service_fee: fee };
  }
}

/** Initiate payment via Edge Function (secure backend) */
export async function initiatePayment(params: {
  booking_id: string;
  user_id: string;
  amount: number;
  method: PaymentMethod;
  phone?: string;
}): Promise<{ payment_id: string; provider_reference?: string; status?: string }> {
  const { data, error } = await supabase.functions.invoke('initiate-payment', {
    body: params,
  });
  if (error) throw error;
  return data as { payment_id: string; provider_reference?: string; status?: string };
}

/** Poll or check payment status */
export async function checkPaymentStatus(paymentId: string): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();
  if (error) throw error;
  return data as Payment;
}

/** Confirm payment (called from backend webhook, but can be polled client-side) */
export async function confirmPayment(paymentId: string): Promise<Payment> {
  const { data, error } = await supabase.functions.invoke('confirm-payment', {
    body: { payment_id: paymentId },
  });
  if (error) throw error;
  return data as Payment;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Poll payment status until the M-Pesa STK push resolves. Safaricom hits our
 * `mpesa-callback` after the passenger enters their PIN, which flips the row to
 * `completed` (funds held in escrow) or `failed`. Resolves true once captured,
 * false on failure/timeout.
 */
export async function pollPaymentStatus(
  paymentId: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<boolean> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const payment = await checkPaymentStatus(paymentId);
      if (payment.status === 'completed') return true;
      if (payment.status === 'failed') return false;
    } catch {
      // transient — keep polling until the deadline
    }
    await sleep(intervalMs);
  }
  return false;
}

/**
 * Release escrowed ride funds to the driver, minus the Kipita fee. Called when
 * the driver ends the ride. Best-effort: mock/cash rides simply return
 * `released: false` and the caller can proceed.
 */
export async function releaseEscrow(
  bookingId: string,
  driverId?: string,
): Promise<{ released: boolean; driver_earning?: number; platform_fee?: number }> {
  const { data, error } = await supabase.functions.invoke('release-escrow', {
    body: { booking_id: bookingId, driver_id: driverId },
  });
  if (error) throw error;
  return data as { released: boolean; driver_earning?: number; platform_fee?: number };
}
