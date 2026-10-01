"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styled, { useTheme } from "styled-components";
import { HOME_COPY } from "@/lib/home/copy";
import { loadGoogleMaps, mapStyleFor } from "@/lib/home/googleMap";
import { buildMapModel, type MapModel } from "@/lib/home/mapData";
import { KENYA_BBOX, bearingAt, boundsOf, pointAt } from "@/lib/home/geometry";
import type { HomeItem } from "@/lib/home/search";
import { MapTeaser } from "./MapTeaser";

const Wrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  .gm-style-cc,
  .gmnoprint {
    font-size: ${({ theme }) => theme.type.micro};
  }
`;

const Canvas = styled.div`
  position: absolute;
  inset: 0 0 44px;
`;

const Scrim = styled.button`
  position: absolute;
  inset: 0 0 70px;
  z-index: 2;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: start end;
  padding: 10px 12px;
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

const DART = "M 0,-7 L 4.6,6 L 0,3 L -4.6,6 Z";

const MIN_ZOOM = 6.2;
const MAX_ZOOM = 9;

function frame(
  maps: typeof google.maps,
  map: google.maps.Map,
  bounds: [[number, number], [number, number]],
) {
  const [[w, s], [e, n]] = bounds;
  if (w === e && s === n) {
    map.setCenter({ lat: s, lng: w });
    map.setZoom(8);
    return;
  }

  map.fitBounds(new maps.LatLngBounds({ lat: s, lng: w }, { lat: n, lng: e }), {
    top: 28,
    bottom: 64,
    left: 48,
    right: 48,
  });

  maps.event.addListenerOnce(map, "idle", () => {
    const zoom = map.getZoom() ?? MIN_ZOOM;
    if (zoom < MIN_ZOOM) map.setZoom(MIN_ZOOM);
    else if (zoom > MAX_ZOOM) map.setZoom(MAX_ZOOM);
  });
}

