"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TripRunResult =
  | { ok: true; moved: number; bookingIds: string[] }
  | { ok: false; error: string };

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

async function bookingIdsFor(
  tripId: string,
  statuses: string[],
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("trip_id", tripId)
    .in("status", statuses);

  return (data ?? []).map((row) => row.id as string);
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
    return {
      ok: false,
      error: message(error.code, "We couldn't start that ride. Please try again."),
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/ride/${tripId}`);
  return { ok: true, moved: Number(data ?? 0), bookingIds: [] };
}

export async function completeTripAction(
  tripId: string,
): Promise<TripRunResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };

  const paid = await bookingIdsFor(tripId, ["confirmed", "in_progress"]);

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
  return { ok: true, moved: Number(data ?? 0), bookingIds: paid };
}
