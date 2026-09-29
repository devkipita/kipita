import { KENYAN_TOWNS } from "@kipita/shared";
import { createClient } from "@/lib/supabase/server";
import { resolvePlaces, coordsFor, type PlaceCard } from "./index";

/**
 * Towns to suggest next.
 *
 * Suggestions, not a fixed list: places the traveller has already been are
 * dropped, and what is left is ranked by how far it is from the towns they
 * actually travel between — near enough to be a realistic trip, far enough to
 * be somewhere new. A "recommended" rail that shows the same six places to
 * everyone is just a banner.
 *
 * The blurb is a reason to go, written once per place. Google Places would
 * supply ratings and categories instead, but it bills per request against a
 * card on file and this repo has no such key.
 */

export interface Destination extends PlaceCard {
  region: string;
  reason: string;
}

const PLACES: Record<string, string> = {
  Naivasha: "Lake walks and Hell's Gate, under two hours out",
  Nanyuki: "Mount Kenya foothills, and the equator runs through town",
  Diani: "White sand and warm water on the south coast",
  Nakuru: "Flamingos on the lake, and the Menengai crater rim",
  Kisumu: "Sunsets over Lake Victoria and the freshest tilapia",
  Lamu: "Swahili stone town, no cars, dhows at the jetty",
  Nyeri: "Aberdare forest air and tea country in every direction",
  Kitale: "Trekking country on the way to the Cherangani Hills",
  Malindi: "Old town, Italian cafés and the marine park",
  Eldoret: "Highland running country at 2,100 metres",
  Kericho: "Tea estates that run to the horizon",
  Watamu: "Reef snorkelling and the quietest beaches on the coast",
  Machakos: "Hills and the People's Park, an easy day out",
  Meru: "Forest, waterfalls and the low road to the reserve",
};

const RADIUS_KM = 6371;

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIUS_KM * Math.asin(Math.sqrt(h));
}

const countyOf = new Map(
  KENYAN_TOWNS.map((t) => [t.name.trim().toLowerCase(), t.county]),
);

function regionFor(town: string): string {
  const county = countyOf.get(town.trim().toLowerCase());
  if (!county) return "Kenya";
  return county.toLowerCase() === town.toLowerCase()
    ? `${county} County`
    : `${county} County`;
}

/** Towns this person has already booked a seat to, or set off from. */
async function townsTravelled(userId: string): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("trip:trips!trip_id ( from_location, to_location )")
      .or(`passenger_id.eq.${userId},driver_id.eq.${userId}`)
      .limit(60);

    if (error || !data) return new Set();

    const seen = new Set<string>();
    for (const row of data) {
      const raw = (row as Record<string, unknown>).trip;
      const trip = (Array.isArray(raw) ? raw[0] : raw) as
        | { from_location?: string; to_location?: string }
        | undefined;
      if (trip?.from_location) seen.add(trip.from_location.trim().toLowerCase());
      if (trip?.to_location) seen.add(trip.to_location.trim().toLowerCase());
    }
    return seen;
  } catch {
    return new Set();
  }
}

export async function fetchDestinations(
  userId?: string | null,
  limit = 8,
): Promise<Destination[]> {
  const travelled = userId ? await townsTravelled(userId) : new Set<string>();

  // Anchor on where they travel from, so suggestions are a plausible trip.
  const anchors = [...travelled]
    .map((t) => coordsFor(t))
    .filter((c): c is { lat: number; lng: number } => Boolean(c));

  const scored = Object.keys(PLACES)
    .filter((town) => !travelled.has(town.toLowerCase()))
    .map((town) => {
      const coords = coordsFor(town);
      if (!coords || anchors.length === 0) return { town, score: 0 };

      const nearest = Math.min(...anchors.map((a) => distanceKm(a, coords)));
      // Sweet spot around 250 km: a weekend away, not a commute and not a haul.
      const score = -Math.abs(nearest - 250);
      return { town, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.town);

  // Everyone has travelled everywhere, or nothing matched — fall back to the list.
  const picks = scored.length > 0 ? scored : Object.keys(PLACES).slice(0, limit);

  try {
    const resolved = await resolvePlaces(picks);
    return picks.map((town) => {
      const card = resolved.get(town.toLowerCase());
      return {
        town,
        region: regionFor(town),
        reason: PLACES[town] ?? "",
        photo: card?.photo ?? null,
        weather: card?.weather ?? null,
        county: card?.county ?? null,
      };
    });
  } catch {
    return picks.map((town) => ({
      town,
      region: regionFor(town),
      reason: PLACES[town] ?? "",
      photo: null,
      weather: null,
      county: null,
    }));
  }
}
