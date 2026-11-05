"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CancelResult =
  | { ok: true; refunded: boolean }
  | { ok: false; error: string };

const CANCEL_ERRORS: Record<string, string> = {
  "28000": "Your session expired. Sign in again.",
  "22023": "This booking is already closed.",
  "42501": "That isn't your booking.",
  P0002: "That booking no longer exists.",
};

export async function cancelBookingAction(
  bookingId: string,
  reason?: string,
): Promise<CancelResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { data: before } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .maybeSingle<{ status: string }>();

  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error:
        CANCEL_ERRORS[error.code ?? ""] ??
        "We couldn't cancel that. Please try again.",
    };
  }

  revalidatePath("/trips");
  return {
    ok: true,
    refunded: before?.status === "confirmed" || before?.status === "in_progress",
  };
}
