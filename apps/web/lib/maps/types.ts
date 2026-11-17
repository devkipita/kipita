export type TripRoute = {
  polyline: string;
  seconds: number;
  destination: string;
};

export function placeKey(name: string, lat?: number | null, lng?: number | null) {
  return lat != null && lng != null ? `${lat.toFixed(5)},${lng.toFixed(5)}` : `${name.trim()}, Kenya`;
}
