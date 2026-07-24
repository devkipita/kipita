import { supabase } from "@/lib/supabase";
import type { Trip, RideRequest, RidePreferences } from "@/types";
import { MOCK_TRIPS, MOCK_REQUESTS } from "@/lib/mock/data";

type TripSearchParams = {
  from?: string;
  to?: string;
  date?: string | null;
  departure_time?: string | null;
};

function parseDateTime(
  date: string | null | undefined,
  time: string | null | undefined,
): Date | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;

  const [hh = "00", mm = "00"] = (time ?? "00:00").split(":");
  const hour = Number(hh);
  const minute = Number(mm);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function getScheduleTarget(params?: TripSearchParams): Date {
  return parseDateTime(params?.date, params?.departure_time) ?? new Date();
}

function isTripScheduledOnOrAfterTarget(trip: Trip, target: Date): boolean {
  const departure = parseDateTime(trip.departure_date, trip.departure_time);
  if (!departure) return true;
  return departure.getTime() >= target.getTime();
}

function isRequestScheduledOnOrAfterTarget(
  request: RideRequest,
  target: Date,
): boolean {
  if (!request.preferred_date) return false;
  const preferred = parseDateTime(
    request.preferred_date,
    request.preferred_time,
  );
  if (!preferred) return false;
  return preferred.getTime() >= target.getTime();
}

function isRequestImmediateOrScheduledInFuture(
  request: RideRequest,
  now: Date,
): boolean {
  if (!request.preferred_date) return true;
  const preferred = parseDateTime(
    request.preferred_date,
    request.preferred_time,
  );
  if (!preferred) return true;
  return preferred.getTime() >= now.getTime();
}

const TRIP_SELECT = `
  *,
  driver:users!driver_id(id, full_name, avatar_url, is_verified, rating, total_trips),
  vehicle:vehicles!vehicle_id(*),
  origin_city:cities!origin_city_id(*),
  destination_city:cities!destination_city_id(*)
`;

const REQUEST_SELECT = `
  *,
  passenger:users!passenger_id(id, full_name, avatar_url, is_verified, rating, total_trips)
`;

export async function fetchTrips(params?: TripSearchParams): Promise<Trip[]> {
  const scheduleTarget = getScheduleTarget(params);

  let query = supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("status", "posted")
    .gt("seats_available", 0)
    .order("departure_date", { ascending: true });

  if (params?.from) query = query.ilike("from_location", `%${params.from}%`);
  if (params?.to) query = query.ilike("to_location", `%${params.to}%`);

  const { data, error } = await query;
  const source =
    error || !data || data.length === 0 ? MOCK_TRIPS : (data as Trip[]);
  return source.filter((trip) =>
    isTripScheduledOnOrAfterTarget(trip, scheduleTarget),
  );
}

export async function fetchTripById(id: string): Promise<Trip> {
  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Trip;
}

export async function fetchRequests(
  params?: TripSearchParams,
): Promise<RideRequest[]> {
  const scheduleTarget = getScheduleTarget(params);
  const explicitLaterFilter = Boolean(params?.date);

  let query = supabase
    .from("ride_requests")
    .select(REQUEST_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (params?.from) query = query.ilike("from_location", `%${params.from}%`);
  if (params?.to) query = query.ilike("to_location", `%${params.to}%`);

  const { data, error } = await query;
  const source =
    error || !data || data.length === 0
      ? MOCK_REQUESTS
      : (data as RideRequest[]);

  return source.filter((request) => {
    if (explicitLaterFilter) {
      return isRequestScheduledOnOrAfterTarget(request, scheduleTarget);
    }
    return isRequestImmediateOrScheduledInFuture(request, scheduleTarget);
  });
}

export async function fetchRequestById(id: string): Promise<RideRequest> {
  const { data, error } = await supabase
    .from("ride_requests")
    .select(REQUEST_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as RideRequest;
}

export async function createTrip(trip: {
  driver_id: string;
  from_location: string;
  to_location: string;
  departure_date: string;
  departure_time: string;
  seats_total: number;
  price_per_seat: number;
  preferences: RidePreferences;
  vehicle_id?: string | null;
  origin_city_id?: string | null;
  destination_city_id?: string | null;
  pickup_point?: string | null;
  dropoff_point?: string | null;
  description?: string | null;
}): Promise<Trip> {
  const { data, error } = await supabase
    .from("trips")
    .insert({ ...trip, seats_available: trip.seats_total, status: "posted" })
    .select(TRIP_SELECT)
    .single();
  if (error) throw error;
  return data as Trip;
}

export async function createRideRequest(request: {
  passenger_id: string;
  from_location: string;
  to_location: string;
  preferred_date: string | null;
  preferred_time: string | null;
  seats_needed: number;
  preferences: RidePreferences;
}): Promise<RideRequest> {
  const { data, error } = await supabase
    .from("ride_requests")
    .insert({ ...request, status: "pending" })
    .select(REQUEST_SELECT)
    .single();
  if (error) throw error;
  return data as RideRequest;
}
