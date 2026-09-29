import type { AppTheme } from "@/lib/theme";

export const OFM_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

type AnyLayer = Record<string, unknown> & {
  id: string;
  type: string;
  "source-layer"?: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
};

type AnyStyle = Record<string, unknown> & { layers?: AnyLayer[] };

const DROP_SOURCE_LAYERS = new Set([
  "poi",
  "housenumber",
  "aeroway",
  "mountain_peak",
  "transportation_name",
  "waterway",
]);

const KEEP_PLACE_CLASSES = new Set([
  "continent",
  "country",
  "state",
  "city",
  "town",
]);

function isMajorRoad(layer: AnyLayer): boolean {
  const id = layer.id.toLowerCase();
  return (
    id.includes("motorway") ||
    id.includes("trunk") ||
    id.includes("primary") ||
    id.includes("major")
  );
}

function isCasing(layer: AnyLayer): boolean {
  return layer.id.toLowerCase().includes("casing");
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function tintStyle(style: AnyStyle, theme: AppTheme): AnyStyle {
  const dark = theme.mode === "dark";
  const water = dark ? "#0d1a16" : "#c3dcd0";
  const land = theme.color.bg;
  const park = theme.color.bgAlt;
  const building = dark ? "#1b201d" : "#cddcc7";
  const minorRoad = dark ? "#2a312c" : theme.color.line;
  const majorRoad = withAlpha(theme.color.primary, dark ? 0.45 : 0.38);
  const label = theme.color.textSoft;
  const halo = theme.color.bg;

  const layers: AnyLayer[] = [];

  for (const original of style.layers ?? []) {
    const layer: AnyLayer = {
      ...original,
      paint: { ...(original.paint ?? {}) },
      layout: { ...(original.layout ?? {}) },
    };
    const src = layer["source-layer"];

    if (layer.type === "background") {
      layer.paint!["background-color"] = land;
      layers.push(layer);
      continue;
    }

    if (src && DROP_SOURCE_LAYERS.has(src)) continue;

    if (src === "boundary") {
      const filter = JSON.stringify(layer.filter ?? "");
      if (!filter.includes("admin_level") && !layer.id.includes("country")) {
        continue;
      }
      layer.paint!["line-color"] = withAlpha(theme.color.muted, 0.5);
      layers.push(layer);
      continue;
    }

    if (src === "water" || src === "water_name") {
      if (layer.type === "fill") layer.paint!["fill-color"] = water;
      if (layer.type === "line") layer.paint!["line-color"] = water;
      if (layer.type === "symbol") {
        layer.paint!["text-color"] = label;
        layer.paint!["text-halo-color"] = halo;
      }
      layers.push(layer);
      continue;
    }

    if (src === "park") {
      if (layer.type === "fill") layer.paint!["fill-color"] = park;
      if (layer.type === "line") continue;
      if (layer.type === "symbol") continue;
      layers.push(layer);
      continue;
    }

    if (src === "landcover" || src === "landuse") {
      if (layer.type !== "fill") continue;
      layer.paint!["fill-color"] = park;
      layer.paint!["fill-opacity"] = 0.55;
      layers.push(layer);
      continue;
    }

    if (src === "building") {
      if (layer.type !== "fill") continue;
      layer.paint!["fill-color"] = building;
      layer.paint!["fill-opacity"] = 0.5;
      layers.push(layer);
      continue;
    }

    if (src === "transportation") {
      if (isCasing(layer)) continue;
      const colour = isMajorRoad(layer) ? majorRoad : minorRoad;
      if (layer.type === "line") layer.paint!["line-color"] = colour;
      if (layer.type === "fill") layer.paint!["fill-color"] = colour;
      layers.push(layer);
      continue;
    }

    if (src === "place") {
      const filter = JSON.stringify(layer.filter ?? "");
      const named = [...KEEP_PLACE_CLASSES].some((c) => filter.includes(c));
      const byId = [...KEEP_PLACE_CLASSES].some((c) => layer.id.includes(c));
      if (!named && !byId) continue;
      layer.paint!["text-color"] = label;
      layer.paint!["text-halo-color"] = halo;
      layer.paint!["text-halo-width"] = 1.4;
      layers.push(layer);
      continue;
    }

    if (layer.type === "symbol") continue;

    layers.push(layer);
  }

  return { ...style, layers };
}

let cached: AnyStyle | null = null;

export async function loadBaseStyle(signal?: AbortSignal): Promise<AnyStyle> {
  if (cached) return cached;
  const response = await fetch(OFM_STYLE_URL, { signal });
  if (!response.ok) throw new Error(`style ${response.status}`);
  cached = (await response.json()) as AnyStyle;
  return cached;
}
