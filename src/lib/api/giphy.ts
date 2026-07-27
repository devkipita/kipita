/**
 * Lightweight Giphy search. Prefers EXPO_PUBLIC_GIPHY_KEY; falls back to Giphy's
 * long-standing public beta key so GIF sending works out of the box. Set your
 * own key in production for higher rate limits.
 */

// Public Giphy beta key — fine for development / low volume.
const PUBLIC_BETA_KEY = "dc6zaTOxFJmzC";
const GIPHY_KEY = process.env.EXPO_PUBLIC_GIPHY_KEY || PUBLIC_BETA_KEY;
const BASE = "https://api.giphy.com/v1/gifs";

export const isGiphyEnabled = GIPHY_KEY.length > 0;

export interface GifResult {
  id: string;
  /** Full-size GIF for sending. */
  url: string;
  /** Small downsized still/preview for the picker grid. */
  preview: string;
  width: number;
  height: number;
}

interface GiphyItem {
  id: string;
  images: {
    downsized: { url: string; width: string; height: string };
    fixed_width_small: { url: string };
    fixed_width: { url: string; width: string; height: string };
  };
}

function map(items: GiphyItem[]): GifResult[] {
  return items.map((g) => ({
    id: g.id,
    url: g.images.fixed_width?.url ?? g.images.downsized.url,
    preview: g.images.fixed_width_small?.url ?? g.images.downsized.url,
    width: Number(g.images.fixed_width?.width ?? g.images.downsized.width) || 200,
    height:
      Number(g.images.fixed_width?.height ?? g.images.downsized.height) || 200,
  }));
}

export async function trendingGifs(limit = 24): Promise<GifResult[]> {
  if (!isGiphyEnabled) return [];
  const res = await fetch(
    `${BASE}/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=pg-13`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  return map(json.data ?? []);
}

export async function searchGifs(query: string, limit = 24): Promise<GifResult[]> {
  if (!isGiphyEnabled) return [];
  if (!query.trim()) return trendingGifs(limit);
  const res = await fetch(
    `${BASE}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(
      query,
    )}&limit=${limit}&rating=pg-13`,
  );
  if (!res.ok) return [];
  const json = await res.json();
  return map(json.data ?? []);
}
