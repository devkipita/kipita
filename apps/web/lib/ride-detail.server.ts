import { createClient } from "@/lib/supabase/server";
import type {
  RequestDetail,
  RideDetail,
  RidePerson,
  RidePreferences,
  RideVehicle,
  TripDetail,
} from "./ride-detail";

/**
 * Resolve the id a ride notification carries.
 *
 * Both `ride_match` and `request_match` land on `/ride/[id]`, so an id is tried
 * against `trips` first and falls back to `ride_requests` (the `?kind=request`
 * hint just reverses the order). Both tables are world-readable under RLS, so a
 * shared link works for signed-out visitors too.
 */

// No `phone`: migration 004 revoked it, and asking for an ungranted column
// makes Postgres deny the whole `users` table (42501), not just that field.
// The call row degrades to hidden — exposing it needs a server-side route that
// checks the caller actually has a booking, not a column grant.
const PERSON_COLUMNS =
  "id, full_name, avatar_url, is_verified, rating, total_trips";

const TRIP_SELECT = `
  id, from_location, to_location, departure_date, departure_time,
  seats_total, seats_available, price_per_seat, preferences, status,
  description, pickup_point, dropoff_point,
  driver:users!driver_id ( ${PERSON_COLUMNS} ),
  vehicle:vehicles!vehicle_id ( make, model, year, color, plate_number )
`;

const REQUEST_SELECT = `
  id, from_location, to_location, preferred_date, preferred_time,
  seats_needed, preferences, status,
  passenger:users!passenger_id ( ${PERSON_COLUMNS} )
`;

/** Supabase types an embedded one-to-one join as an array in some shapes. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Postgres UUIDs only — anything else can't be a row, so skip the round trip. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchRideDetail(
  id: string,
  hint?: "trip" | "request",
): Promise<RideDetail | null> {
  if (!UUID.test(id)) return null;

  const order: ("trip" | "request")[] =
    hint === "request" ? ["request", "trip"] : ["trip", "request"];

  for (const kind of order) {
    const found = kind === "trip" ? await fetchTrip(id) : await fetchRequest(id);
    if (found) return found;
  }
  return null;
}

async function fetchTrip(id: string): Promise<TripDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    kind: "trip",
    id: row.id as string,
    from_location: row.from_location as string,
    to_location: row.to_location as string,
    departure_date: (row.departure_date as string | null) ?? null,
    departure_time: (row.departure_time as string | null) ?? null,
    seats_total: Number(row.seats_total ?? 0),
    seats_available: Number(row.seats_available ?? 0),
    price_per_seat: Number(row.price_per_seat ?? 0),
    preferences: (row.preferences as RidePreferences) ?? {},
    status: (row.status as string) ?? "posted",
    description: (row.description as string | null) ?? null,
    pickup_point: (row.pickup_point as string | null) ?? null,
    dropoff_point: (row.dropoff_point as string | null) ?? null,
    driver: one(row.driver as RidePerson | RidePerson[] | null),
    vehicle: one(row.vehicle as RideVehicle | RideVehicle[] | null),
  };
}

async function fetchRequest(id: string): Promise<RequestDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ride_requests")
    .select(REQUEST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    kind: "request",
    id: row.id as string,
    from_location: row.from_location as string,
    to_location: row.to_location as string,
    preferred_date: (row.preferred_date as string | null) ?? null,
    preferred_time: (row.preferred_time as string | null) ?? null,
    seats_needed: Number(row.seats_needed ?? 1),
    preferences: (row.preferences as RidePreferences) ?? {},
    status: (row.status as string) ?? "pending",
    passenger: one(row.passenger as RidePerson | RidePerson[] | null),
  };
}
