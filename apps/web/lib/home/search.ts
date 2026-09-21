import type { SupabaseClient } from "@supabase/supabase-js";
import type { RidePerson, RidePreferences } from "@/lib/ride-detail";

/**
 * Trip / ride-request search for the home page.
 *
 * Ported from `apps/mobile/src/lib/api/trips.ts` so both clients agree on what
 * "rides on this route, at or after this time" means — with two deliberate
 * differences:
 *
 *  - **No mock fallback.** Mobile substitutes seed data when a browse query
 *    comes back empty *or errors*, which hides RLS failures behind a healthy
 *    looking feed. Here an empty result is empty and an error throws.
 *  - **One implementation.** The client is a parameter, so the server component
 *    (cookie-scoped client) and the client-side re-search (browser client) run
 *    exactly the same query. Mobile duplicates its date filter three times.
 */

export type SearchParams = {
  from?: string;
  to?: string;
  /** "YYYY-MM-DD" */
  date?: string | null;
  /** "HH:mm" */
  departure_time?: string | null;
};

export type HomeTrip = {
  kind: "trip";
  id: string;
  from_location: string;
  to_location: string;
  departure_date: string | null;
  departure_time: string | null;
  seats_available: number;
  price_per_seat: number;
  preferences: RidePreferences;
  person: RidePerson | null;
};

export type HomeRequest = {
  kind: "request";
  id: string;
  from_location: string;
  to_location: string;
  preferred_date: string | null;
  preferred_time: string | null;
  seats_needed: number;
  preferences: RidePreferences;
  person: RidePerson | null;
};

export type HomeItem = HomeTrip | HomeRequest;

const PERSON_COLUMNS =
  "id, full_name, avatar_url, is_verified, rating, total_trips, phone";

const TRIP_SELECT = `
  id, from_location, to_location, departure_date, departure_time,
  seats_available, price_per_seat, preferences,
  driver:users!driver_id ( ${PERSON_COLUMNS} )
`;

const REQUEST_SELECT = `
  id, from_location, to_location, preferred_date, preferred_time,
  seats_needed, preferences,
  passenger:users!passenger_id ( ${PERSON_COLUMNS} )
`;

const PAGE_SIZE = 20;

/** Supabase types an embedded one-to-one join as an array in some shapes. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

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

function scheduleTarget(params?: SearchParams): Date {
  return parseDateTime(params?.date, params?.departure_time) ?? new Date();
}

/**
 * `%` and `_` are LIKE wildcards. PostgREST parameterises the value so this is
 * not injection, just a surprising search — "50%" would match everything.
 */
function likeTerm(value: string): string {
  return `%${value.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function searchTrips(
  supabase: SupabaseClient,
  params: SearchParams = {},
): Promise<HomeTrip[]> {
  const target = scheduleTarget(params);

  let query = supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("status", "posted")
    .gt("seats_available", 0)
    .order("departure_date", { ascending: true })
    .order("departure_time", { ascending: true })
    .limit(PAGE_SIZE);

  if (params.from?.trim()) query = query.ilike("from_location", likeTerm(params.from));
  if (params.to?.trim()) query = query.ilike("to_location", likeTerm(params.to));

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        kind: "trip" as const,
        id: row.id as string,
        from_location: row.from_location as string,
        to_location: row.to_location as string,
        departure_date: (row.departure_date as string | null) ?? null,
        departure_time: (row.departure_time as string | null) ?? null,
        seats_available: Number(row.seats_available ?? 0),
        price_per_seat: Number(row.price_per_seat ?? 0),
        preferences: (row.preferences as RidePreferences) ?? {},
        person: one(row.driver as RidePerson | RidePerson[] | null),
      };
    })
    .filter((trip) => {
      // A trip with no parseable departure is kept — mobile does the same.
      const departure = parseDateTime(trip.departure_date, trip.departure_time);
      return !departure || departure.getTime() >= target.getTime();
    });
}

export async function searchRequests(
  supabase: SupabaseClient,
  params: SearchParams = {},
): Promise<HomeRequest[]> {
  const target = scheduleTarget(params);
  // Mobile distinguishes "the user asked for a specific day" from "right now":
  // with an explicit date, undated requests are excluded; without one, they are
  // treated as flexible and kept.
  const explicitDate = Boolean(params.date);

  let query = supabase
    .from("ride_requests")
    .select(REQUEST_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (params.from?.trim()) query = query.ilike("from_location", likeTerm(params.from));
  if (params.to?.trim()) query = query.ilike("to_location", likeTerm(params.to));

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        kind: "request" as const,
        id: row.id as string,
        from_location: row.from_location as string,
        to_location: row.to_location as string,
        preferred_date: (row.preferred_date as string | null) ?? null,
        preferred_time: (row.preferred_time as string | null) ?? null,
        seats_needed: Number(row.seats_needed ?? 1),
        preferences: (row.preferences as RidePreferences) ?? {},
        person: one(row.passenger as RidePerson | RidePerson[] | null),
      };
    })
    .filter((request) => {
      const preferred = parseDateTime(
        request.preferred_date,
        request.preferred_time,
      );
      if (!request.preferred_date || !preferred) return !explicitDate;
      return preferred.getTime() >= target.getTime();
    });
}

/** Run whichever search the current mode calls for. */
export function searchForMode(
  supabase: SupabaseClient,
  mode: "passenger" | "driver",
  params: SearchParams = {},
): Promise<HomeItem[]> {
  return mode === "driver"
    ? searchRequests(supabase, params)
    : searchTrips(supabase, params);
}
