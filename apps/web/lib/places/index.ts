import { KENYAN_TOWNS } from "@kipita/shared";
import { cityPhoto } from "./photo";
import { fetchWeather, type Weather } from "./weather";

/**
 * What a destination card needs: a picture of the place and what it is like
 * there right now. Both sources are keyless and both degrade to nothing, so a
 * card is always renderable.
 *
 * Google Places and the Booking.com Demand API would give richer data —
 * ratings, categories, opening hours — but Places needs a billed key and
 * Booking needs a signed partner agreement. Neither credential exists in this
 * repo, so this resolver is the honest substitute and the single place to swap
 * if those keys ever arrive.
 */

export interface PlaceCard {
  town: string;
  photo: string | null;
  weather: Weather | null;
  county: string | null;
}

const byName = new Map(
  KENYAN_TOWNS.map((t) => [t.name.trim().toLowerCase(), t]),
);

/** Coordinates for a town name, matching the leading segment if needed. */
export function coordsFor(name: string): { lat: number; lng: number } | null {
  const clean = name.trim().toLowerCase();
  const exact = byName.get(clean);
  if (exact) return { lat: exact.lat, lng: exact.lng };

  const head = clean.split(/[,\-–]/)[0]?.trim();
  const partial = head ? byName.get(head) : undefined;
  if (partial) return { lat: partial.lat, lng: partial.lng };

  return null;
}

export function countyFor(name: string): string | null {
  const clean = name.trim().toLowerCase();
  const town = byName.get(clean) ?? byName.get(clean.split(/[,\-–]/)[0]?.trim() ?? "");
  return town?.county ?? null;
}

export async function resolvePlace(name: string): Promise<PlaceCard> {
  const coords = coordsFor(name);
  const [photo, weather] = await Promise.all([
    cityPhoto(name),
    coords ? fetchWeather(coords.lat, coords.lng) : Promise.resolve(null),
  ]);

  return { town: name, photo, weather, county: countyFor(name) };
}

/** Resolve several towns at once, de-duplicated by name. */
export async function resolvePlaces(
  names: (string | null | undefined)[],
): Promise<Map<string, PlaceCard>> {
  const unique = [
    ...new Set(names.filter(Boolean).map((n) => (n as string).trim())),
  ].filter(Boolean);

  const cards = await Promise.all(unique.map((n) => resolvePlace(n)));
  return new Map(cards.map((c) => [c.town.toLowerCase(), c]));
}

export type { Weather, WeatherKind } from "./weather";
