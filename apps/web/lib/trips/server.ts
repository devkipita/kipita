import { createClient } from "@/lib/supabase/server";
import { kenyaToday } from "@kipita/shared";
import {
  BOOKING_SELECT,
  CURRENT_STATES,
  PREVIOUS_STATES,
  type Booking,
  type PublishedTrip,
  type SeatRider,
  type TripCar,
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
    service_fee: row.service_fee == null ? null : Number(row.service_fee),
    status: row.status as Booking["status"],
    accepted_at: (row.accepted_at as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
    started_at: (row.started_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    cancelled_at: (row.cancelled_at as string | null) ?? null,
    refunded_amount: row.refunded_amount == null ? null : Number(row.refunded_amount),
    refund_to: (row.refund_to as Booking["refund_to"]) ?? null,
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
          driver: null,
          vehicle: one(trip.vehicle as TripCar | TripCar[] | null),
          from_lat: trip.from_lat == null ? null : Number(trip.from_lat),
          from_lng: trip.from_lng == null ? null : Number(trip.from_lng),
          to_lat: trip.to_lat == null ? null : Number(trip.to_lat),
          to_lng: trip.to_lng == null ? null : Number(trip.to_lng),
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
    const bookings = data.map(toBooking);
    const done = bookings.filter((b) => b.status === "completed").map((b) => b.id);
    if (done.length > 0) {
      const { data: rated } = await supabase
        .from("ratings")
        .select("booking_id, score")
        .eq("from_user_id", userId)
        .in("booking_id", done);
      const scores = new Map((rated ?? []).map((r) => [r.booking_id as string, Number(r.score)]));
      for (const b of bookings) if (b.status === "completed") b.my_rating = scores.get(b.id) ?? null;
    }
    return byDeparture(bookings);
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

export async function fetchMyBookings(userId: string): Promise<{ current: Booking[]; previous: Booking[] }> {
  const all = await fetchBookingsIn(userId, [...CURRENT_STATES, ...PREVIOUS_STATES], 120);
  const now = new Set(CURRENT_STATES);
  return {
    current: all.filter((b) => now.has(b.status)),
    previous: all.filter((b) => !now.has(b.status)).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
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
  fares_paid: number;
  riders: SeatRider[];
};

async function tallySeats(
  tripIds: string[],
): Promise<Map<string, SeatTally>> {
  const tally = new Map<string, SeatTally>();
  if (tripIds.length === 0) return tally;

  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, trip_id, seats_booked, total_price, status, created_at, passenger:users!passenger_id ( full_name, avatar_url )")
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
      fares_paid: 0,
      riders: [],
    };

    const person = (Array.isArray(row.passenger) ? row.passenger[0] : row.passenger) as
      | { full_name: string | null; avatar_url: string | null }
      | null;
    const state = row.status === "requested" ? "requested" : row.status === "pending_payment" ? "booked" : "paid";
    current.riders.push({
      booking_id: row.id as string,
      name: person?.full_name?.trim() || "Passenger",
      avatar_url: person?.avatar_url ?? null,
      seats,
      state,
      created_at: (row.created_at as string) ?? "",
    });

    if (row.status === "requested") current.pending_requests += 1;
    else if (row.status === "pending_payment") current.awaiting_payment += seats;
    else {
      current.paid_seats += seats;
      current.fares_paid += Number(row.total_price ?? 0);
    }

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
         price_per_seat, seats_available, seats_total, status, from_lat, from_lng, to_lat, to_lng,
         vehicle:vehicles!vehicle_id ( make, model, color, plate_number )`;
    const today = kenyaToday();

    const [open, running] = await Promise.all([
      supabase
        .from("trips")
        .select(columns)
        .eq("driver_id", userId)
        .in("status", ["posted", "active", "awaiting_approval"])
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
        vehicle: (Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle) as PublishedTrip["vehicle"] ?? null,
        riders: counts?.riders ?? [],
        fares_paid: counts?.fares_paid ?? 0,
        from_lat: row.from_lat == null ? null : Number(row.from_lat),
        from_lng: row.from_lng == null ? null : Number(row.from_lng),
        to_lat: row.to_lat == null ? null : Number(row.to_lat),
        to_lng: row.to_lng == null ? null : Number(row.to_lng),
      } satisfies PublishedTrip;
    });
  } catch {
    return [];
  }
}

export function fetchPreviousBookings(userId: string): Promise<Booking[]> {
  return fetchBookingsIn(userId, PREVIOUS_STATES, 50);
}

export async function fetchBooking(id: string, viewerId?: string): Promise<Booking | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const [bookingRes, ratingRes] = await Promise.all([
    supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle(),
    viewerId
      ? supabase.from("ratings").select("score").eq("booking_id", id).eq("from_user_id", viewerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (bookingRes.error) throw new Error(`booking ${id}: ${bookingRes.error.code} ${bookingRes.error.message}`);
  if (!bookingRes.data) return null;
  const booking = toBooking(bookingRes.data);
  if (booking.status === "completed") {
    booking.my_rating = ratingRes.data ? Number((ratingRes.data as { score: number }).score) : null;
  }
  return booking;
}
