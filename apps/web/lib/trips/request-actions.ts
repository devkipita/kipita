"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchBooking, fetchSeatRequests } from "./server";
import type { Booking } from "./types";

export type RequestDecision = "accept" | "decline";

export type DecisionResult =
  | { ok: true; status: string }
  | { ok: false; error: string; code?: string };

const DECISION_ERRORS: Record<string, string> = {
  "28000": "Session expired. Sign in again.",
  "22023": "That request is no longer open.",
  "42501": "Only the driver can answer that request.",
  "53400": "Not enough seats left.",
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
  if (!user) return { ok: false, error: "Session expired. Sign in again." };

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
      code: error.code ?? undefined,
      error:
        DECISION_ERRORS[error.code ?? ""] ??
        "Couldn't record that. Try again.",
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true, status: data?.status ?? "" };
}

export async function seatRequestAction(
  bookingId: string,
): Promise<Booking | null> {
  const booking = await fetchBooking(bookingId).catch(() => null);
  if (!booking || booking.status !== "requested") return null;
  return booking;
}

export async function openSeatRequestIdsAction(
  bookingIds: string[],
): Promise<string[] | null> {
  const ids = Array.from(new Set(bookingIds.filter(Boolean))).slice(0, 60);
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .in("id", ids)
    .eq("status", "requested");
  if (error) return null;
  return (data ?? []).map((row: { id: string }) => row.id);
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
