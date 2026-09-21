import { storage } from "./mmkv";

/**
 * Destination imagery for trip tickets, sourced from Wikipedia's REST summary
 * endpoint — keyless, free and CORS-friendly.
 *
 * Deliberately NOT Google Maps: the Places Photo API needs a billed key, its
 * terms forbid caching the bytes, and it requires visible attribution.
 *
 * Wikipedia's lead image is a lottery — some towns give a skyline, others a
 * locator map or a coat of arms — so every lookup is best-effort and the caller
 * always has the gradient below to fall back to. Results (including misses) are
 * cached in MMKV so a town is only ever looked up once per TTL.
 */

const CACHE_KEY = "city_photos_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MISS = "";
const THUMB_WIDTH = 800;
const ENDPOINT = "https://en.wikipedia.org/w/api.php";

type CacheEntry = { url: string; at: number };
type Cache = Record<string, CacheEntry>;

const inFlight = new Map<string, Promise<string | null>>();
const listeners = new Set<() => void>();

let cache: Cache | null = null;

function readCache(): Cache {
  cache ??= storage.getJSON<Cache>(CACHE_KEY) ?? {};
  return cache;
}

function writeCache(key: string, url: string) {
  const next = readCache();
  next[key] = { url, at: Date.now() };
  cache = next;
  storage.setJSON(CACHE_KEY, next);
  for (const listener of listeners) listener();
}

export function subscribeCityPhotos(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function normalise(city: string): string {
  return city.trim().toLowerCase();
}

/**
 * Uses the Action API's `pageimages` rather than the REST summary endpoint,
 * because the summary only ever returns a ~330px thumbnail and Wikimedia's
 * thumb service rejects a hand-edited width with a 400 — the URL has to be one
 * it generated. `pithumbsize` asks it to generate the size we want, and it
 * quietly returns a smaller unscaled image when the original is smaller.
 */
async function lookup(city: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: String(THUMB_WIDTH),
    titles: city.trim(),
    redirects: "1",
    format: "json",
    formatversion: "2",
    // Anonymous CORS, needed when the app runs as the Expo web build.
    origin: "*",
  });

  const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return null;

  const data: {
    query?: { pages?: { missing?: boolean; thumbnail?: { source?: string } }[] };
  } = await response.json();

  const page = data.query?.pages?.[0];
  if (!page || page.missing) return null;
  return page.thumbnail?.source ?? null;
}

/** Cached photo for a town, or null if unknown / not yet fetched. */
export function cityPhoto(city?: string | null): string | null {
  if (!city) return null;
  const entry = readCache()[normalise(city)];
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) return null;
  return entry.url === MISS ? null : entry.url;
}

/**
 * Fetch and cache a town's photo if we don't already have a fresh answer.
 * Safe to call on every render — concurrent calls for the same town share one
 * request, and failures are cached as misses so we don't hammer the API.
 */
export function ensureCityPhoto(city?: string | null): void {
  if (!city) return;
  const key = normalise(city);
  if (!key || inFlight.has(key)) return;

  const entry = readCache()[key];
  if (entry && Date.now() - entry.at <= TTL_MS) return;

  const task = lookup(city)
    .then((url) => {
      writeCache(key, url ?? MISS);
      return url;
    })
    .catch(() => {
      writeCache(key, MISS);
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, task);
}

/* ── Fallback styling, used while loading and whenever there is no photo ── */

const PALETTES: [string, string][] = [
  ["#0F4C3A", "#1F7A5C"],
  ["#123047", "#2E6F9E"],
  ["#4A2B12", "#9A5A25"],
  ["#2C1A4A", "#5C3B96"],
  ["#123B2A", "#2F7D52"],
  ["#3A1220", "#8A2F4A"],
  ["#14303A", "#2B6F80"],
  ["#3A3312", "#8A7A25"],
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Stable gradient for a town — the same place always gets the same colours. */
export function cityGradient(city?: string | null): [string, string] {
  return PALETTES[hash(normalise(city ?? "")) % PALETTES.length];
}

/** First letter, for the ghosted monogram behind a photoless ticket. */
export function cityInitial(city?: string | null): string {
  const first = (city ?? "").trim().charAt(0);
  return first ? first.toUpperCase() : "?";
}
