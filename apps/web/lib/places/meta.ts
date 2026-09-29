import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Sun,
} from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
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

/** Kenya is metric. Celsius, no decimal — a card is not a forecast. */
export function formatTemp(c: number): string {
  return `${Math.round(c)}°C`;
}
