import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Sun,
} from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import type { AppColors } from "@/lib/theme";
import type { WeatherKind } from "./weather";

export const WEATHER_ICON: Record<WeatherKind, KipitaIcon> = {
  clear: Sun,
  cloudy: CloudSun,
  overcast: Cloud,
  fog: CloudFog,
  drizzle: CloudRain,
  rain: CloudRain,
  storm: CloudLightning,
};

/** The M3 role each condition is drawn in, so it adapts to light and dark. */
export const WEATHER_ROLE: Record<WeatherKind, keyof AppColors> = {
  clear: "warning",
  cloudy: "tertiary",
  overcast: "secondary",
  fog: "outline",
  drizzle: "info",
  rain: "info",
  storm: "error",
};

/** Kenya is metric. Celsius, no decimal — a card is not a forecast. */
export function formatTemp(c: number): string {
  return `${Math.round(c)}°C`;
}
