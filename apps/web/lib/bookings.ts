"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, rateLimit, retryMessage } from "@/lib/security/rate-limit";

export type BookingResult =
  | {
      ok: true;
      bookingId: string;
      reference: string | null;
      seats: number;
      total: number;
      existing: boolean;
      expiresAt: string | null;
    }
  | { ok: false; error: string };

const HOLD_ERRORS: Record<string, string> = {
  "28000": "Sign in to reserve a seat.",
  "22023": "This ride is no longer taking bookings.",
  "42501": "This is your own ride.",
  "53400": "Those seats have just gone. Try fewer, or another ride.",
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
    return { ok: false, error: "Your profile isn't ready yet. Try again in a moment." };
  }

  const gate = rateLimit(
    `reserve:${profile.id}`,
    LIMITS.reserveSeat.limit,
    LIMITS.reserveSeat.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  const { data: held, error: holdError } = await supabase
    .rpc("hold_seat", { p_trip_id: tripId, p_seats: requested })
    .maybeSingle<{
      id: string;
      booking_reference: string | null;
      seats_booked: number;
      total_price: number;
      status: string;
      expires_at: string | null;
      was_existing: boolean;
    }>();

  if (holdError) {
    return {
      ok: false,
      error:
        HOLD_ERRORS[holdError.code ?? ""] ??
        "We couldn't hold that seat. Please try again.",
    };
  }

  if (!held) {
    return { ok: false, error: "We couldn't hold that seat. Please try again." };
  }

  revalidatePath(`/ride/${tripId}`);
  return {
    ok: true,
    bookingId: held.id,
    reference: held.booking_reference,
    seats: held.seats_booked,
    total: Number(held.total_price),
    existing: held.was_existing,
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
