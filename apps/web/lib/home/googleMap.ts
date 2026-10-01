import type { AppTheme } from "@/lib/theme";

export const MAP_LOAD_TIMEOUT_MS = 12000;

const CALLBACK = "__kipitaGoogleMapsReady";

type MapsNamespace = typeof google.maps;

declare global {
  interface Window {
    [CALLBACK]?: () => void;
  }
}

let pending: Promise<MapsNamespace> | null = null;

export function loadGoogleMaps(): Promise<MapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("google-maps: server"));
  }
  if (pending) return pending;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("google-maps: no key"));

  pending = new Promise<MapsNamespace>((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    const timer = window.setTimeout(() => {
      reject(new Error("google-maps: timeout"));
    }, MAP_LOAD_TIMEOUT_MS);

    window[CALLBACK] = () => {
      window.clearTimeout(timer);
      delete window[CALLBACK];
      resolve(window.google.maps);
    };

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${CALLBACK}`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      pending = null;
      reject(new Error("google-maps: script"));
    };
    document.head.appendChild(script);
  });

  return pending;
}

function alpha(hex: string, value: number): string {
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
  return `rgba(${r}, ${g}, ${b}, ${value})`;
}

export function mapStyleFor(theme: AppTheme): google.maps.MapTypeStyle[] {
  const dark = theme.mode === "dark";
  const land = theme.color.bg;
  const water = dark ? "#0d1a16" : "#c3dcd0";
  const park = theme.color.bgAlt;
  const minorRoad = dark ? "#262c28" : theme.color.line;
  const majorRoad = alpha(theme.color.primary, dark ? 0.42 : 0.34);
  const label = theme.color.textSoft;
  const halo = theme.color.bg;

  return [
    { elementType: "geometry", stylers: [{ color: land }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: label }] },
    { elementType: "labels.text.stroke", stylers: [{ color: halo }] },

    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: park }, { visibility: "on" }],
    },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: land }] },
    {
      featureType: "landscape.man_made",
      elementType: "geometry",
      stylers: [{ color: dark ? "#171b19" : "#d2e0cc" }],
    },

    { featureType: "water", elementType: "geometry", stylers: [{ color: water }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: label }] },

    { featureType: "road", elementType: "geometry.stroke", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: minorRoad }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: majorRoad }] },
    { featureType: "road.local", stylers: [{ visibility: "off" }] },

    {
      featureType: "administrative",
      elementType: "geometry.stroke",
      stylers: [{ color: alpha(theme.color.muted, 0.45) }],
    },
    { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: label }],
    },
  ];
}
