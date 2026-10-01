import { POPULAR_ROUTES } from "@kipita/shared";
import type { HomeItem } from "./search";
import {
  buildArcCache,
  resolveItemCoords,
  resolveRoute,
  routeKey,
  type ArcCache,
  type ResolvedItem,
} from "./geometry";

export const MAX_ARCS = 8;
const MIN_ARCS = 3;

export interface ArcEntry {
  key: string;
  fromName: string;
  toName: string;
  live: boolean;
  cache: ArcCache;
  durationMs: number;
}

export interface PinEntry {
  key: string;
  role: "from" | "to";
  town: string;
  lng: number;
  lat: number;
  itemIds: string[];
}

export interface MapModel {
  resolved: ResolvedItem[];
  unresolvedIds: Set<string>;
  arcs: ArcEntry[];
  pins: PinEntry[];
  pinKeyByItemId: Map<string, string>;
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

function durationFor(key: string): number {
  return 18000 + (hash(key) % 17) * 1000;
}

export function buildMapModel(items: HomeItem[]): MapModel {
  const resolved: ResolvedItem[] = [];
  const unresolvedIds = new Set<string>();

  for (const item of items) {
    const entry = resolveItemCoords(item);
    if (entry) resolved.push(entry);
    else unresolvedIds.add(item.id);
  }

  const pinMap = new Map<string, PinEntry>();
  const pinKeyByItemId = new Map<string, string>();

  for (const entry of resolved) {
    const ends: Array<{ role: "from" | "to"; name: string; lat: number; lng: number }> = [
      { role: "from", name: entry.fromName, lat: entry.from.lat, lng: entry.from.lng },
      { role: "to", name: entry.toName, lat: entry.to.lat, lng: entry.to.lng },
    ];

    for (const end of ends) {
      const key = end.name.toLowerCase();
      const existing = pinMap.get(key);
      if (existing) {
        if (!existing.itemIds.includes(entry.item.id)) {
          existing.itemIds.push(entry.item.id);
        }
        if (end.role === "from") existing.role = "from";
      } else {
        pinMap.set(key, {
          key,
          role: end.role,
          town: end.name,
          lat: end.lat,
          lng: end.lng,
          itemIds: [entry.item.id],
        });
      }
      if (end.role === "from") pinKeyByItemId.set(entry.item.id, key);
    }
  }

  const arcMap = new Map<string, ArcEntry>();

  for (const entry of resolved) {
    const key = routeKey(entry.fromName, entry.toName);
    if (arcMap.has(key)) continue;
    arcMap.set(key, {
      key,
      fromName: entry.fromName,
      toName: entry.toName,
      live: true,
      cache: buildArcCache(entry.from, entry.to),
      durationMs: durationFor(key),
    });
    if (arcMap.size >= MAX_ARCS) break;
  }

  if (arcMap.size < MIN_ARCS) {
    for (const route of POPULAR_ROUTES) {
      if (arcMap.size >= MAX_ARCS) break;
      const key = routeKey(route.from, route.to);
      if (arcMap.has(key)) continue;
      const geo = resolveRoute(route.from, route.to);
      if (!geo) continue;
      arcMap.set(key, {
        key,
        fromName: geo.fromName,
        toName: geo.toName,
        live: false,
        cache: buildArcCache(geo.from, geo.to),
        durationMs: durationFor(key),
      });
    }
  }

  return {
    resolved,
    unresolvedIds,
    arcs: [...arcMap.values()],
    pins: [...pinMap.values()],
    pinKeyByItemId,
  };
}

