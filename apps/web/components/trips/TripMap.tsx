"use client";

import { useEffect, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";
import { Crosshair, Minus, Plus } from "@/components/icons";
import { loadGoogleMaps, mapStyle, token } from "@/lib/maps/google";
import { dur, ease, nocturne } from "@/lib/nocturne";
import type { TripLocation } from "@/lib/trips/live";

const INK_FALLBACK = "#14231d";
const HALO_FALLBACK = "#ffffff";

const Frame = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
  overflow: hidden;
  background: ${nocturne.surface3};

  > .host {
    position: absolute;
    inset: 0;
  }

  .kp-pin {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    align-items: stretch;
    transform: translate(-50%, calc(-100% - 14px));
    white-space: nowrap;
    border-radius: 4px;
    overflow: hidden;
    background: ${nocturne.surface};
    color: ${nocturne.cream};
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: ${nocturne.panelShadow};
    pointer-events: none;
  }
  .kp-pin b {
    display: grid;
    place-items: center;
    padding: 4px 8px;
    background: ${nocturne.ink};
    color: ${nocturne.surface};
    font-size: 13px;
    font-weight: 800;
    line-height: 1.05;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .kp-pin span {
    display: flex;
    align-items: center;
    padding: 8px 12px;
  }
  .kp-car {
    position: absolute;
    left: 0;
    top: 0;
    display: none;
    will-change: transform;
  }
  .kp-car > i {
    display: block;
    width: 22px;
    height: 48px;
    margin: -24px 0 0 -11px;
    background: url(/map/car.svg) center / contain no-repeat;
    filter: drop-shadow(0 3px 4px color-mix(in oklab, ${nocturne.ink} 35%, transparent));
    transition: rotate 600ms ${ease.standard};
  }
  .kp-me {
    position: absolute;
    left: 0;
    top: 0;
    width: 18px;
    height: 18px;
    margin: -9px 0 0 -9px;
    border-radius: 50%;
    background: ${nocturne.accent};
    border: 3px solid ${nocturne.surface};
    box-shadow: 0 0 0 8px color-mix(in oklab, ${nocturne.accent} 22%, transparent);
  }
`;

const Controls = styled.div`
  position: absolute;
  right: 12px;
  bottom: 28px;
  display: grid;
  gap: 8px;
  z-index: 2;

  @media (max-width: 899px) {
    top: 68px;
    bottom: auto;
  }
`;

const Zoom = styled.div`
  display: grid;
  border-radius: 12px;
  overflow: hidden;
  background: ${nocturne.surface};
  box-shadow: ${nocturne.panelShadow};

  > button + button {
    border-top: 1px solid ${nocturne.line};
  }
`;

const Ctl = styled.button<{ $on?: boolean }>`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: ${({ $on }) => ($on ? nocturne.accent : nocturne.surface)};
  color: ${({ $on }) => ($on ? nocturne.onGreen : nocturne.cream)};
  cursor: pointer;
  transition:
    background-color ${dur.state} ${ease.standard},
    transform ${dur.press} ${ease.standard};

  &:active {
    transform: scale(0.97);
  }
  &:focus-visible {
    outline: 3px solid ${nocturne.accent};
    outline-offset: -3px;
  }
`;

const Locate = styled(Ctl)`
  border-radius: 12px;
  box-shadow: ${nocturne.panelShadow};
`;

type Mover = { move: (p: google.maps.LatLngLiteral, heading: number | null) => void };
type Spot = { set: (p: google.maps.LatLngLiteral) => void };

function bearing(a: google.maps.LatLng, b: google.maps.LatLng) {
  const r = Math.PI / 180;
  const y = Math.sin((b.lng() - a.lng()) * r) * Math.cos(b.lat() * r);
  const x =
    Math.cos(a.lat() * r) * Math.sin(b.lat() * r) -
    Math.sin(a.lat() * r) * Math.cos(b.lat() * r) * Math.cos((b.lng() - a.lng()) * r);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function pinHtml(lead: string | null, text: string) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `${lead ? `<b>${esc(lead).replace(" ", "<br>")}</b>` : ""}<span>${esc(text)}</span>`;
}

export default function TripMap({
  polyline,
  car,
  fromLabel,
  toLabel,
  fromLead,
  toLead,
  follow = false,
  padding,
  shift = 0,
  onboard = false,
}: {
  polyline: string;
  car?: TripLocation | null;
  fromLabel: string;
  toLabel: string;
  fromLead?: string | null;
  toLead?: string | null;
  follow?: boolean;
  padding?: google.maps.Padding;
  shift?: number;
  onboard?: boolean;
}) {
  const onboardRef = useRef(onboard);
  onboardRef.current = onboard;
  const driverSeen = useRef(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const carRef = useRef<Mover | null>(null);
  const meRef = useRef<Spot | null>(null);
  const fromPin = useRef<HTMLDivElement | null>(null);
  const toPin = useRef<HTMLDivElement | null>(null);
  const watchRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const padRef = useRef(padding);
  padRef.current = padding;
  const dark = useTheme().mode === "dark";
  const darkRef = useRef(dark);
  darkRef.current = dark;
  const paintRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => paintRef.current?.());
    return () => cancelAnimationFrame(frame);
  }, [dark, ready]);

  const followRef = useRef(follow);
  followRef.current = follow;
  const fitRef = useRef<(() => void) | null>(null);
  const padKey = padding ? `${padding.top}|${padding.right}|${padding.bottom}|${padding.left}` : "";

  useEffect(() => {
    if (!ready || followRef.current) return;
    fitRef.current?.();
  }, [padKey, ready]);
  const shiftRef = useRef(shift);
  const appliedShift = useRef(0);

  useEffect(() => {
    shiftRef.current = shift;
    const m = mapRef.current;
    if (!m || !ready) return;
    const delta = shift - appliedShift.current;
    appliedShift.current = shift;
    if (delta !== 0) m.panBy(delta / 2, 0);
  }, [shift, ready]);

  useEffect(() => {
    let dead = false;
    let anim = 0;
    let resize: ResizeObserver | null = null;

    loadGoogleMaps()
      .then((g) => {
        if (dead || !hostRef.current) return;
        const path = g.maps.geometry.encoding.decodePath(polyline);
        if (path.length < 2) return;

        const ink = token("--n-ink", INK_FALLBACK);
        const halo = token("--n-surface", HALO_FALLBACK);

        const map = new g.maps.Map(hostRef.current, {
          styles: mapStyle(darkRef.current),
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          keyboardShortcuts: false,
        });
        mapRef.current = map;

        const haloLine = new g.maps.Polyline({ map, path, strokeColor: halo, strokeWeight: 8, zIndex: 1 });
        const inkLine = new g.maps.Polyline({ map, path, strokeColor: ink, strokeWeight: 4, zIndex: 2 });
        const startIcon = (fill: string, edge: string): google.maps.Symbol => ({
          path: g.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: fill,
          fillOpacity: 1,
          strokeColor: edge,
          strokeWeight: 4,
        });
        const endIcon = (fill: string, edge: string): google.maps.Symbol => ({
          path: "M -6 -6 L 6 -6 L 6 6 L -6 6 Z",
          fillColor: fill,
          fillOpacity: 1,
          strokeColor: edge,
          strokeWeight: 3,
        });
        const startMark = new g.maps.Marker({
          map,
          position: path[0],
          zIndex: 3,
          clickable: false,
          icon: startIcon(halo, ink),
        });
        const endMark = new g.maps.Marker({
          map,
          position: path[path.length - 1],
          zIndex: 3,
          clickable: false,
          icon: endIcon(ink, halo),
        });
        paintRef.current = () => {
          const nextInk = token("--n-ink", INK_FALLBACK);
          const nextHalo = token("--n-surface", HALO_FALLBACK);
          map.setOptions({ styles: mapStyle(darkRef.current) });
          haloLine.setOptions({ strokeColor: nextHalo });
          inkLine.setOptions({ strokeColor: nextInk });
          startMark.setIcon(startIcon(nextHalo, nextInk));
          endMark.setIcon(endIcon(nextInk, nextHalo));
        };

        class Html extends g.maps.OverlayView {
          constructor(public el: HTMLElement, public pos: google.maps.LatLng | null, public pane: "floatPane" | "overlayMouseTarget") {
            super();
          }
          onAdd() {
            this.getPanes()?.[this.pane].appendChild(this.el);
          }
          draw() {
            if (!this.pos) return;
            const pt = this.getProjection()?.fromLatLngToDivPixel(this.pos);
            if (pt) this.el.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0)`;
          }
          onRemove() {
            this.el.remove();
          }
        }

        class PinView extends Html {
          draw() {
            if (!this.pos) return;
            const pt = this.getProjection()?.fromLatLngToDivPixel(this.pos);
            if (pt) this.el.style.translate = `${pt.x}px ${pt.y}px`;
          }
        }

        const mkPin = (pos: google.maps.LatLng) => {
          const el = document.createElement("div");
          el.className = "kp-pin";
          new PinView(el, pos, "floatPane").setMap(map);
          return el;
        };
        fromPin.current = mkPin(path[0]);
        toPin.current = mkPin(path[path.length - 1]);

        const carEl = document.createElement("div");
        carEl.className = "kp-car";
        const body = document.createElement("i");
        carEl.appendChild(body);
        const carView = new Html(carEl, null, "overlayMouseTarget");
        carView.setMap(map);
        carRef.current = {
          move(p, heading) {
            const target = new g.maps.LatLng(p);
            const from = carView.pos;
            const turn = heading ?? (from && !from.equals(target) ? bearing(from, target) : null);
            if (turn != null) body.style.rotate = `${turn}deg`;
            carEl.style.display = "block";
            cancelAnimationFrame(anim);
            if (!from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              carView.pos = target;
              carView.draw();
              return;
            }
            const t0 = performance.now();
            const step = (now: number) => {
              const k = Math.min(1, (now - t0) / 1000);
              const e = 1 - Math.pow(1 - k, 3);
              carView.pos = new g.maps.LatLng(
                from.lat() + (target.lat() - from.lat()) * e,
                from.lng() + (target.lng() - from.lng()) * e,
              );
              carView.draw();
              if (k < 1) anim = requestAnimationFrame(step);
            };
            anim = requestAnimationFrame(step);
          },
        };

        const meEl = document.createElement("div");
        meEl.className = "kp-me";
        meEl.style.display = "none";
        const meView = new Html(meEl, null, "overlayMouseTarget");
        meView.setMap(map);
        meRef.current = {
          set(p) {
            meView.pos = new g.maps.LatLng(p);
            meEl.style.display = "block";
            meView.draw();
          },
        };

        const bounds = new g.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        const fit = () => map.fitBounds(bounds, padRef.current ?? { top: 72, right: 72, bottom: 72, left: 72 });
        fitRef.current = fit;
        fit();
        let lastW = hostRef.current.offsetWidth;
        let settle: ReturnType<typeof setTimeout> | undefined;
        resize = new ResizeObserver(([entry]) => {
          const w = Math.round(entry.contentRect.width);
          if (Math.abs(w - lastW) < 8) return;
          lastW = w;
          clearTimeout(settle);
          settle = setTimeout(() => {
            if (followRef.current) return;
            fit();
            if (shiftRef.current) map.panBy(shiftRef.current / 2, 0);
          }, 200);
        });
        resize.observe(hostRef.current);
        setReady(true);
      })
      .catch(() => {});

    return () => {
      dead = true;
      resize?.disconnect();
      cancelAnimationFrame(anim);
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      carRef.current = null;
      meRef.current = null;
      mapRef.current = null;
      setReady(false);
    };
  }, [polyline]);

  useEffect(() => {
    if (!ready) return;
    if (fromPin.current) fromPin.current.innerHTML = pinHtml(fromLead ?? null, `From ${fromLabel}`);
    if (toPin.current) toPin.current.innerHTML = pinHtml(toLead ?? null, `To ${toLabel}`);
  }, [ready, fromLabel, toLabel, fromLead, toLead]);

  useEffect(() => {
    if (!car || !ready) return;
    driverSeen.current = true;
    carRef.current?.move({ lat: car.lat, lng: car.lng }, car.heading);
    if (follow) mapRef.current?.panTo({ lat: car.lat, lng: car.lng });
  }, [car, ready, follow]);

  function locate() {
    if (!("geolocation" in navigator)) return;
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      setLocating(false);
      return;
    }
    setLocating(true);
    let first = true;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (onboardRef.current && !driverSeen.current) {
          const h = pos.coords.heading;
          carRef.current?.move(p, h != null && Number.isFinite(h) ? h : null);
        } else {
          meRef.current?.set(p);
        }
        if (first) {
          first = false;
          mapRef.current?.panTo(p);
        }
      },
      () => {
        if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  }

  const zoom = (d: number) => {
    const m = mapRef.current;
    if (m) m.setZoom((m.getZoom() ?? 10) + d);
  };

  return (
    <Frame role="region" aria-label={`Map of the route from ${fromLabel} to ${toLabel}`}>
      <div className="host" ref={hostRef} />
      {ready && (
        <Controls>
          <Locate type="button" $on={locating} aria-pressed={locating} aria-label={locating ? "Hide my location" : "Show my location"} onClick={locate}>
            <Crosshair size={20} />
          </Locate>
          <Zoom>
            <Ctl type="button" aria-label="Zoom in" onClick={() => zoom(1)}>
              <Plus size={20} />
            </Ctl>
            <Ctl type="button" aria-label="Zoom out" onClick={() => zoom(-1)}>
              <Minus size={20} />
            </Ctl>
          </Zoom>
        </Controls>
      )}
    </Frame>
  );
}
