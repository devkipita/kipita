import { createClient } from "@/lib/supabase/server";
import type {
  RequestDetail,
  RideDetail,
  RidePerson,
  RidePreferences,
  RideVehicle,
  TripDetail,
} from "./ride-detail";

const PERSON_COLUMNS =
  "id, full_name, avatar_url, is_verified, rating, total_trips";

const TRIP_SELECT = `
  id, from_location, to_location, departure_date, departure_time,
  seats_total, seats_available, price_per_seat, preferences, status,
  description,
  driver:users!driver_id ( ${PERSON_COLUMNS} ),
  vehicle:vehicles!vehicle_id ( make, model, year, color, plate_number )
`;

const REQUEST_SELECT = `
  id, from_location, to_location, preferred_date, preferred_time,
  seats_needed, preferences, status,
  passenger:users!passenger_id ( ${PERSON_COLUMNS} )
`;

type Supabase = Awaited<ReturnType<typeof createClient>>;

export class RideLoadError extends Error {
  constructor(kind: "trip" | "request", code: string | undefined, message: string) {
    super(`Couldn't load ${kind}: ${code ?? "unknown"} ${message}`);
    this.name = "RideLoadError";
  }
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchRideDetail(
  id: string,
  hint?: "trip" | "request",
): Promise<RideDetail | null> {
  if (!UUID.test(id)) return null;

  const supabase = await createClient();
  const [trip, request] = await Promise.all([
    fetchTrip(supabase, id),
    fetchRequest(supabase, id),
  ]);

  return hint === "request" ? (request ?? trip) : (trip ?? request);
}

async function fetchTrip(supabase: Supabase, id: string): Promise<TripDetail | null> {
  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new RideLoadError("trip", error.code, error.message);
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
    driver: one(row.driver as RidePerson | RidePerson[] | null),
    vehicle: one(row.vehicle as RideVehicle | RideVehicle[] | null),
  };
}

async function fetchRequest(supabase: Supabase, id: string): Promise<RequestDetail | null> {
  const { data, error } = await supabase
    .from("ride_requests")
    .select(REQUEST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new RideLoadError("request", error.code, error.message);
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
