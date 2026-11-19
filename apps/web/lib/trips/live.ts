"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRowStream } from "./realtime";

export type TripLocation = {
  trip_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed_kmh: number | null;
  updated_at: string;
};

const KEY = (tripId: string) => `kipita:share-location:${tripId}`;

function read(tripId: string) {
  try {
    return localStorage.getItem(KEY(tripId)) === "1";
  } catch {
    return false;
  }
}

function write(tripId: string, on: boolean) {
  try {
    if (on) localStorage.setItem(KEY(tripId), "1");
    else localStorage.removeItem(KEY(tripId));
  } catch {}
}

export type ShareState = "off" | "on" | "denied" | "unsupported";

export function useShareLocation(tripId: string, running: boolean) {
  const [state, setState] = useState<ShareState>("off");
  const watch = useRef<number | null>(null);
  const last = useRef(0);

  const stop = useCallback(() => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
  }, []);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return;
    }
    stop();
    const supabase = createClient();
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState("on");
        write(tripId, true);
        const now = Date.now();
        if (now - last.current < 8000) return;
        last.current = now;
        const { latitude, longitude, heading, speed } = pos.coords;
        void supabase.rpc("share_trip_location", {
          p_trip_id: tripId,
          p_lat: latitude,
          p_lng: longitude,
          p_heading: heading != null && Number.isFinite(heading) ? heading : null,
          p_speed_kmh: speed != null && Number.isFinite(speed) ? speed * 3.6 : null,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState("denied");
          write(tripId, false);
          stop();
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [tripId, stop]);

  const toggle = useCallback(() => {
    if (state === "on") {
      stop();
      write(tripId, false);
      setState("off");
    } else {
      start();
    }
  }, [state, start, stop, tripId]);

  useEffect(() => {
    if (running && read(tripId)) start();
    if (!running) {
      stop();
      write(tripId, false);
    }
    return stop;
  }, [running, tripId, start, stop]);

  return { state, toggle };
}

export function useTripLocation(tripId: string | null, enabled: boolean) {
  const [loc, setLoc] = useState<TripLocation | null>(null);

  useEffect(() => {
    if (!tripId || !enabled) return;
    let live = true;
    void createClient()
      .from("trip_locations")
      .select("trip_id, lat, lng, heading, speed_kmh, updated_at")
      .eq("trip_id", tripId)
      .maybeSingle()
      .then(({ data }) => {
        if (live && data) setLoc(data as TripLocation);
      });
    return () => {
      live = false;
    };
  }, [tripId, enabled]);

  const receive = useCallback((row: TripLocation) => setLoc(row), []);
  useRowStream<TripLocation>(
    `trip-location:${tripId}`,
    "trip_locations",
    tripId && enabled ? `trip_id=eq.${tripId}` : null,
    receive,
  );

  return loc;
}

export function kmBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}
