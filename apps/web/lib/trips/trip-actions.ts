"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Starting and ending a ride. Payment to the driver is NOT triggered from here any more: the database
 * releases each boarded passenger's fare by itself, six hours after the ride ends (migration 070,
 * `release_due_escrow`). The browser never moves money.
 */
export type TripRunResult = { ok: true; moved: number } | { ok: false; error: string };

const RUN_ERRORS: Record<string, string> = {
  "28000": "Your session expired. Sign in again.",
  "22023": "This ride is not at that stage.",
  "42501": "That isn't your ride.",
  "55006": "You already have a ride under way.",
  P0002: "That ride no longer exists.",
};

function message(code: string | undefined, fallback: string): string {
  return RUN_ERRORS[code ?? ""] ?? fallback;
}

export async function startTripAction(tripId: string): Promise<TripRunResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { data, error } = await supabase.rpc("start_trip", {
    p_trip_id: tripId,
  });

  if (error) {
    // KP005: passengers are still waiting to board. The database words it with the count, so use its text.
    if (error.code === "KP005" && error.message) return { ok: false, error: error.message };
    return {
      ok: false,
      error: message(error.code, "We couldn't start that ride. Please try again."),
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/ride/${tripId}`);
  return { ok: true, moved: Number(data ?? 0) };
}

export async function completeTripAction(
  tripId: string,
): Promise<TripRunResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const { data, error } = await supabase.rpc("complete_trip", {
    p_trip_id: tripId,
  });

  if (error) {
    return {
      ok: false,
      error: message(error.code, "We couldn't end that ride. Please try again."),
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/ride/${tripId}`);
  return { ok: true, moved: Number(data ?? 0) };
}
