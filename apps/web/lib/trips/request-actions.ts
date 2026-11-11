"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchBooking, fetchSeatRequests } from "./server";
import type { Booking } from "./types";

export type RequestDecision = "accept" | "decline";

export type DecisionResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

const DECISION_ERRORS: Record<string, string> = {
  "28000": "Your session expired. Sign in again.",
  "22023": "That request is no longer open.",
  "42501": "Only the driver can answer that request.",
  "53400": "You no longer have enough seats for that request.",
  P0002: "That request no longer exists.",
};

export async function answerSeatRequestAction(
  bookingId: string,
  decision: RequestDecision,
  reason?: string,
): Promise<DecisionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { data, error } =
    decision === "accept"
      ? await supabase
          .rpc("accept_booking", { p_booking_id: bookingId })
          .maybeSingle<{ status: string }>()
      : await supabase
          .rpc("decline_booking", {
            p_booking_id: bookingId,
            p_reason: reason?.trim() || null,
          })
          .maybeSingle<{ status: string }>();

  if (error) {
    return {
      ok: false,
      error:
        DECISION_ERRORS[error.code ?? ""] ??
        "We couldn't record that. Please try again.",
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true, status: data?.status ?? "" };
}

export async function seatRequestAction(
  bookingId: string,
): Promise<Booking | null> {
  const booking = await fetchBooking(bookingId);
  if (!booking || booking.status !== "requested") return null;
  return booking;
}

export async function seatRequestsAction(): Promise<Booking[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!profile) return [];

  return fetchSeatRequests(profile.id);
}
