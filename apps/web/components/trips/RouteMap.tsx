"use client";

import dynamic from "next/dynamic";
import { Suspense, use } from "react";
import { Shimmer } from "@/components/ui/Shimmer";
import type { TripRoute } from "@/lib/maps/types";
import type { TripLocation } from "@/lib/trips/live";
import type { MapMe, MapPerson } from "./TripMap";

const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => <Shimmer $h="100%" $r="0" aria-hidden />,
});

type Props = {
  route: Promise<TripRoute | null>;
  car?: TripLocation | null;
  fromLabel: string;
  toLabel: string;
  etaSeconds?: number | null;
  follow?: boolean;
  padding?: google.maps.Padding;
  onboard?: boolean;
  bare?: boolean;
  people?: MapPerson[];
  me?: MapMe | null;
};

function short(secs: number) {
  const m = Math.max(1, Math.round(secs / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function Resolved({ route, etaSeconds, car, ...rest }: Props) {
  const r = use(route);
  if (!r) return null;
  const live = car != null && etaSeconds != null;
  return (
    <TripMap
      polyline={r.polyline}
      car={car}
      fromLead={live ? null : short(r.seconds)}
      toLead={live ? short(etaSeconds) : null}
      {...rest}
    />
  );
}

export function RouteMap(props: Props) {
  return (
    <Suspense fallback={<Shimmer $h="100%" $r="0" aria-hidden />}>
      <Resolved {...props} />
    </Suspense>
  );
}
