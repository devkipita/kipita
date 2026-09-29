import { haversineKm, resolveTown, type LatLngLike } from "@kipita/shared";
import type { Alert } from "./types";

export type LocationOutcome =
  | { ok: true; coords: LatLngLike; precise: boolean }
  | { ok: false; reason: "denied" | "unavailable" };

const TIMEOUT_MS = 8000;

export function geolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function requestPreciseLocation(): Promise<LocationOutcome> {
  if (!geolocationSupported()) {
    return Promise.resolve({ ok: false, reason: "unavailable" });
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = (value: LocationOutcome) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    navigator.geolocation.getCurrentPosition(
      (position) =>
        done({
          ok: true,
          precise: true,
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        }),
      (error) =>
        done({
          ok: false,
          reason: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        }),
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 60_000 },
    );

    setTimeout(() => done({ ok: false, reason: "unavailable" }), TIMEOUT_MS + 500);
  });
}

export function alertCoords(alert: Alert): LatLngLike | null {
  if (alert.lat !== null && alert.lng !== null) {
    return { lat: alert.lat, lng: alert.lng };
  }
  const town = resolveTown(alert.location);
  return town ? { lat: town.lat, lng: town.lng } : null;
}

export function withDistance(alerts: Alert[], from: LatLngLike | null): Alert[] {
  if (!from) return alerts.map((a) => ({ ...a, distance_km: null }));

  return alerts.map((alert) => {
    const to = alertCoords(alert);
    return { ...alert, distance_km: to ? haversineKm(from, to) : null };
  });
}

export function formatDistance(km: number | null | undefined): string | null {
  if (km === null || km === undefined || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}
