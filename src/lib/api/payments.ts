import { supabase } from '@/lib/supabase';
import type { Payment, PaymentMethod } from '@/types';

/** Initiate payment via Edge Function (secure backend) */
export async function initiatePayment(params: {
  booking_id: string;
  user_id: string;
  amount: number;
  method: PaymentMethod;
  phone?: string;
}): Promise<{ payment_id: string; provider_reference?: string }> {
  const { data, error } = await supabase.functions.invoke('initiate-payment', {
    body: params,
  });
  if (error) throw error;
  return data as { payment_id: string; provider_reference?: string };
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
