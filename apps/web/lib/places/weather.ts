/**
 * Current conditions for a town, from Open-Meteo.
 *
 * Keyless, free for non-commercial volume, CORS-friendly and requires no
 * attribution — the same reasoning that picked Wikipedia for the imagery.
 * Google's Weather and Places APIs both need a billed key, which this repo has
 * no credentials for.
 *
 * Every lookup is best-effort: a card renders perfectly well with no
 * temperature on it, so nothing here is allowed to fail a page.
 */

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const HOUR = 60 * 60;

export type WeatherKind =
  | "clear"
  | "cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm";

export interface Weather {
  tempC: number;
  kind: WeatherKind;
  label: string;
}

/** WMO weather codes, collapsed to the handful worth drawing an icon for. */
function kindFor(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: "clear", label: "Clear" };
  if (code <= 2) return { kind: "cloudy", label: "Partly cloudy" };
  if (code === 3) return { kind: "overcast", label: "Overcast" };
  if (code <= 48) return { kind: "fog", label: "Fog" };
  if (code <= 57) return { kind: "drizzle", label: "Drizzle" };
  if (code <= 67) return { kind: "rain", label: "Rain" };
  if (code <= 77) return { kind: "rain", label: "Sleet" };
  if (code <= 82) return { kind: "rain", label: "Showers" };
  if (code <= 86) return { kind: "rain", label: "Snow showers" };
  return { kind: "storm", label: "Thunderstorm" };
}

export async function fetchWeather(
  lat: number,
  lng: number,
): Promise<Weather | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(3),
      longitude: lng.toFixed(3),
      current: "temperature_2m,weather_code",
      timezone: "Africa/Nairobi",
    });

    const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { accept: "application/json" },
      // An hour is plenty — weather does not move faster than a page view.
      next: { revalidate: HOUR },
    });
    if (!response.ok) return null;

    const data: {
      current?: { temperature_2m?: number; weather_code?: number };
    } = await response.json();

    const temp = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (typeof temp !== "number" || typeof code !== "number") return null;

    const { kind, label } = kindFor(code);
    return { tempC: Math.round(temp), kind, label };
  } catch {
    return null;
  }
}
