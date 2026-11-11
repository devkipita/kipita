import { createClient } from "@/lib/supabase/server";
import {
  BOOKING_SELECT,
  CURRENT_STATES,
  PREVIOUS_STATES,
  type Booking,
  type PublishedTrip,
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
    expires_at: (row.expires_at as string | null) ?? null,
    cancel_reason: (row.cancel_reason as string | null) ?? null,
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
    return byDeparture(data.map(toBooking));
  } catch {
    return [];
  }
}

function departureAt(b: Booking): number {
  const date = b.trip?.departure_date;
  if (!date) return Number.MAX_SAFE_INTEGER;
  const time = b.trip?.departure_time ?? "00:00";
  const at = new Date(`${date}T${time}`).getTime();
  return Number.isNaN(at) ? Number.MAX_SAFE_INTEGER : at;
}

function byDeparture(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (b.status === "in_progress" && a.status !== "in_progress") return 1;
    return departureAt(a) - departureAt(b);
  });
}

export function fetchCurrentBookings(userId: string): Promise<Booking[]> {
  return fetchBookingsIn(userId, CURRENT_STATES, 50);
}

export async function fetchSeatRequests(userId: string): Promise<Booking[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("driver_id", userId)
      .eq("status", "requested")
      .order("created_at", { ascending: true })
      .limit(50);

    if (error || !data) return [];
    return data.map(toBooking);
  } catch {
    return [];
  }
}

type SeatTally = {
  pending_requests: number;
  awaiting_payment: number;
  paid_seats: number;
};

async function tallySeats(
  tripIds: string[],
): Promise<Map<string, SeatTally>> {
  const tally = new Map<string, SeatTally>();
  if (tripIds.length === 0) return tally;

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("trip_id, seats_booked, status")
    .in("trip_id", tripIds)
    .in("status", ["requested", "pending_payment", "confirmed", "in_progress"]);

  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const tripId = row.trip_id as string;
    const seats = Number(row.seats_booked ?? 0);
    const current = tally.get(tripId) ?? {
      pending_requests: 0,
      awaiting_payment: 0,
      paid_seats: 0,
    };

    if (row.status === "requested") current.pending_requests += 1;
    else if (row.status === "pending_payment") current.awaiting_payment += seats;
    else current.paid_seats += seats;

    tally.set(tripId, current);
  }

  return tally;
}

export async function fetchPublishedTrips(
  userId: string,
): Promise<PublishedTrip[]> {
  try {
    const supabase = await createClient();
    const columns = `id, from_location, to_location, departure_date, departure_time,
         price_per_seat, seats_available, seats_total, status`;
    const today = new Date().toISOString().slice(0, 10);

    const [open, running] = await Promise.all([
      supabase
        .from("trips")
        .select(columns)
        .eq("driver_id", userId)
        .in("status", ["posted", "active"])
        .gte("departure_date", today)
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true })
        .limit(50),
      supabase
        .from("trips")
        .select(columns)
        .eq("driver_id", userId)
        .eq("status", "in_progress")
        .order("departure_date", { ascending: true })
        .limit(10),
    ]);

    const rows = [...(running.data ?? []), ...(open.data ?? [])];
    if (rows.length === 0) return [];

    const tally = await tallySeats(rows.map((raw) => (raw as { id: string }).id));

    return rows.map((raw) => {
      const row = raw as Record<string, unknown>;
      const total = Number(row.seats_total ?? 0);
      const left = Number(row.seats_available ?? 0);
      const counts = tally.get(row.id as string);
      return {
        id: row.id as string,
        from_location: (row.from_location as string) ?? "",
        to_location: (row.to_location as string) ?? "",
        departure_date: (row.departure_date as string | null) ?? null,
        departure_time: (row.departure_time as string | null) ?? null,
        price_per_seat: Number(row.price_per_seat ?? 0),
        seats_available: left,
        seats_total: total,
        status: (row.status as string) ?? "",
        seats_taken: Math.max(0, total - left),
        pending_requests: counts?.pending_requests ?? 0,
        awaiting_payment: counts?.awaiting_payment ?? 0,
        paid_seats: counts?.paid_seats ?? 0,
      } satisfies PublishedTrip;
    });
  } catch {
    return [];
  }
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
    return toBooking(data);
  } catch {
    return null;
  }
}
