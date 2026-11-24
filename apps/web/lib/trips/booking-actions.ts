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
  KP001: "This ride is already under way. Contact support if something went wrong.",
};

export async function cancelBookingAction(
  bookingId: string,
  reason?: string,
): Promise<CancelResult> {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: before },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("bookings").select("status").eq("id", bookingId).maybeSingle<{ status: string }>(),
  ]);
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

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

  const [
    {
      data: { user },
    },
    { error },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("cancel_trip", { p_trip_id: tripId, p_reason: reason?.trim() || null }),
  ]);
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

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

export type CancellationQuoteView = {
  tier: "nothing_held" | "free" | "late" | "no_show" | "driver";
  passengerGets: number;
  driverGets: number;
  kipitaKeeps: number;
  freeUntil: string | null;
};

const TIERS = ["nothing_held", "free", "late", "no_show", "driver"] as const;

/** What cancelling this booking would do right now, from the database's own rule. */
export async function getCancellationQuoteAction(
  bookingId: string,
): Promise<{ ok: true; quote: CancellationQuoteView } | { ok: false }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancellation_quote", { p_booking_id: bookingId });
  if (error || !data || typeof data !== "object") return { ok: false };

  const q = data as Record<string, unknown>;
  const tier = TIERS.find((t) => t === q.tier);
  if (!tier) return { ok: false };

  return {
    ok: true,
    quote: {
      tier,
      passengerGets: Number(q.passenger_gets ?? 0),
      driverGets: Number(q.driver_gets ?? 0),
      kipitaKeeps: Number(q.kipita_keeps ?? 0),
      freeUntil: typeof q.free_until === "string" ? q.free_until : null,
    },
  };
}

const NO_SHOW_ERRORS: Record<string, string> = {
  "28000": "Your session expired. Sign in again.",
  "22023": "This booking can't be reported as a no-show.",
  "42501": "That isn't your booking.",
  P0002: "That booking no longer exists.",
  KP002: "It's too early to report a no-show. Wait a few more minutes after departure.",
  KP003: "The time to dispute this has passed.",
};

/** The driver says the passenger did not turn up. The fare is held, not paid out. */
export async function markNoShowAction(
  bookingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { error },
  ] = await Promise.all([supabase.auth.getUser(), supabase.rpc("mark_no_show", { p_booking_id: bookingId })]);
  if (!user) return { ok: false, error: NO_SHOW_ERRORS["28000"] };
  if (error) {
    return { ok: false, error: NO_SHOW_ERRORS[error.code ?? ""] ?? "We couldn't report that. Please try again." };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true };
}

/** The passenger says a no-show report is wrong. Support decides. */
export async function disputeNoShowAction(
  bookingId: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { error },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("dispute_no_show", { p_booking_id: bookingId, p_note: note.trim().slice(0, 500) }),
  ]);
  if (!user) return { ok: false, error: NO_SHOW_ERRORS["28000"] };
  if (error) {
    return { ok: false, error: NO_SHOW_ERRORS[error.code ?? ""] ?? "We couldn't send that. Please try again." };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true };
}
