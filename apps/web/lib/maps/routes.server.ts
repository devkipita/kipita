import "server-only";
import { unstable_cache } from "next/cache";

export type RouteLine = { polyline: string; seconds: number };

const KEY = process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function waypoint(place: string) {
  const m = place.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  return m
    ? { location: { latLng: { latitude: Number(m[1]), longitude: Number(m[2]) } } }
    : { address: place };
}

async function computeRoute(origin: string, destination: string, withLine: boolean): Promise<RouteLine | null> {
  if (!KEY) return null;
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": withLine ? "routes.duration,routes.polyline.encodedPolyline" : "routes.duration",
      },
      body: JSON.stringify({
        origin: waypoint(origin),
        destination: waypoint(destination),
        travelMode: "DRIVE",
        regionCode: "KE",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { routes?: { duration?: string; polyline?: { encodedPolyline?: string } }[] };
    const r = data.routes?.[0];
    if (!r) return null;
    return { polyline: r.polyline?.encodedPolyline ?? "", seconds: parseInt(r.duration ?? "0", 10) || 0 };
  } catch {
    return null;
  }
}

export const routeBetween = unstable_cache(
  (origin: string, destination: string) => computeRoute(origin, destination, true),
  ["maps-route-v1"],
  { revalidate: 60 * 60 * 24 * 7, tags: ["maps-route"] },
);

export const etaBetween = unstable_cache(
  async (origin: string, destination: string) => (await computeRoute(origin, destination, false))?.seconds ?? null,
  ["maps-eta-v1"],
  { revalidate: 120, tags: ["maps-eta"] },
);
