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
  revalidatePath(`/trips/${bookingId}`);
  return {
    ok: true,
    refunded: before?.status === "confirmed" || before?.status === "in_progress",
  };
}

const TRIP_CANCEL_ERRORS: Record<string, string> = {
  "28000": "Your session expired. Sign in again.",
  "22023": "This ride can no longer be cancelled.",
  "42501": "That isn't your ride.",
  P0002: "That ride no longer exists.",
};

export async function cancelTripAction(
  tripId: string,
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { error } = await supabase.rpc("cancel_trip", {
    p_trip_id: tripId,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error:
        TRIP_CANCEL_ERRORS[error.code ?? ""] ??
        "We couldn't cancel that ride. Please try again.",
    };
  }

  revalidatePath("/trips");
  revalidatePath("/home");
  return { ok: true };
}
