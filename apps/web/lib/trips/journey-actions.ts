"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { etaBetween } from "@/lib/maps/routes.server";
import { placeKey } from "@/lib/maps/types";

type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

export async function rateBookingAction(
  bookingId: string,
  score: number,
  comment?: string,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_booking", {
    p_booking_id: bookingId,
    p_score: score,
    p_comment: comment ?? null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "You already rated this trip."
          : error.code === "22023"
            ? error.message
            : "We couldn't save that rating. Try again.",
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true, value: undefined };
}

export async function payWithWalletAction(bookingId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_booking_with_wallet", { p_booking_id: bookingId });

  if (error) {
    return {
      ok: false,
      error: /insufficient/i.test(error.message)
        ? "Not enough in your wallet."
        : error.code === "22023"
          ? error.message
          : "Payment failed. Nothing was charged.",
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  revalidatePath("/wallet");
  return { ok: true, value: undefined };
}

export async function contactPhoneAction(bookingId: string): Promise<Result<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("booking_contact_phone", { p_booking_id: bookingId });
  if (error) {
    return {
      ok: false,
      error: error.code === "22023" ? error.message : "We couldn't get that number. Try again.",
    };
  }
  if (!data) return { ok: false, error: "No verified number yet." };
  return { ok: true, value: data as string };
}

export async function markArrivedAction(bookingId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_arrived", { p_booking_id: bookingId });
  if (error) {
    return {
      ok: false,
      error: error.code === "22023" ? "Your ride isn't under way." : "We couldn't save that. Try again.",
    };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${bookingId}`);
  return { ok: true, value: undefined };
}

/**
 * Minutes to the drop-off for a passenger whose ride is under way. The car's position and the
 * destination come from the database, never from the caller, so this paid lookup can only be
 * triggered for a ride the caller is on, and only while their map is live.
 */
export async function etaAction(bookingId: string): Promise<number | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("trip_id, status, passenger_id, arrived_at, trip:trips!trip_id ( to_location, to_lat, to_lng )")
    .eq("id", bookingId)
    .maybeSingle();
  const trip = Array.isArray(booking?.trip) ? booking?.trip[0] : booking?.trip;
  if (!booking || !trip || booking.passenger_id !== profile.id) return null;
  if (booking.status !== "in_progress" || booking.arrived_at) return null;

  const { data: car } = await supabase
    .from("trip_locations")
    .select("lat, lng")
    .eq("trip_id", booking.trip_id)
    .maybeSingle();
  if (!car) return null;

  return etaBetween(
    `${Number(car.lat).toFixed(2)},${Number(car.lng).toFixed(2)}`,
    placeKey(trip.to_location as string, trip.to_lat as number | null, trip.to_lng as number | null),
  );
}

