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

export type ShareState = "off" | "on" | "denied" | "unsupported" | "failed";

export const PICKUP_WINDOW_MS = 20 * 60 * 1000;

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
    setState((s) => (s === "failed" ? "off" : s));
    const supabase = createClient();
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState((s) => (s === "failed" ? s : "on"));
        const now = Date.now();
        if (now - last.current < 8000) return;
        last.current = now;
        const { latitude, longitude, heading, speed } = pos.coords;
        void supabase
          .rpc("share_trip_location", {
            p_trip_id: tripId,
            p_lat: latitude,
            p_lng: longitude,
            p_heading: heading != null && Number.isFinite(heading) ? heading : null,
            p_speed_kmh: speed != null && Number.isFinite(speed) ? speed * 3.6 : null,
          })
          .then(({ error }) => {
            if (!error) return;
            last.current = 0;
            setState("failed");
          });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState("denied");
          stop();
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [tripId, stop]);

  const retry = useCallback(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (running) start();
    else stop();
    return stop;
  }, [running, start, stop]);

  return { state, retry };
}

export type PickupLocation = {
  booking_id: string;
  trip_id: string;
  passenger_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  updated_at: string;
};

export function useSharePickup(bookingId: string, active: boolean) {
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
    setState((s) => (s === "failed" ? "off" : s));
    const supabase = createClient();
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState((s) => (s === "failed" ? s : "on"));
        const now = Date.now();
        if (now - last.current < 10000) return;
        last.current = now;
        const { latitude, longitude, accuracy } = pos.coords;
        void supabase
          .rpc("share_pickup_location", {
            p_booking_id: bookingId,
            p_lat: latitude,
            p_lng: longitude,
            p_accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
          })
          .then(({ error }) => {
            if (!error) return;
            last.current = 0;
            setState("failed");
          });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState("denied");
          stop();
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  }, [bookingId, stop]);

  useEffect(() => {
    if (active) start();
    else {
      stop();
      setState("off");
    }
    return stop;
  }, [active, start, stop]);

  return { state, retry: start };
}

export function usePickupLocations(tripId: string | null, enabled: boolean) {
  const [spots, setSpots] = useState<Record<string, PickupLocation>>({});

  useEffect(() => {
    if (!tripId || !enabled) return;
    let live = true;
    const load = () =>
      void createClient()
        .from("pickup_locations")
        .select("booking_id, trip_id, passenger_id, lat, lng, accuracy_m, updated_at")
        .eq("trip_id", tripId)
        .then(({ data }) => {
          if (!live || !data) return;
          setSpots(Object.fromEntries((data as PickupLocation[]).map((row) => [row.booking_id, row])));
        });
    load();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    return () => {
      live = false;
      window.clearInterval(poll);
    };
  }, [tripId, enabled]);

  const receive = useCallback((row: PickupLocation) => setSpots((prev) => ({ ...prev, [row.booking_id]: row })), []);
  useRowStream<PickupLocation>(
    `pickup-locations:${tripId}`,
    "pickup_locations",
    tripId && enabled ? `trip_id=eq.${tripId}` : null,
    receive,
  );

  return spots;
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
