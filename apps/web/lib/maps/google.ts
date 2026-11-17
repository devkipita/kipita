"use client";

let loading: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  const w = window as unknown as { google?: typeof google } & Record<string, unknown>;
  if (w.google?.maps?.Map && w.google.maps.geometry) return Promise.resolve(w.google);
  if (loading) return loading;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));

  loading = new Promise((resolve, reject) => {
    const cb = "__kipitaMapsReady";
    w[cb] = () => {
      delete w[cb];
      resolve(w.google!);
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=geometry&loading=async&callback=${cb}`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(s);
  });

  return loading;
}

export function token(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function mapStyle(): google.maps.MapTypeStyle[] {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches &&
    document.documentElement.dataset.theme !== "light";
  const ground = dark ? "#1f2623" : "#f2f3f0";
  const road = dark ? "#2e3733" : "#ffffff";
  const ink = dark ? "#a7b0ab" : "#5f6a64";
  return [
    { elementType: "geometry", stylers: [{ color: ground }] },
    { elementType: "labels.text.fill", stylers: [{ color: ink }] },
    { elementType: "labels.text.stroke", stylers: [{ color: ground }, { weight: 3 }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "poi", elementType: "labels.icon", stylers: [{ saturation: -60 }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: dark ? "#24342b" : "#d9ecd8" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: road }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: dark ? "#3a4540" : "#d6dde6" }] },
    { featureType: "transit", stylers: [{ visibility: "simplified" }, { saturation: -60 }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: dark ? "#17252c" : "#c8dff0" }] },
  ];
}
