import { createClient } from "@/lib/supabase/server";
import { cityPhotos } from "@/lib/places/photo";
import {
  BOOKING_SELECT,
  CURRENT_STATES,
  PREVIOUS_STATES,
  type Booking,
  type TripLeg,
  type TripPerson,
} from "./types";

/**
 * Read side for trips. Ported from `apps/mobile/src/lib/api/bookings.ts`
 * WITHOUT its mock fallback — that fallback substitutes seed data on *error*,
 * which turns an RLS failure into a healthy-looking list. Migration 012 exists
 * because exactly that went unnoticed.
 */

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toBooking(raw: unknown): Booking {
  const row = raw as Record<string, unknown>;
  const trip = one(row.trip as Record<string, unknown> | Record<string, unknown>[]);

  return {
    id: row.id as string,
    trip_id: row.trip_id as string,
    passenger_id: row.passenger_id as string,
    driver_id: row.driver_id as string,
    seats_booked: Number(row.seats_booked ?? 1),
    total_price: Number(row.total_price ?? 0),
    status: row.status as Booking["status"],
    booking_reference: (row.booking_reference as string | null) ?? null,
    created_at: row.created_at as string,
    trip: trip
      ? ({
          id: trip.id as string,
          from_location: (trip.from_location as string) ?? "",
          to_location: (trip.to_location as string) ?? "",
          departure_date: (trip.departure_date as string | null) ?? null,
          departure_time: (trip.departure_time as string | null) ?? null,
          price_per_seat: Number(trip.price_per_seat ?? 0),
          status: (trip.status as string) ?? "",
          driver: one(trip.driver as TripPerson | TripPerson[] | null),
        } satisfies TripLeg)
      : null,
    passenger: one(row.passenger as TripPerson | TripPerson[] | null),
    driver: one(row.driver as TripPerson | TripPerson[] | null),
    photo_url: null,
  };
}

/** Attach a destination photo to each booking, one lookup per distinct town. */
async function withPhotos(bookings: Booking[]): Promise<Booking[]> {
  if (bookings.length === 0) return bookings;
  const photos = await cityPhotos(bookings.map((b) => b.trip?.to_location));
  return bookings.map((b) => ({
    ...b,
    photo_url: photos.get((b.trip?.to_location ?? "").trim().toLowerCase()) ?? null,
  }));
}

async function fetchBookingsIn(
  userId: string,
  states: string[],
  limit: number,
): Promise<Booking[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
      .in("status", states)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return await withPhotos(data.map(toBooking));
  } catch {
    return [];
  }
}

export function fetchCurrentBookings(userId: string): Promise<Booking[]> {
  return fetchBookingsIn(userId, CURRENT_STATES, 50);
}

export function fetchPreviousBookings(userId: string): Promise<Booking[]> {
  return fetchBookingsIn(userId, PREVIOUS_STATES, 50);
}

export async function fetchBooking(id: string): Promise<Booking | null> {
  if (!UUID.test(id)) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    const [withPhoto] = await withPhotos([toBooking(data)]);
    return withPhoto ?? null;
  } catch {
    return null;
  }
}
