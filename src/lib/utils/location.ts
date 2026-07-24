import type { KenyanTown } from "@/types";

interface Coordinates {
  lat: number;
  lng: number;
}

function isValidCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function fetchFromIpApi(): Promise<Coordinates | null> {
  const response = await fetch("https://ipapi.co/json/");
  if (!response.ok) return null;

  const data = (await response.json()) as {
    latitude?: number;
    longitude?: number;
  };

  if (!isValidCoordinate(data.latitude) || !isValidCoordinate(data.longitude)) {
    return null;
  }

  return { lat: data.latitude, lng: data.longitude };
}

async function fetchFromIpWhoIs(): Promise<Coordinates | null> {
  const response = await fetch("https://ipwho.is/");
  if (!response.ok) return null;

  const data = (await response.json()) as {
    success?: boolean;
    latitude?: number;
    longitude?: number;
  };

  if (data.success === false) return null;
  if (!isValidCoordinate(data.latitude) || !isValidCoordinate(data.longitude)) {
    return null;
  }

  return { lat: data.latitude, lng: data.longitude };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export function findNearestTown(
  townList: KenyanTown[],
  coordinates: Coordinates,
): KenyanTown | null {
  if (!townList.length) return null;

  let best: KenyanTown | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const town of townList) {
    const distance = haversineDistanceKm(coordinates, {
      lat: town.lat,
      lng: town.lng,
    });
    if (distance < bestDistance) {
      bestDistance = distance;
      best = town;
    }
  }

  return best;
}

export async function detectNearestTownByIp(
  townList: KenyanTown[],
): Promise<KenyanTown | null> {
  try {
    const coordinates = (await fetchFromIpApi()) ?? (await fetchFromIpWhoIs());
    if (!coordinates) return null;
    return findNearestTown(townList, coordinates);
  } catch {
    return null;
  }
}
