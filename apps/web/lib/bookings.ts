"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, rateLimit, retryMessage } from "@/lib/security/rate-limit";

export type BookingStatus =
  | "requested"
  | "pending_payment"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export type BookingResult =
  | {
      ok: true;
      bookingId: string;
      reference: string | null;
      seats: number;
      total: number;
      status: BookingStatus;
      expiresAt: string | null;
      awaitingDriver: boolean;
    }
  | { ok: false; error: string };

const HOLD_ERRORS: Record<string, string> = {
  "28000": "Sign in to request a seat.",
  "22023": "This ride is no longer taking bookings.",
  "42501": "This is your own ride.",
  "53400": "Seats just taken. Try fewer, or another ride.",
  P0002: "This ride is no longer available.",
};

export async function reserveSeatAction(
  tripId: string,
  seats: number,
): Promise<BookingResult> {
  const requested = Math.max(1, Math.min(8, Math.floor(seats) || 1));
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to reserve a seat." };

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!profile) {
    return { ok: false, error: "Profile not ready. Try again." };
  }

  const gate = rateLimit(
    `reserve:${profile.id}`,
    LIMITS.reserveSeat.limit,
    LIMITS.reserveSeat.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  const { data: held, error: holdError } = await supabase
    .rpc("request_seat", { p_trip_id: tripId, p_seats: requested })
    .maybeSingle<{
      id: string;
      booking_reference: string | null;
      seats_booked: number;
      total_price: number;
      status: BookingStatus;
      expires_at: string | null;
    }>();

  if (holdError) {
    return {
      ok: false,
      error:
        HOLD_ERRORS[holdError.code ?? ""] ??
        "Couldn't send that request. Try again.",
    };
  }

  if (!held) {
    return { ok: false, error: "Couldn't send that request. Try again." };
  }

  revalidatePath(`/ride/${tripId}`);
  return {
    ok: true,
    bookingId: held.id,
    reference: held.booking_reference,
    seats: held.seats_booked,
    total: Number(held.total_price),
    status: held.status,
    awaitingDriver: held.status === "requested",
    expiresAt: held.expires_at,
  };
}

export async function currentUserIdAction(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  return (data?.id as string) ?? null;
}
