"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Reserving a seat from the web.
 *
 * Writes a `bookings` row in `pending_payment` — the same state mobile hands to
 * the M-Pesa sheet. The web app has no payment surface yet, so the reservation
 * is where this flow stops: the passenger finishes payment in the app, and the
 * `confirm-payment` edge function moves the booking to `confirmed`.
 */

export type BookingResult =
  | { ok: true; reference: string | null; seats: number; total: number }
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
      reference: existing.booking_reference ?? null,
      seats: existing.seats_booked,
      total: Number(existing.total_price),
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
    .select("booking_reference, seats_booked, total_price")
    .maybeSingle();

  if (error || !booking) {
    return { ok: false, error: "We couldn't hold that seat. Please try again." };
  }

  revalidatePath(`/ride/${tripId}`);
  return {
    ok: true,
    reference: booking.booking_reference ?? null,
    seats: booking.seats_booked,
    total: Number(booking.total_price),
  };
}
