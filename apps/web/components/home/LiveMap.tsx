"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styled, { useTheme } from "styled-components";
import {
  Map as MapLibreMap,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HOME_COPY } from "@/lib/home/copy";
import { loadBaseStyle, tintStyle } from "@/lib/home/mapStyle";
import {
  arcsGeoJson,
  buildMapModel,
  carsGeoJson,
  pinsGeoJson,
  type MapModel,
} from "@/lib/home/mapData";
import { KENYA_BBOX, bearingAt, boundsOf, pointAt } from "@/lib/home/geometry";
import type { HomeItem } from "@/lib/home/search";
import { MapTeaser } from "./MapTeaser";

const Wrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  .maplibregl-ctrl-attrib {
    font-size: ${({ theme }) => theme.type.micro};
    background: ${({ theme }) => theme.color.surface}cc;
  }
  .maplibregl-ctrl-attrib a {
    color: ${({ theme }) => theme.color.textSoft};
  }
  canvas:focus-visible {
    outline: 3px solid ${({ theme }) => theme.color.primary};
    outline-offset: -3px;
  }
`;

const Canvas = styled.div`
  position: absolute;
  inset: 0;
`;

const Scrim = styled.button`
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: end center;
  padding-bottom: 46px;
  font: inherit;

  span {
    padding: 6px 12px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.color.surface}e6;
    border: 1px solid ${({ theme }) => theme.color.line};
    color: ${({ theme }) => theme.color.textSoft};
    font-size: ${({ theme }) => theme.type.label};
    font-weight: 600;
    opacity: 0;
    transition: opacity 0.18s ease;
  }
  &:hover span,
  &:focus-visible span {
    opacity: 1;
  }
