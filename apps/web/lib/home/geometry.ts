import { KENYA_BOUNDS, resolveTown, type LatLngLike } from "@kipita/shared";
import type { HomeItem } from "./search";

export type LngLat = [number, number];

export type CoordSource = "db" | "lookup";

export interface ResolvedItem {
  item: HomeItem;
  from: LatLngLike;
  to: LatLngLike;
  fromName: string;
  toName: string;
  source: CoordSource;
}

function pair(lat: number | null, lng: number | null): LatLngLike | null {
  if (lat === null || lng === null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export function resolveItemCoords(item: HomeItem): ResolvedItem | null {
  const dbFrom = pair(item.from_lat, item.from_lng);
  const dbTo = pair(item.to_lat, item.to_lng);

  if (dbFrom && dbTo) {
    return {
      item,
      from: dbFrom,
      to: dbTo,
      fromName: item.from_location,
      toName: item.to_location,
      source: "db",
    };
  }

  const fromTown = resolveTown(item.from_location);
  const toTown = resolveTown(item.to_location);
  if (!fromTown || !toTown) return null;

  return {
    item,
    from: { lat: fromTown.lat, lng: fromTown.lng },
    to: { lat: toTown.lat, lng: toTown.lng },
    fromName: fromTown.name,
    toName: toTown.name,
    source: "lookup",
  };
}

export function resolveRoute(
  from: string,
  to: string,
): { from: LatLngLike; to: LatLngLike; fromName: string; toName: string } | null {
  const a = resolveTown(from);
  const b = resolveTown(to);
  if (!a || !b) return null;
  return {
    from: { lat: a.lat, lng: a.lng },
    to: { lat: b.lat, lng: b.lng },
    fromName: a.name,
    toName: b.name,
  };
}

export interface ArcCache {
  points: LngLat[];
  cumulative: number[];
  lengthDeg: number;
}

export function arcPath(
  a: LatLngLike,
  b: LatLngLike,
  samples = 48,
  bow = 0.18,
): LngLat[] {
  const ax = a.lng;
  const ay = a.lat;
  const bx = b.lng;
  const by = b.lat;

  const dx = bx - ax;
  const dy = by - ay;
  const chord = Math.hypot(dx, dy);

  if (chord === 0) return [[ax, ay]];

  const sign = ax > bx ? -1 : 1;
  const nx = (-dy / chord) * sign;
  const ny = (dx / chord) * sign;

  const cx = (ax + bx) / 2 + nx * chord * bow;
  const cy = (ay + by) / 2 + ny * chord * bow;

  const points: LngLat[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const u = 1 - t;
    const x = u * u * ax + 2 * u * t * cx + t * t * bx;
    const y = u * u * ay + 2 * u * t * cy + t * t * by;
    points.push([x, y]);
  }
  return points;
}

export function buildArcCache(
  a: LatLngLike,
  b: LatLngLike,
  samples = 48,
  bow = 0.18,
): ArcCache {
  const points = arcPath(a, b, samples, bow);
  const cumulative: number[] = [0];
  let total = 0;

  for (let i = 1; i < points.length; i += 1) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    total += Math.hypot(x - px, y - py);
    cumulative.push(total);
  }

  if (total > 0) {
    for (let i = 0; i < cumulative.length; i += 1) cumulative[i] /= total;
  }

  return { points, cumulative, lengthDeg: total };
}

function segmentAt(cache: ArcCache, t: number): { i: number; local: number } {
  const clamped = Math.min(Math.max(t, 0), 1);
  const { cumulative } = cache;

  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= clamped) lo = mid;
    else hi = mid;
  }

  const span = cumulative[hi] - cumulative[lo];
  const local = span > 0 ? (clamped - cumulative[lo]) / span : 0;
  return { i: lo, local };
}

export function pointAt(cache: ArcCache, t: number): LngLat {
  const { points } = cache;
  if (points.length === 1) return points[0];

  const { i, local } = segmentAt(cache, t);
  const [ax, ay] = points[i];
  const [bx, by] = points[Math.min(i + 1, points.length - 1)];
  return [ax + (bx - ax) * local, ay + (by - ay) * local];
}

export function bearingAt(cache: ArcCache, t: number): number {
  const { points } = cache;
  if (points.length < 2) return 0;

  const { i } = segmentAt(cache, t);
  const [ax, ay] = points[i];
  const [bx, by] = points[Math.min(i + 1, points.length - 1)];

  const deg = (Math.atan2(bx - ax, by - ay) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export type Bounds = [[number, number], [number, number]];

export const KENYA_BBOX: Bounds = [
  [KENYA_BOUNDS.west, KENYA_BOUNDS.south],
  [KENYA_BOUNDS.east, KENYA_BOUNDS.north],
];

export function boundsOf(resolved: ResolvedItem[]): Bounds | null {
  if (resolved.length === 0) return null;

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const entry of resolved) {
    for (const point of [entry.from, entry.to]) {
      west = Math.min(west, point.lng);
      east = Math.max(east, point.lng);
      south = Math.min(south, point.lat);
      north = Math.max(north, point.lat);
    }
  }

  if (!Number.isFinite(west) || !Number.isFinite(south)) return null;
  return [
    [west, south],
    [east, north],
  ];
}

export function routeKey(from: string, to: string): string {
  return `${from.trim().toLowerCase()}|${to.trim().toLowerCase()}`;
}
