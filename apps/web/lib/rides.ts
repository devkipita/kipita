import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { kenyaToday } from "@kipita/shared";

export type Town = {
  name: string;
  county: string | null;
};

export type Ride = {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  seatsAvailable: number;
  price: number;
  driverName: string;
  driverAvatar: string | null;
  driverRating: number;
  driverTrips: number;
};

export type When = { mode: "now" } | { mode: "schedule"; date: string };

export type SearchOutcome =
  | { status: "results"; rides: Ride[] }
  | { status: "empty" }
  | { status: "error" };

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

let cached: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  cached = url && key ? createBrowserClient(url, key) : null;
  return cached;
}

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
  // Kenya's day, not the device's or the server's.
  return kenyaToday();
}

export async function searchRides(
  from: string,
  to: string,
  when: When,
  seats = 1,
): Promise<SearchOutcome> {
  const fromQ = from.trim();
  const toQ = to.trim();
  const supabase = getClient();

  if (!supabase) return { status: "error" };

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
      .gte("seats_available", Math.max(1, seats))
      .ilike("from_location", `%${fromQ}%`)
      .ilike("to_location", `%${toQ}%`)
      .gte("departure_date", onOrAfter)
      .order("departure_date", { ascending: true })
      .order("departure_time", { ascending: true })
      .limit(12);

    if (error) return { status: "error" };

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
    return { status: "error" };
  }
}

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

export function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}
