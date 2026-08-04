import { supabase } from '@/lib/supabase';

/**
 * Open an admin-verified refund for a cancelled paid ride. No money moves yet —
 * the fare stays in escrow until an admin reviews it in the Kipita web admin.
 * Safe to call for any cancelled booking: rides with nothing held return
 * `requested: false`.
 *
 * NOTE: refund *approval/rejection* lives in the web admin panel (@kipita/web),
 * not in the mobile app.
 */
export async function requestRefund(
  bookingId: string,
  reason?: string,
): Promise<{ requested: boolean; status?: string; refund_id?: string; reason?: string }> {
  const { data, error } = await supabase.functions.invoke('request-refund', {
    body: { booking_id: bookingId, reason },
  });
  if (error) throw error;
  return data as { requested: boolean; status?: string; refund_id?: string; reason?: string };
}
