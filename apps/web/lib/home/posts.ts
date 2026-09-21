"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchDriverKyc } from "@/lib/driver/kyc";
import { postRequestSchema, postTripSchema } from "@/lib/validators/home";
import type { PostRequestInput, PostTripInput } from "@/lib/validators/home";
import { LIMITS, rateLimit, retryMessage } from "@/lib/security/rate-limit";

/**
 * Posting a trip or a ride request — the write half of the core Kipita loop.
 *
 * These are server actions rather than browser-client inserts (which RLS would
 * allow) because each insert fires the route-targeted broadcast in migration
 * 020, and that deserves one chokepoint where validation, the driver check and
 * the friendly rate-limit message live. The client never sends an owner id;
 * it is derived from the session here, as in `lib/bookings.ts`.
 */

export type PostResult =
  | { ok: true; kind: "trip" | "request"; id: string }
  | { ok: false; error: string };

const PROFILE_NOT_READY =
  "Your profile isn't ready yet. Sign out and back in, then try again.";

/** Raised by the throttle triggers in migration 020. */
const RATE_LIMIT_CODE = "54000";

type Session = { userId: string } | { error: string };

async function resolveUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Session> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };

  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!data) return { error: PROFILE_NOT_READY };

  return { userId: data.id as string };
}

function writeError(error: { code?: string } | null, fallback: string): string {
  if (error?.code === RATE_LIMIT_CODE) {
    return "You've posted a few times in the last hour. Try again a little later.";
  }
  return fallback;
}

export async function createTripAction(input: PostTripInput): Promise<PostResult> {
  const parsed = postTripSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
  }

  const supabase = await createClient();
  const session = await resolveUser(supabase);
  if ("error" in session) return { ok: false, error: session.error };

  const gate = rateLimit(
    `post:${session.userId}`,
    LIMITS.postTrip.limit,
    LIMITS.postTrip.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  // The mode cookie is a UI preference, so re-check the real gate here.
  const kyc = await fetchDriverKyc(supabase, session.userId);
  if (!kyc.hasApplied) {
    return {
      ok: false,
      error: "Finish driver verification before offering a ride.",
    };
  }

  const trip = parsed.data;
  const { data, error } = await supabase
    .from("trips")
    .insert({
      driver_id: session.userId,
      from_location: trip.from_location,
      to_location: trip.to_location,
      departure_date: trip.departure_date,
      departure_time: trip.departure_time,
      seats_total: trip.seats_total,
      seats_available: trip.seats_total,
      price_per_seat: trip.price_per_seat,
      preferences: trip.preferences,
      status: "posted",
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error: writeError(error, "We couldn't post that ride. Please try again."),
    };
  }

  revalidatePath("/home");
  return { ok: true, kind: "trip", id: data.id as string };
}

export async function createRideRequestAction(
  input: PostRequestInput,
): Promise<PostResult> {
  const parsed = postRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
  }

  const supabase = await createClient();
  const session = await resolveUser(supabase);
  if ("error" in session) return { ok: false, error: session.error };

  const gate = rateLimit(
    `post:${session.userId}`,
    LIMITS.postTrip.limit,
    LIMITS.postTrip.windowMs,
  );
  if (!gate.ok) return { ok: false, error: retryMessage(gate.retryAfterMs) };

  const request = parsed.data;
  const { data, error } = await supabase
    .from("ride_requests")
    .insert({
      passenger_id: session.userId,
      from_location: request.from_location,
      to_location: request.to_location,
      preferred_date: request.preferred_date,
      preferred_time: request.preferred_time,
      seats_needed: request.seats_needed,
      preferences: request.preferences,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error: writeError(
        error,
        "We couldn't post that request. Please try again.",
      ),
    };
  }

  revalidatePath("/home");
  return { ok: true, kind: "request", id: data.id as string };
}

/**
 * Remember that this user cares about a route, so migration 020's triggers can
 * notify them when someone posts it. Best effort — a failure must never break a
 * search.
 */
export async function recordRouteInterestAction(
  from: string,
  to: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("record_route_interest", { p_from: from, p_to: to });
  } catch {
    // Interest is an optimisation, not a feature the user asked for.
  }
}
