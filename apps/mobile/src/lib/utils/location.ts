import { findNearestTown, type Town } from "@kipita/shared";

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

export { findNearestTown };

export async function detectNearestTownByIp(): Promise<Town | null> {
  try {
    const coordinates = (await fetchFromIpApi()) ?? (await fetchFromIpWhoIs());
    if (!coordinates) return null;
    return findNearestTown(coordinates);
  } catch {
    return null;
  }
}
