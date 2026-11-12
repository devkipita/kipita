import { supabase } from "@/lib/supabase";
import type { Trip, RideRequest, RidePreferences } from "@/types";
import { MOCK_TRIPS, MOCK_REQUESTS } from "@/lib/mock/data";
import { resolveAppUserId } from "./session";
import { fetchDriverProfile } from "./driver";

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
  // An explicit route search must reflect reality: return only rides actually
  // going that way, and an EMPTY list when nobody is — that empty result is
  // what triggers the "post your ride request" drawer (the core Kipita loop).
  // Mock seed data is a browse-only preview, never mixed into a real search.
  const isRouteSearch = Boolean(params?.from || params?.to);
  const source: Trip[] =
    error || !data || data.length === 0
      ? isRouteSearch
        ? []
        : MOCK_TRIPS
      : (data as Trip[]);
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
  // Same rule as fetchTrips: a real route search never falls back to mock, so
  // "no passengers going that way" surfaces as empty → the driver is offered
  // the "post your ride" drawer.
  const isRouteSearch = Boolean(params?.from || params?.to);
  const source: RideRequest[] =
    error || !data || data.length === 0
      ? isRouteSearch
        ? []
        : MOCK_REQUESTS
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

/**
 * Rides this driver has published, newest departure first.
 *
 * Search only returns `posted` rides, so without this a driver loses sight of
 * their own ride the moment they publish it — and an `awaiting_approval` one
 * would never be visible at all.
 */
export async function fetchMyTrips(): Promise<Trip[]> {
  const driverId = await resolveAppUserId();

  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("driver_id", driverId)
    .in("status", ["awaiting_approval", "posted", "active", "in_progress"])
    .order("departure_date", { ascending: true })
    .order("departure_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Trip[];
}

/** Raised by the per-hour throttle triggers in migration 020. */
const RATE_LIMIT_CODE = "54000";
/** RLS rejected the row — the driver is not cleared to publish this status. */
const RLS_CODE = "42501";

/** A publish failure the driver can act on. `fix` says which screen fixes it. */
export class PublishError extends Error {
  readonly fix?: "kyc";
  constructor(message: string, fix?: "kyc") {
    super(message);
    this.name = "PublishError";
    this.fix = fix;
  }
}

export interface PublishedTrip {
  trip: Trip;
  /** True when the ride is parked until the driver's verification clears. */
  awaiting: boolean;
}

/**
 * The car this ride is offered in. A driver keeps one vehicle, so the newest
 * row is reused. Never fails the publish: a ride with no car attached is still
 * a ride, and the driver can add the car from their profile.
 */
async function resolveVehicleId(driverId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("vehicles")
      .select("id")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as { id?: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

/** Nairobi is UTC+3 all year, and the server compares against real time. */
function departureInFuture(date: string, time: string): boolean {
  const at = Date.parse(`${date}T${time}:00+03:00`);
  return Number.isFinite(at) && at > Date.now();
}

/**
 * Publish a ride.
 *
 * Mirrors `createTripAction` on web. The driver gate is re-checked here rather
 * than trusted from the UI, and the row's status is chosen to match what RLS
 * will accept (migration 047): an approved driver posts live, a pending one
 * parks the ride at `awaiting_approval` until an admin clears them, unless the
 * `publish_before_approval` flag is on.
 */
export async function publishTrip(input: {
  from_location: string;
  to_location: string;
  departure_date: string;
  departure_time: string;
  seats_total: number;
  price_per_seat: number;
  preferences: RidePreferences;
  pickup_point?: string | null;
  dropoff_point?: string | null;
  description?: string | null;
}): Promise<PublishedTrip> {
  const driverId = await resolveAppUserId();

  const profile = await fetchDriverProfile(driverId);
  const kycStatus = profile?.approval_status ?? "not_submitted";

  if (kycStatus === "not_submitted") {
    throw new PublishError(
      "Kipita needs your ID, your photo and your car before your ride can go live.",
      "kyc",
    );
  }
  if (kycStatus === "rejected") {
    throw new PublishError(
      "We couldn't verify your documents. Send them again to publish rides.",
      "kyc",
    );
  }

  let status: "posted" | "awaiting_approval" = "posted";
  if (kycStatus === "pending") {
    const { data: early } = await supabase.rpc("flag_enabled", {
      p_key: "publish_before_approval",
    } as never);
    if (early !== true) status = "awaiting_approval";
  }

  if (!departureInFuture(input.departure_date, input.departure_time)) {
    throw new PublishError(
      "That departure time has already passed. Pick a later one.",
    );
  }

  const vehicleId = await resolveVehicleId(driverId);

  const { data, error } = await supabase
    .from("trips")
    .insert({
      driver_id: driverId,
      vehicle_id: vehicleId,
      from_location: input.from_location,
      to_location: input.to_location,
      departure_date: input.departure_date,
      departure_time: input.departure_time,
      seats_total: input.seats_total,
      seats_available: input.seats_total,
      price_per_seat: input.price_per_seat,
      preferences: input.preferences,
      pickup_point: input.pickup_point ?? null,
      dropoff_point: input.dropoff_point ?? null,
      description: input.description ?? null,
      status,
    } as never)
    .select(TRIP_SELECT)
    .single();

  if (error || !data) {
    if (error?.code === RATE_LIMIT_CODE) {
      throw new PublishError(
        "You've posted a few times in the last hour. Try again a little later.",
      );
    }
    if (error?.code === RLS_CODE) {
      throw new PublishError(
        "Your driver account isn't approved yet, so this ride can't go live.",
        "kyc",
      );
    }
    throw new PublishError("We couldn't post that ride. Please try again.");
  }

  return { trip: data as Trip, awaiting: status === "awaiting_approval" };
}

/** Post a passenger's ride request. No verification is required to ride. */
export async function publishRideRequest(input: {
  from_location: string;
  to_location: string;
  preferred_date: string | null;
  preferred_time: string | null;
  seats_needed: number;
  preferences: RidePreferences;
}): Promise<RideRequest> {
  const passengerId = await resolveAppUserId();

  const { data, error } = await supabase
    .from("ride_requests")
    .insert({ ...input, passenger_id: passengerId, status: "pending" } as never)
    .select(REQUEST_SELECT)
    .single();

  if (error || !data) {
    if (error?.code === RATE_LIMIT_CODE) {
      throw new PublishError(
        "You've posted a few times in the last hour. Try again a little later.",
      );
    }
    throw new PublishError("We couldn't post that request. Please try again.");
  }

  return data as RideRequest;
}