type Layers = {
  arcs: google.maps.Polyline[];
  glows: google.maps.Polyline[];
  cars: google.maps.Marker[];
  pins: Map<string, google.maps.Marker>;
};

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
  const mapsRef = useRef<typeof google.maps | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const layersRef = useRef<Layers>({ arcs: [], glows: [], cars: [], pins: new Map() });

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [interactive, setInteractive] = useState(false);

  const model: MapModel = useMemo(() => buildMapModel(items), [items]);
  const modelRef = useRef(model);
  modelRef.current = model;

  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const map = new maps.Map(containerRef.current, {
          center: { lat: 0.2, lng: 37.9 },
          zoom: 6,
          disableDefaultUI: true,
          keyboardShortcuts: false,
          clickableIcons: false,
          gestureHandling: "none",
          styles: mapStyleFor(theme),
          restriction: {
            latLngBounds: { north: 6.6, south: -6.0, west: 32.5, east: 43.2 },
            strictBounds: false,
          },
        });

        frame(maps, map, KENYA_BBOX);

        mapsRef.current = maps;
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      const layers = layersRef.current;
      for (const line of [...layers.arcs, ...layers.glows]) line.setMap(null);
      for (const car of layers.cars) car.setMap(null);
      for (const pin of layers.pins.values()) pin.setMap(null);
      layersRef.current = { arcs: [], glows: [], cars: [], pins: new Map() };
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setOptions({ styles: mapStyleFor(theme) });
  }, [ready, theme]);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!maps || !map || !ready) return;

    const layers = layersRef.current;
    for (const line of [...layers.arcs, ...layers.glows]) line.setMap(null);
    for (const car of layers.cars) car.setMap(null);
    for (const pin of layers.pins.values()) pin.setMap(null);

    const glows: google.maps.Polyline[] = [];
    const arcs: google.maps.Polyline[] = [];
    const cars: google.maps.Marker[] = [];
    const pins = new Map<string, google.maps.Marker>();

    for (const arc of model.arcs) {
      const path = arc.cache.points.map(([lng, lat]) => ({ lat, lng }));
      const stroke = arc.live ? theme.color.primary : theme.color.outline;

      glows.push(
        new maps.Polyline({
          map,
          path,
          clickable: false,
          strokeColor: stroke,
          strokeOpacity: 0.16,
          strokeWeight: 8,
          zIndex: 1,
        }),
      );
      arcs.push(
        new maps.Polyline({
          map,
          path,
          clickable: false,
          strokeColor: stroke,
          strokeOpacity: 0,
          zIndex: 2,
          icons: [
            {
              icon: {
                path: "M 0,-1 0,1",
                strokeColor: stroke,
                strokeOpacity: 0.95,
                strokeWeight: 2,
                scale: 3,
              },
              offset: "0",
              repeat: "16px",
            },
          ],
        }),
      );

      cars.push(
        new maps.Marker({
          map,
          position: path[0],
          clickable: false,
          zIndex: 4,
          icon: {
            path: DART,
            fillColor: theme.color.primary,
            fillOpacity: 1,
            strokeColor: theme.color.surface,
            strokeWeight: 1.5,
            scale: 1,
            rotation: 0,
            anchor: new maps.Point(0, 0),
          },
        }),
      );
    }

    for (const pin of model.pins) {
      const origin = pin.role === "from";
      const marker = new maps.Marker({
        map,
        position: { lat: pin.lat, lng: pin.lng },
        title: pin.town,
        zIndex: 5,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          fillColor: origin ? theme.color.primary : theme.color.tertiary,
          fillOpacity: 1,
          strokeColor: theme.color.surface,
          strokeWeight: 2,
          scale: 6,
          labelOrigin: new maps.Point(0, 3.1),
        },
        label: {
          text: pin.town,
          color: theme.color.text,
          fontSize: "11px",
          fontWeight: "700",
        },
      });

      marker.addListener("mouseover", () => onHoverRef.current(pin.itemIds[0] ?? null));
      marker.addListener("mouseout", () => onHoverRef.current(null));
      marker.addListener("click", () => {
        const id = pin.itemIds[0];
        if (!id) return;
        const entry = modelRef.current.resolved.find((r) => r.item.id === id);
        const suffix = entry?.item.kind === "request" ? "?kind=request" : "";
        routerRef.current.push(`/ride/${id}${suffix}`);
      });

      pins.set(pin.key, marker);
    }

    layersRef.current = { arcs, glows, cars, pins };

    return () => {
      for (const line of [...arcs, ...glows]) line.setMap(null);
      for (const car of cars) car.setMap(null);
      for (const pin of pins.values()) pin.setMap(null);
    };
  }, [ready, model, theme]);

  useEffect(() => {
    if (!ready) return;
    const pins = layersRef.current.pins;
    const key = hoveredId ? model.pinKeyByItemId.get(hoveredId) : null;

    for (const [pinKey, marker] of pins) {
      const icon = marker.getIcon() as google.maps.Symbol | null;
      if (!icon) continue;
      const on = pinKey === key;
      marker.setIcon({ ...icon, scale: on ? 9.5 : 6 });
      marker.setZIndex(on ? 9 : 5);
    }
  }, [ready, hoveredId, model]);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!maps || !map || !ready) return;
    frame(maps, map, boundsOf(model.resolved) ?? KENYA_BBOX);
  }, [ready, fitKey, model]);

  useEffect(() => {
    if (!ready) return;
    const { arcs, cars } = layersRef.current;
    const entries = model.arcs;
    if (entries.length === 0) return;

    const progress = entries.map((_, i) => (i * 0.37) % 1);

    const place = () => {
      for (let i = 0; i < entries.length; i += 1) {
        const marker = cars[i];
        if (!marker) continue;
        const [lng, lat] = pointAt(entries[i].cache, progress[i]);
        const icon = marker.getIcon() as google.maps.Symbol;
        marker.setPosition({ lat, lng });
        marker.setIcon({ ...icon, rotation: bearingAt(entries[i].cache, progress[i]) });
      }
    };

    if (!animate) {
      for (let i = 0; i < progress.length; i += 1) progress[i] = 0.5;
      place();
      return;
    }

    let frame = 0;
    let last = performance.now();
    let dash = 0;
    let lastDash = 0;
    let visible = true;
    let onScreen = true;

    const observer = new IntersectionObserver(
      (entriesSeen) => {
        onScreen = entriesSeen[0]?.isIntersecting ?? true;
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

      for (let i = 0; i < entries.length; i += 1) {
        progress[i] = (progress[i] + dt / entries[i].durationMs) % 1;
      }
      place();

      if (now - lastDash > 70) {
        lastDash = now;
        dash = (dash + 2) % 16;
        for (const line of arcs) {
          const icons = line.get("icons") as google.maps.IconSequence[] | undefined;
          if (!icons?.length) continue;
          icons[0].offset = `${dash}px`;
          line.set("icons", icons);
        }
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ready, model, animate]);

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
            mapRef.current?.setOptions({ gestureHandling: "cooperative" });
          }}
        >
          <span>{HOME_COPY.mapHint}</span>
        </Scrim>
      )}
    </Wrap>
  );
}
