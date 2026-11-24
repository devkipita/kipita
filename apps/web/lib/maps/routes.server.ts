import "server-only";
import { unstable_cache } from "next/cache";

export type RouteLine = { polyline: string; seconds: number; meters: number };
export type LiveLeg = { seconds: number; meters: number };

const KEY = process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function waypoint(place: string) {
  const m = place.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  return m
    ? { location: { latLng: { latitude: Number(m[1]), longitude: Number(m[2]) } } }
    : { address: place };
}

async function computeRoute(origin: string, destination: string, withLine: boolean, live: boolean): Promise<RouteLine | null> {
  if (!KEY) return null;
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": withLine
          ? "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
          : "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: waypoint(origin),
        destination: waypoint(destination),
        travelMode: "DRIVE",
        regionCode: "KE",
        ...(live ? { routingPreference: "TRAFFIC_AWARE" } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { duration?: string; distanceMeters?: number; polyline?: { encodedPolyline?: string } }[];
    };
    const r = data.routes?.[0];
    if (!r) return null;
    return {
      polyline: r.polyline?.encodedPolyline ?? "",
      seconds: parseInt(r.duration ?? "0", 10) || 0,
      meters: r.distanceMeters ?? 0,
    };
  } catch {
    return null;
  }
}

export const routeBetween = unstable_cache(
  (origin: string, destination: string) => computeRoute(origin, destination, true, false),
  ["maps-route-v1"],
  { revalidate: 60 * 60 * 24 * 7, tags: ["maps-route"] },
);

export const legBetween = unstable_cache(
  async (origin: string, destination: string): Promise<LiveLeg | null> => {
    const r = await computeRoute(origin, destination, false, true);
    return r ? { seconds: r.seconds, meters: r.meters } : null;
  },
  ["maps-leg-v1"],
  { revalidate: 60, tags: ["maps-eta"] },
);
