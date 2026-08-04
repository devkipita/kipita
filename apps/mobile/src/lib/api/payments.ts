import { supabase } from '@/lib/supabase';
import type { Payment, PaymentMethod } from '@/types';

/**
 * Kipita's platform commission, as a percentage of the fare. Kept in sync with
 * the `KIPITA_FEE_PERCENT` env used by the confirm-payment / release-escrow
 * edge functions. Client-side it's only used to preview the split — the backend
 * is the source of truth when funds are actually released.
 */
export const KIPITA_FEE_PERCENT = 12;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Split a fare into Kipita's fee and the driver's take-home earning. */
export function computeEscrowSplit(amount: number): {
  fee: number;
  driverEarning: number;
} {
  const fee = round2((amount * KIPITA_FEE_PERCENT) / 100);
  return { fee, driverEarning: round2(amount - fee) };
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
