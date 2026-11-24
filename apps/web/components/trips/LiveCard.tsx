"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { NavigationArrow } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { etaAction } from "@/lib/trips/journey-actions";
import { kmBetween, type TripLocation } from "@/lib/trips/live";

const Body = styled.section`
  display: grid;
  gap: 6px;

  h2 {
    margin: 0;
    font-family: var(--font-manrope), ${({ theme }) => theme.fontHeading};
    font-size: clamp(22px, 3vw, 28px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
    color: ${nocturne.cream};
    font-variant-numeric: tabular-nums;
  }
  p {
    margin: 0;
    font-size: 14px;
    color: ${nocturne.muted};
  }
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  min-height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: ${nocturne.lime};
  color: ${nocturne.greenDeep};
  font-size: 13px;
  font-weight: 800;
`;

export type LegNow = { seconds: number; meters: number; at: number; fromLat: number; fromLng: number };

export function useLiveLeg(loc: TripLocation | null, destination: string): LegNow | null {
  const [leg, setLeg] = useState<LegNow | null>(null);
  const asked = useRef({ at: 0, to: "", lat: 0, lng: 0 });
  useEffect(() => {
    if (!loc || !destination) return;
    const t = Date.now();
    const last = asked.current;
    const elapsed = t - last.at;
    const moved = kmBetween(last.lat, last.lng, loc.lat, loc.lng);
    const due = last.to !== destination || elapsed >= 90000 || (elapsed >= 30000 && moved >= 0.1);
    if (!due) return;
    asked.current = { at: t, to: destination, lat: loc.lat, lng: loc.lng };
    const from = { lat: loc.lat, lng: loc.lng };
    void etaAction(loc.lat, loc.lng, destination).then((r) => {
      if (r) setLeg({ seconds: r.seconds, meters: r.meters, at: Date.now(), fromLat: from.lat, fromLng: from.lng });
    });
  }, [loc, destination]);
  return leg;
}

export function legFromHere(leg: LegNow, car: { lat: number; lng: number }, target: { lat: number; lng: number }) {
  const then = kmBetween(leg.fromLat, leg.fromLng, target.lat, target.lng);
  const now = kmBetween(car.lat, car.lng, target.lat, target.lng);
  const share = then < 0.05 ? 1 : Math.min(1.5, Math.max(0, now / then));
  return { seconds: leg.seconds * share, meters: leg.meters * share };
}

export function useLiveEta(loc: TripLocation | null, destination: string) {
  return useLiveLeg(loc, destination)?.seconds ?? null;
}

export function legDuration(seconds: number): { hours: number; minutes: number } {
  const total = Math.max(1, Math.ceil(seconds / 60));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

export function legDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

function since(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

function duration(mins: number) {
  if (mins < 1) return "under a minute";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function LiveStatus({
  from,
  to,
  loc,
  eta,
}: {
  from: string;
  to: string;
  loc: TripLocation | null;
  eta: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const stale = loc ? now - new Date(loc.updated_at).getTime() > 3 * 60 * 1000 : false;

  return (
    <Body aria-live="polite">
      <Tag>
        <NavigationArrow size={14} weight="bold" /> On the way
      </Tag>
      <h2>
        {!loc
          ? "Waiting for the driver's location"
          : stale
            ? "Driver's location paused"
            : eta != null
              ? `Arriving in ${duration(eta / 60)}`
              : "Driver is on the move"}
      </h2>
      <p>
        {from} to {to}
        {loc ? ` · updated ${since(loc.updated_at, now)}` : ""}
      </p>
    </Body>
  );
}