`;

const CAR_SIZE = 26;

function carImage(fill: string, ink: string): ImageData | null {
  if (typeof document === "undefined") return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = CAR_SIZE * dpr;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(dpr, dpr);
  const c = CAR_SIZE / 2;

  ctx.beginPath();
  ctx.arc(c, c, c - 1, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(c, c - 6.5);
  ctx.lineTo(c + 4.4, c + 6);
  ctx.lineTo(c, c + 3.4);
  ctx.lineTo(c - 4.4, c + 6);
  ctx.closePath();
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

export function LiveMap({
  items,
  hoveredId,
  onHover,
  fitKey,
  animate,
}: {
  items: HomeItem[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  fitKey: number;
  animate: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [interactive, setInteractive] = useState(false);

  const model: MapModel = useMemo(() => buildMapModel(items), [items]);
  const modelRef = useRef(model);
  modelRef.current = model;

  const hoverRef = useRef<string | null>(null);
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let created: MapLibreMap | null = null;
    let cancelled = false;
    const controller = new AbortController();

    loadBaseStyle(controller.signal)
      .then((base) => {
        if (cancelled || !containerRef.current) return;

        const map = new MapLibreMap({
          container: containerRef.current,
          style: tintStyle(base, theme) as never,
          bounds: KENYA_BBOX,
          fitBoundsOptions: { padding: 24 },
          maxBounds: [
            [32.5, -6.0],
            [43.2, 6.6],
          ],
          scrollZoom: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: { compact: true },
          fadeDuration: 0,
        });

        created = map;
        mapRef.current = map;
        map.on("error", () => setFailed(true));
        map.on("load", () => {
          if (cancelled) return;
          setReady(true);
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
      created?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const image = carImage(theme.color.primary, theme.color.onPrimary);
    if (image && !map.hasImage("kip-car")) {
      map.addImage("kip-car", image, {
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      });
    }

    const empty = { type: "FeatureCollection", features: [] } as never;

    if (!map.getSource("kip-arcs")) {
      map.addSource("kip-arcs", { type: "geojson", data: empty });
    }
    if (!map.getSource("kip-pins")) {
      map.addSource("kip-pins", {
        type: "geojson",
        data: empty,
        promoteId: "pinKey",
      });
    }
    if (!map.getSource("kip-cars")) {
      map.addSource("kip-cars", { type: "geojson", data: empty });
    }

    if (!map.getLayer("kip-arc-glow")) {
      map.addLayer({
        id: "kip-arc-glow",
        type: "line",
        source: "kip-arcs",
        paint: {
          "line-color": theme.color.primary,
          "line-width": 6,
          "line-opacity": 0.14,
          "line-blur": 3,
        },
      });
    }
    if (!map.getLayer("kip-arc")) {
      map.addLayer({
        id: "kip-arc",
        type: "line",
        source: "kip-arcs",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["get", "live"], false],
            theme.tone.lime.bg,
            theme.color.primary,
          ],
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });
    }
    if (!map.getLayer("kip-pin-halo")) {
      map.addLayer({
        id: "kip-pin-halo",
        type: "circle",
        source: "kip-pins",
        paint: {
          "circle-color": theme.color.primary,
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.22,
            0,
          ],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            18,
            10,
          ],
        },
      });
    }
    if (!map.getLayer("kip-pin")) {
      map.addLayer({
        id: "kip-pin",
        type: "circle",
        source: "kip-pins",
        paint: {
          "circle-color": [
            "match",
            ["get", "role"],
            "from",
            theme.color.primary,
            theme.color.dangerText,
          ],
          "circle-stroke-color": theme.color.surface,
          "circle-stroke-width": 2,
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            9,
            6,
          ],
        },
      });
    }
    if (!map.getLayer("kip-pin-label")) {
      map.addLayer({
        id: "kip-pin-label",
        type: "symbol",
        source: "kip-pins",
        minzoom: 6.2,
        layout: {
          "text-field": ["get", "town"],
          "text-size": 11,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": theme.color.text,
          "text-halo-color": theme.color.bg,
          "text-halo-width": 1.4,
        },
      });
    }
    if (!map.getLayer("kip-car")) {
      map.addLayer({
        id: "kip-car",
        type: "symbol",
        source: "kip-cars",
        layout: {
          "icon-image": "kip-car",
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-size": 0.8,
        },
      });
    }

    const handleMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const raw = feature.properties?.itemIds as string | undefined;
      if (!raw) return;
      try {
        const ids = JSON.parse(raw) as string[];
        onHoverRef.current(ids[0] ?? null);
      } catch {
        /* malformed property — ignore */
      }
      map.getCanvas().style.cursor = "pointer";
    };

    const handleLeave = () => {
      onHoverRef.current(null);
      map.getCanvas().style.cursor = "";
    };

    const handleClick = (event: MapLayerMouseEvent) => {
      const raw = event.features?.[0]?.properties?.itemIds as string | undefined;
      if (!raw) return;
      try {
        const ids = JSON.parse(raw) as string[];
        const id = ids[0];
        if (!id) return;
        const item = modelRef.current.resolved.find((r) => r.item.id === id);
        const suffix = item?.item.kind === "request" ? "?kind=request" : "";
        routerRef.current.push(`/ride/${id}${suffix}`);
      } catch {
        /* malformed property — ignore */
      }
    };

    map.on("mousemove", "kip-pin", handleMove);
    map.on("mouseleave", "kip-pin", handleLeave);
    map.on("click", "kip-pin", handleClick);

    return () => {
      map.off("mousemove", "kip-pin", handleMove);
      map.off("mouseleave", "kip-pin", handleLeave);
      map.off("click", "kip-pin", handleClick);
    };
  }, [ready, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const arcs = map.getSource("kip-arcs") as GeoJSONSource | undefined;
    const pins = map.getSource("kip-pins") as GeoJSONSource | undefined;
    arcs?.setData(arcsGeoJson(model.arcs) as never);
    pins?.setData(pinsGeoJson(model.pins) as never);
  }, [ready, model]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const previous = hoverRef.current;
    if (previous) {
      map.removeFeatureState({ source: "kip-pins", id: previous }, "hover");
    }

    const key = hoveredId ? model.pinKeyByItemId.get(hoveredId) : null;
    if (key) {
      map.setFeatureState({ source: "kip-pins", id: key }, { hover: true });
    }
    hoverRef.current = key ?? null;
  }, [ready, hoveredId, model]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || fitKey === 0) return;

    const bounds = boundsOf(model.resolved);
    if (!bounds) {
      map.fitBounds(KENYA_BBOX, { padding: 24, duration: 700 });
      return;
    }

    const [[w, s], [e, n]] = bounds;
    if (w === e && s === n) {
      map.flyTo({ center: [w, s], zoom: 8, essential: true });
      return;
    }

    map.fitBounds(bounds, {
      padding: { top: 40, bottom: 56, left: 48, right: 48 },
      maxZoom: 8.5,
      duration: 900,
      essential: true,
    });
  }, [ready, fitKey, model]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const cars = map.getSource("kip-cars") as GeoJSONSource | undefined;
    if (!cars) return;

    const arcs = model.arcs;
    if (arcs.length === 0) {
      cars.setData({ type: "FeatureCollection", features: [] } as never);
      return;
    }

    const progress = arcs.map((_, i) => (i * 0.37) % 1);

    if (!animate) {
      const parked = arcs.map(() => 0.5);
      cars.setData(carsGeoJson(arcs, parked, pointAt, bearingAt) as never);
      map.setPaintProperty("kip-arc", "line-dasharray", [1, 0]);
      return;
    }

    const DASHES: Array<[number, number]> = [
      [0, 4],
      [1, 3],
      [2, 2],
      [3, 1],
      [4, 0],
      [0, 1, 3, 0],
    ].slice(0, 5) as Array<[number, number]>;

    let frame = 0;
    let dashIndex = 0;
    let lastDash = 0;
    let last = performance.now();
    let visible = true;
    let onScreen = true;

    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    if (containerRef.current) observer.observe(containerRef.current);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = now - last;
      if (dt < 33) return;
      last = now;
      if (!visible || !onScreen) return;

      for (let i = 0; i < arcs.length; i += 1) {
        progress[i] = (progress[i] + dt / arcs[i].durationMs) % 1;
      }
      cars.setData(carsGeoJson(arcs, progress, pointAt, bearingAt) as never);

      if (now - lastDash > 55) {
        lastDash = now;
        dashIndex = (dashIndex + 1) % DASHES.length;
        map.setPaintProperty("kip-arc", "line-dasharray", DASHES[dashIndex]);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ready, model, animate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    loadBaseStyle()
      .then((base) => map.setStyle(tintStyle(base, theme) as never, { diff: true }))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.mode]);

  if (failed) {
    return <MapTeaser label={HOME_COPY.mapUnavailable} />;
  }

  return (
    <Wrap>
      <Canvas ref={containerRef} />
      {!interactive && (
        <Scrim
          type="button"
          aria-label={HOME_COPY.mapHint}
          onClick={() => {
            setInteractive(true);
            mapRef.current?.scrollZoom.enable();
          }}
        >
          <span>{HOME_COPY.mapHint}</span>
        </Scrim>
      )}
    </Wrap>
  );
}
