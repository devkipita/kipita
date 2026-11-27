"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Check, NavigationArrow } from "@/components/icons";
import { nocturne } from "@/lib/nocturne";
import { formatClock } from "@/lib/trips/format";
import { etaAction } from "@/lib/trips/journey-actions";
import type { TripLocation } from "@/lib/trips/live";

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

export function useLiveEta(bookingId: string, car: TripLocation | null) {
  const [eta, setEta] = useState<number | null>(null);
  const asked = useRef(0);
  useEffect(() => {
    if (!car) {
      setEta(null);
      return;
    }
    const t = Date.now();
    if (t - asked.current < 60000) return;
    asked.current = t;
    void etaAction(bookingId).then((s) => {
      if (s != null) setEta(s);
    });
  }, [car, bookingId]);
  return eta;
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
        {!loc || stale ? " · Tap the location button to see where you are" : ""}
      </p>
    </Body>
  );
}

export function ArrivedStatus({
  from,
  to,
  at,
  approximate,
}: {
  from: string;
  to: string;
  at: string;
  approximate: boolean;
}) {
  return (
    <Body aria-live="polite">
      <Tag>
        <Check size={16} weight="bold" /> Arrived
      </Tag>
      <h2>You arrived at {formatClock(at)}</h2>
      <p>
        {from} to {to}
        {approximate ? " · place approximate" : ""}
      </p>
    </Body>
  );
}
