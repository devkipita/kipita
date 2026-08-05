/**
 * Ride-search data layer for the public landing page.
 *
 * Reads live from Supabase using the anon key — the `trips`, `cities` and
 * `users` tables are all readable by anonymous visitors (RLS `USING(true)`),
 * so the marketing site can show real, up-to-the-minute rides.
 *
 * Everything here degrades gracefully: if the env vars are missing or a query
 * errors, we fall back to a small set of curated demo rides so the search never
 * looks broken. A *successful* query that returns zero rows is a real empty
 * state (the "request a ride → get the app" flow), and is reported as such.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** A town the user can search from/to. */
export type Town = {
  name: string;
  county: string | null;
};

/** A single searchable ride, flattened for the UI. */
export type Ride = {
  id: string;
  from: string;
  to: string;
  /** ISO date, e.g. "2026-08-06". */
  date: string;
  /** "HH:MM" 24h. */
  time: string;
  seatsAvailable: number;
  price: number;
  driverName: string;
  driverAvatar: string | null;
  driverRating: number;
  driverTrips: number;
};

/** When the traveller wants to leave. */
export type When =
  | { mode: "now" }
  | { mode: "schedule"; date: string };

/**
 * The outcome of a search, as a discriminated union so the UI can tell the
 * three cases apart:
 *  - `results` — a live query returned one or more rides.
 *  - `empty`   — a live query succeeded but found nothing (real empty state).
 *  - `demo`    — Supabase was unreachable/unconfigured; these are curated rides.
 */
export type SearchOutcome =
  | { status: "results"; rides: Ride[] }
  | { status: "empty" }
  | { status: "demo"; rides: Ride[] };

/* ── Fallbacks (used only when Supabase is unconfigured or errors) ── */

/** Seeded Kenyan towns — mirrors migration 003's `cities` seed. */
export const FALLBACK_TOWNS: Town[] = [
  { name: "Nairobi", county: "Nairobi" },
  { name: "Mombasa", county: "Mombasa" },
  { name: "Kisumu", county: "Kisumu" },
  { name: "Nakuru", county: "Nakuru" },
  { name: "Eldoret", county: "Uasin Gishu" },
  { name: "Thika", county: "Kiambu" },
  { name: "Nyeri", county: "Nyeri" },
  { name: "Machakos", county: "Machakos" },
  { name: "Kericho", county: "Kericho" },
  { name: "Malindi", county: "Kilifi" },
];

const DEMO_DRIVERS = [
  { name: "James Mwangi", rating: 4.9, trips: 128 },
  { name: "Aisha Odhiambo", rating: 4.8, trips: 91 },
  { name: "Brian Kiptoo", rating: 4.7, trips: 54 },
  { name: "Wanjiku Njeri", rating: 5.0, trips: 203 },
];

/** Build a few plausible curated rides for a route (offline demo only). */
function demoRides(from: string, to: string): Ride[] {
  const base = 900 + Math.round(from.length + to.length) * 40;
  return DEMO_DRIVERS.slice(0, 3).map((d, i) => ({
    id: `demo-${i}`,
    from,
    to,
    date: "",
    time: ["06:00", "10:30", "15:45"][i],
    seatsAvailable: [4, 2, 3][i],
    price: base + i * 350,
    driverName: d.name,
    driverAvatar: null,
    driverRating: d.rating,
    driverTrips: d.trips,
  }));
}

/* ── Supabase client (guarded — never throws on missing env) ── */

let cached: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && key ? createBrowserClient(url, key) : null;
  return cached;
}

/* ── Public API ── */

/** Fetch the list of active towns for the destination suggestions. */
export async function fetchTowns(): Promise<Town[]> {
  const supabase = getClient();
  if (!supabase) return FALLBACK_TOWNS;

  try {
    const { data, error } = await supabase
      .from("cities")
      .select("name, county")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error || !data?.length) return FALLBACK_TOWNS;
    return data as Town[];
  } catch {
    return FALLBACK_TOWNS;
  }
}

type TripRow = {
  id: string;
  from_location: string;
  to_location: string;
  departure_date: string;
  departure_time: string;
  seats_available: number;
  price_per_seat: number;
  driver: {
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    total_trips: number | null;
  } | null;
};

function todayISO(): string {
  // Local YYYY-MM-DD without pulling in a date lib.
  return new Date().toISOString().slice(0, 10);
}

/** Search live trips for a route + time. See {@link SearchOutcome}. */
export async function searchRides(
  from: string,
  to: string,
  when: When,
): Promise<SearchOutcome> {
  const fromQ = from.trim();
  const toQ = to.trim();
  const supabase = getClient();

  if (!supabase) return { status: "demo", rides: demoRides(fromQ, toQ) };

  const onOrAfter = when.mode === "schedule" ? when.date : todayISO();

  try {
    const { data, error } = await supabase
      .from("trips")
      .select(
        `id, from_location, to_location, departure_date, departure_time,
         seats_available, price_per_seat,
         driver:users!driver_id ( full_name, avatar_url, rating, total_trips )`,
      )
      .in("status", ["posted", "active"])
      .gt("seats_available", 0)
      .ilike("from_location", `%${fromQ}%`)
      .ilike("to_location", `%${toQ}%`)
      .gte("departure_date", onOrAfter)
      .order("departure_date", { ascending: true })
      .order("departure_time", { ascending: true })
      .limit(12);

    if (error) return { status: "demo", rides: demoRides(fromQ, toQ) };

    const rows = (data ?? []) as unknown as TripRow[];
    if (!rows.length) return { status: "empty" };

    const rides: Ride[] = rows.map((r) => ({
      id: r.id,
      from: r.from_location,
      to: r.to_location,
      date: r.departure_date,
      time: (r.departure_time ?? "").slice(0, 5),
      seatsAvailable: r.seats_available,
      price: Number(r.price_per_seat),
      driverName: r.driver?.full_name?.trim() || "Kipita driver",
      driverAvatar: r.driver?.avatar_url ?? null,
      driverRating: Number(r.driver?.rating ?? 0),
      driverTrips: Number(r.driver?.total_trips ?? 0),
    }));

    return { status: "results", rides };
  } catch {
    return { status: "demo", rides: demoRides(fromQ, toQ) };
  }
}

/**
 * Best-effort city detection from the visitor's IP. Returns a town name if it
 * maps to a known Kenyan town, otherwise the raw detected city, otherwise null.
 * Never throws — the caller treats null as "let the user type it".
 */
export async function detectCity(signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal });
    if (!res.ok) return null;
    const data: { city?: string } = await res.json();
    const city = data.city?.trim();
    return city || null;
  } catch {
    return null;
  }
}

/** Format a KES price for display, e.g. 1500 → "KES 1,500". */
export function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

/** Turn "06:00" + optional ISO date into a friendly "Today · 6:00 AM". */
export function formatWhen(date: string, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const clock = `${hour12}:${String(m || 0).padStart(2, "0")} ${period}`;

  if (!date) return clock;

  const today = todayISO();
  if (date === today) return `Today · ${clock}`;

  const dt = new Date(`${date}T00:00:00`);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date === tomorrow.toISOString().slice(0, 10)) return `Tomorrow · ${clock}`;

  const day = dt.toLocaleDateString("en-KE", { weekday: "short" });
  return `${day} · ${clock}`;
}
