import { createClient } from "@/lib/supabase/client";
import type { PendingRefund, RefundDecision } from "@kipita/shared";

/** All refund requests awaiting an admin decision (RLS: admins only). */
export async function fetchPendingRefunds(): Promise<PendingRefund[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("refund_requests")
    .select(
      `
      id, amount, reason, status, created_at,
      passenger:users!passenger_id(id, full_name, avatar_url),
      driver:users!driver_id(id, full_name),
      booking:bookings(id, booking_reference, trip:trips(from_location, to_location))
    `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as PendingRefund[];
}

/**
 * Approve (refund to passenger wallet) or reject (release to driver) a refund.
 * Runs the same admin-gated `resolve-refund` edge function the mobile app uses.
 */
export async function resolveRefund(
  refundId: string,
  decision: RefundDecision,
  note?: string,
): Promise<{ resolved: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("resolve-refund", {
    body: { refund_id: refundId, decision, note },
  });
  if (error) throw error;
  return data as { resolved: boolean };
}
