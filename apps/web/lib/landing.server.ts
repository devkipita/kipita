import "server-only";
import { createClient } from "@/lib/supabase/server";
import { POPULAR_ROUTES } from "@/components/landing/data";

export type RouteCard = {
  from: string;
  to: string;
  price: string;
  duration: string;
  image: string;
  live: boolean;
};

const FALLBACK_IMAGE = "/landing/route-art.jpg";

function townImage(town: string): string {
  const slug = town.trim().toLowerCase().replace(/\s+/g, "-");
  return `/landing/towns/${slug}.jpg`;
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

export async function fetchPopularRoutes(limit = 3): Promise<RouteCard[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
}

export { FALLBACK_IMAGE };
