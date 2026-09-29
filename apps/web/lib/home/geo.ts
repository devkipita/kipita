import { findNearestTown, townsNear, type Town } from "@kipita/shared";

export interface Coords {
  lat: number;
  lng: number;
}

const CACHE_KEY = "kipita-origin";

function isCoord(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function fromIpApi(signal?: AbortSignal): Promise<Coords | null> {
  const response = await fetch("https://ipapi.co/json/", { signal });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    latitude?: number;
    longitude?: number;
  };
  if (!isCoord(data.latitude) || !isCoord(data.longitude)) return null;
  return { lat: data.latitude, lng: data.longitude };
}

async function fromIpWhoIs(signal?: AbortSignal): Promise<Coords | null> {
  const response = await fetch("https://ipwho.is/", { signal });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    success?: boolean;
    latitude?: number;
    longitude?: number;
  };
  if (data.success === false) return null;
  if (!isCoord(data.latitude) || !isCoord(data.longitude)) return null;
  return { lat: data.latitude, lng: data.longitude };
}

export async function detectCoords(
  signal?: AbortSignal,
): Promise<Coords | null> {
  try {
    return (await fromIpApi(signal)) ?? (await fromIpWhoIs(signal));
  } catch {
    return null;
  }
}

function readCache(): { town: Town; coords: Coords } | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { town?: Town; coords?: Coords };
    if (!parsed.town?.name || !parsed.coords) return null;
    return { town: parsed.town, coords: parsed.coords };
  } catch {
    return null;
  }
}

function writeCache(town: Town, coords: Coords): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ town, coords }));
  } catch {
    /* private mode, blocked storage — detection just repeats next time */
  }
}

export interface Origin {
  town: Town;
  coords: Coords;
}

export async function detectOrigin(
  signal?: AbortSignal,
): Promise<Origin | null> {
  const cached = readCache();
  if (cached) return cached;

  const coords = await detectCoords(signal);
  if (!coords) return null;

  const town = findNearestTown(coords);
  if (!town) return null;

  writeCache(town, coords);
  return { town, coords };
}

export function nearbyTowns(coords: Coords, limit = 6): Town[] {
  return townsNear(coords, 60, limit);
}
