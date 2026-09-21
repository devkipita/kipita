"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, rateLimit, retryMessage } from "@/lib/security/rate-limit";

/**
 * Reserving a seat from the web.
 *
 * Writes a `bookings` row in `pending_payment` — the same state mobile hands to
 * the M-Pesa sheet. The web app has no payment surface yet, so the reservation
 * is where this flow stops: the passenger finishes payment in the app, and the
 * `confirm-payment` edge function moves the booking to `confirmed`.
 */

export type BookingResult =
  | {
      ok: true;
      bookingId: string;
      reference: string | null;
      seats: number;
      total: number;
      /** True when this hold already existed, so we don't double-charge. */
      existing: boolean;
    }
  | { ok: false; error: string };

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

  const { data: trip } = await supabase
    .from("trips")
    .select("id, driver_id, seats_available, price_per_seat, status")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) return { ok: false, error: "This ride is no longer available." };

  if (trip.driver_id === profile.id) {
    return { ok: false, error: "This is your own ride." };
  }
  if (!["posted", "active"].includes(trip.status)) {
    return { ok: false, error: "This ride is no longer taking bookings." };
  }
  if (trip.seats_available < requested) {
    return {
      ok: false,
      error:
        trip.seats_available > 0
          ? `Only ${trip.seats_available} seat${trip.seats_available === 1 ? "" : "s"} left.`
          : "This ride is fully booked.",
    };
  }

  // `bookings` is UNIQUE(trip_id, passenger_id) — surface the existing hold
  // rather than failing on the constraint.
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, booking_reference, seats_booked, total_price, status")
    .eq("trip_id", tripId)
    .eq("passenger_id", profile.id)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      bookingId: existing.id as string,
      reference: existing.booking_reference ?? null,
      seats: existing.seats_booked,
      total: Number(existing.total_price),
      existing: true,
    };
  }

  const total = Number(trip.price_per_seat) * requested;
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      trip_id: tripId,
      passenger_id: profile.id,
      driver_id: trip.driver_id,
      seats_booked: requested,
      total_price: total,
      status: "pending_payment",
    })
    .select("id, booking_reference, seats_booked, total_price")
    .maybeSingle();

  if (error || !booking) {
    return { ok: false, error: "We couldn't hold that seat. Please try again." };
  }

  revalidatePath(`/ride/${tripId}`);
  return {
    ok: true,
    bookingId: booking.id as string,
    reference: booking.booking_reference ?? null,
    seats: booking.seats_booked,
    total: Number(booking.total_price),
    existing: false,
  };
}

/** The signed-in caller's `users.id`, needed by the payment edge function. */
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
