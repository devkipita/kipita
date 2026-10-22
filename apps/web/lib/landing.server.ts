import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";
import { POPULAR_ROUTES } from "@/components/landing/data";
import type { Ride } from "@/lib/rides";

export type RouteCard = {
  from: string;
  to: string;
  price: string;
  duration: string;
  image: string;
  live: boolean;
};

const FALLBACK_IMAGE = "/landing/route-art.jpg";

const TOWN_IMAGES = new Set([
  "eldoret",
  "garissa",
  "kericho",
  "kisumu",
  "machakos",
  "malindi",
  "meru",
  "mombasa",
  "nairobi",
  "naivasha",
  "nakuru",
  "nanyuki",
  "nyeri",
  "thika",
]);

function townImage(town: string): string {
  const slug = town.trim().toLowerCase().replace(/\s+/g, "-");
  return TOWN_IMAGES.has(slug)
    ? `/landing/towns/${slug}.jpg`
    : FALLBACK_IMAGE;
}

function kes(amount: number): string {
  return `From KSh ${Math.round(amount).toLocaleString("en-KE")}`;
}

function seatsLabel(count: number): string {
  return count === 1 ? "1 ride posted" : `${count} rides posted`;
}

type RouteRow = {
  from_location: string;
  to_location: string;
  trips_count: number;
  min_price: number | string;
  image_url: string | null;
};

const STATIC_ROUTES: RouteCard[] = POPULAR_ROUTES.map((r) => ({
  from: r.from,
  to: r.to,
  price: r.price,
  duration: r.duration,
  image: townImage(r.to),
  live: false,
}));

export const fetchPopularRoutes = unstable_cache(
  async function fetchPopularRoutes(limit = 3): Promise<RouteCard[]> {
    try {
      const { data, error } = await supabasePublic
        .from("popular_routes")
        .select("from_location,to_location,trips_count,min_price,image_url")
        .order("trips_count", { ascending: false })
        .limit(limit);

      if (error || !data?.length) return STATIC_ROUTES.slice(0, limit);

      return (data as RouteRow[]).map((r) => ({
        from: r.from_location,
        to: r.to_location,
        price: kes(Number(r.min_price)),
        duration: seatsLabel(r.trips_count),
        image: r.image_url || townImage(r.to_location),
        live: true,
      }));
    } catch {
      return STATIC_ROUTES.slice(0, limit);
    }
  },
  ["popular-routes"],
  { revalidate: 3600, tags: ["popular-routes"] },
);

export { FALLBACK_IMAGE };

export type TripQuery = {
  from?: string;
  to?: string;
  date?: string;
  seats?: number;
};

type TripRow = {
  id: string;
  from_location: string;
  to_location: string;
  departure_date: string;
  departure_time: string;
  seats_available: number;
  price_per_seat: number | string;
  driver: {
    full_name: string | null;
    avatar_url: string | null;
    rating: number | null;
    total_trips: number | null;
  } | null;
};

function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export async function searchTrips(q: TripQuery): Promise<Ride[]> {
  const seats = Math.max(1, q.seats ?? 1);
  const onOrAfter = q.date?.trim() || localToday();

  try {
    const supabase = await createClient();
    let query = supabase
      .from("trips")
      .select(
        `id, from_location, to_location, departure_date, departure_time,
         seats_available, price_per_seat,
         driver:users!driver_id ( full_name, avatar_url, rating, total_trips )`,
      )
      .in("status", ["posted", "active"])
      .gte("seats_available", seats)
      .gte("departure_date", onOrAfter)
      .order("departure_date", { ascending: true })
      .order("departure_time", { ascending: true })
      .limit(30);

    if (q.from?.trim()) query = query.ilike("from_location", `%${q.from.trim()}%`);
    if (q.to?.trim()) query = query.ilike("to_location", `%${q.to.trim()}%`);

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as unknown as TripRow[]).map((r) => ({
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
  } catch {
    return [];
  }
}
