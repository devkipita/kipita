import { NextResponse } from "next/server";
import { resolvePlaces } from "@/lib/places";

/**
 * Destination photo + current weather for a list of towns.
 *
 * The home feed re-searches on the client, so those results need the same
 * enrichment the server render does. Both upstreams are cached by `fetch`, so
 * this route is thin — it exists so the browser does not have to know about
 * Wikipedia or Open-Meteo, and so their responses stay on one origin for CSP.
 */

const MAX_TOWNS = 12;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("towns") ?? "";

  const towns = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TOWNS);

  if (towns.length === 0) return NextResponse.json({ places: {} });

  try {
    const resolved = await resolvePlaces(towns);
    return NextResponse.json(
      { places: Object.fromEntries(resolved) },
      { headers: { "cache-control": "public, max-age=900, s-maxage=3600" } },
    );
  } catch {
    // A card without a picture still works; an error here must not break one.
    return NextResponse.json({ places: {} });
  }
}
