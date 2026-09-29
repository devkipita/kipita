/**
 * Destination imagery for trip tickets, from Wikipedia's Action API — keyless,
 * free and cacheable. The web port of `apps/mobile/src/lib/utils/cityImage.ts`.
 *
 * Deliberately not Google Places: its Photo API needs a billed key, forbids
 * caching the bytes and requires visible attribution.
 *
 * Every lookup is best-effort. Wikipedia's lead image is a lottery — some towns
 * give a skyline, others a locator map — so callers always keep the gradient
 * fallback below.
 */

const ENDPOINT = "https://en.wikipedia.org/w/api.php";
const THUMB_WIDTH = 800;
const DAY = 60 * 60 * 24;

function normalise(city: string): string {
  return city.trim().toLowerCase();
}

/**
 * Wikipedia titles a Kenyan town's article by the town alone, but our
 * `from_location` values carry neighbourhoods ("Nairobi CBD", "Nairobi
 * Westlands"). Try the full string first, then fall back to the leading word.
 */
function candidates(city: string): string[] {
  const clean = city.trim().replace(/\s+/g, " ");
  if (!clean) return [];

  const out = [clean];
  const head = clean.split(/[,\-–]/)[0]?.trim();
  if (head && head !== clean) out.push(head);
  const first = head?.split(" ")[0];
  if (first && first !== head) out.push(first);
  return [...new Set(out)];
}

async function lookup(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: String(THUMB_WIDTH),
    titles: title,
    redirects: "1",
    format: "json",
    formatversion: "2",
    origin: "*",
  });

  const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: { accept: "application/json" },
    next: { revalidate: DAY * 30 },
  });
  if (!response.ok) return null;

  const data: {
    query?: { pages?: { missing?: boolean; thumbnail?: { source?: string } }[] };
  } = await response.json();

  const page = data.query?.pages?.[0];
  if (!page || page.missing) return null;
  return page.thumbnail?.source ?? null;
}

const memo = new Map<string, string | null>();

export async function cityPhoto(city?: string | null): Promise<string | null> {
  if (!city) return null;
  const key = normalise(city);
  if (memo.has(key)) return memo.get(key) ?? null;

  for (const title of candidates(city)) {
    try {
      const url = await lookup(title);
      if (url) {
        memo.set(key, url);
        return url;
      }
    } catch {
      // A missing picture is never worth failing a page render for.
    }
  }

  memo.set(key, null);
  return null;
}

/** Resolve many towns at once, de-duplicated. */
export async function cityPhotos(
  cities: (string | null | undefined)[],
): Promise<Map<string, string | null>> {
  const unique = [...new Set(cities.filter(Boolean).map((c) => c as string))];
  const pairs = await Promise.all(
    unique.map(async (c) => [normalise(c), await cityPhoto(c)] as const),
  );
  return new Map(pairs);
}

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
