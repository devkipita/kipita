"use server";

import { revalidatePath } from "next/cache";
import { CAR_SEATS_MISSING, isCarSeats } from "@kipita/shared";
import { resolveAppUser } from "@/lib/auth/app-user";
import { createClient } from "@/lib/supabase/server";
import { isPhoneConfirmed } from "@/lib/auth/phone";
import { fetchDriverKyc } from "@/lib/driver/kyc";
import { postRequestSchema, postTripSchema } from "@/lib/validators/home";
import type { PostRequestInput, PostTripInput } from "@/lib/validators/home";
import { LIMITS, rateLimit, retryMessage } from "@/lib/security/rate-limit";
import { checkTripPrice } from "@/lib/fare/quote.server";

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
  | { ok: true; kind: "trip" | "request"; id: string; awaiting?: boolean }
  | { ok: false; error: string; fix?: "kyc" | "phone" };

const PROFILE_NOT_READY =
  "Your profile isn't ready yet. Sign out and back in, then try again.";

/** Raised by the throttle triggers in migration 020. */
const RATE_LIMIT_CODE = "54000";

type Session = { userId: string } | { error: string };

async function resolveUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Session> {
  const { user, id } = await resolveAppUser(supabase);
  if (!user) return { error: "Your session expired. Sign in again." };
  if (!id) return { error: PROFILE_NOT_READY };
  return { userId: id };
}

function writeError(error: { code?: string } | null, fallback: string): string {
  if (error?.code === RATE_LIMIT_CODE) {
    return "You've posted a few times in the last hour. Try again a little later.";
  }
  return fallback;
}

async function resolveVehicle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  trip: PostTripInput,
  knownId: string | null | undefined,
): Promise<string | null> {
  const details = {
    make: trip.vehicle_make?.trim() || null,
    model: trip.vehicle_model?.trim() || null,
    color: trip.vehicle_color?.trim() || null,
    plate_number: trip.vehicle_plate?.trim().toUpperCase() || null,
    image_url: trip.vehicle_photo_url || null,
  };

  try {
    if (!details.plate_number) {
      const { data: latest } = await supabase
        .from("vehicles")
        .select("id")
        .eq("driver_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (latest?.id as string | undefined) ?? null;
    }

    const existing =
      knownId !== undefined
        ? knownId
          ? { id: knownId }
          : null
        : (
            await supabase
              .from("vehicles")
              .select("id")
              .eq("driver_id", userId)
              .eq("plate_number", details.plate_number)
              .maybeSingle()
          ).data;

    const patch = Object.fromEntries(
      Object.entries(details).filter(([, v]) => v !== null),
    );

    if (existing) {
      await supabase.from("vehicles").update(patch).eq("id", existing.id);
      return existing.id as string;
    }

    if (!details.make || !details.model) return null;

    const { data } = await supabase
      .from("vehicles")
      .insert({
        driver_id: userId,
        make: details.make,
        model: details.model,
        color: details.color ?? "Unspecified",
        year: new Date().getFullYear(),
        plate_number: details.plate_number,
        seats_available: trip.seats_total,
        image_url: details.image_url,
      })
      .select("id")
      .maybeSingle();

    return (data?.id as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * The seats the driver said the trip's car has, with the driver's seat in them. null when the trip names no
 * car, the car is not saved yet, or the lookup fails (the type's limit still applies then, as it does when
 * no price can be worked out). A saved car whose seats were never answered is refused: the Publish screen
 * asks for them, so this only stops a client that skipped the question.
 */
async function carSeatsFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  plate: string | undefined,
): Promise<{ seats: number | null; vehicleId?: string | null } | { error: string }> {
  if (!plate) return { seats: null };
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, seat_capacity, seats_confirmed_at")
    .eq("driver_id", userId)
    .eq("plate_number", plate.trim().toUpperCase())
    .maybeSingle();
  if (error) return { seats: null };
  if (!data) return { seats: null, vehicleId: null };
  if (!data.seats_confirmed_at || !isCarSeats(data.seat_capacity)) return { error: CAR_SEATS_MISSING };
  return { seats: data.seat_capacity, vehicleId: data.id as string };
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

  const trip = parsed.data;
  const leaves = Date.parse(`${trip.departure_date}T${trip.departure_time}:00+03:00`);
  if (!Number.isFinite(leaves) || leaves <= Date.now()) {
    return { ok: false, error: "That departure time has already passed. Pick a later one." };
  }

  const [kyc, phoneConfirmed, early, car] = await Promise.all([
    fetchDriverKyc(supabase, session.userId),
    isPhoneConfirmed(supabase),
    supabase.rpc("flag_enabled", { p_key: "publish_before_approval" }).then(({ data }) => data === true),
    carSeatsFor(supabase, session.userId, trip.vehicle_plate),
  ]);

  if (!kyc.hasApplied) {
    return {
      ok: false,
      error: "Get verified to publish a ride.",
      fix: "kyc",
    };
  }
  if (kyc.status === "rejected") {
    return {
      ok: false,
      error: "Verification unsuccessful. Submit your details again to publish.",
      fix: "kyc",
    };
  }
  if (!phoneConfirmed) {
    return {
      ok: false,
      error: "Confirm your phone number to publish a ride.",
      fix: "phone",
    };
  }
  const status: "posted" | "awaiting_approval" = kyc.status === "pending" && !early ? "awaiting_approval" : "posted";

  if ("error" in car) return { ok: false, error: car.error };

  const priceCheck = await checkTripPrice(supabase, {
    from: trip.from_location,
    to: trip.to_location,
    seats: trip.seats_total,
    priceKes: trip.price_per_seat,
    vehicleClass: trip.vehicle_class,
    vehicleMake: trip.vehicle_make,
    vehicleModel: trip.vehicle_model,
    othersAboard: trip.others_aboard,
    carSeats: car.seats,
  });
  if (!priceCheck.ok) return { ok: false, error: priceCheck.error };

  const vehicleId = await resolveVehicle(supabase, session.userId, trip, car.vehicleId);

  const { data, error } = await supabase
    .from("trips")
    .insert({
      driver_id: session.userId,
      vehicle_id: vehicleId,
      from_location: trip.from_location,
      to_location: trip.to_location,
      departure_date: trip.departure_date,
      departure_time: trip.departure_time,
      seats_total: trip.seats_total,
      seats_available: trip.seats_total,
      price_per_seat: trip.price_per_seat,
      discount_percent: trip.discount_percent ?? null,
      preferences: trip.preferences,
      status,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error: writeError(
        error,
        error?.code === "42501"
          ? "Your verification hasn't cleared yet, so this ride can't go live."
          : "We couldn't post that ride. Please try again.",
      ),
    };
  }

  revalidatePath("/home");
  revalidatePath("/trips");
  return { ok: true, kind: "trip", id: data.id as string, awaiting: status === "awaiting_approval" };
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
