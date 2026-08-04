import type { AlertCategory } from "@/types";
import type { IconName } from "../core/Icon";

/**
 * Single source of truth for how each road-alert category looks.
 *
 * Colours are semantic, not decorative: danger reads red, caution reads amber,
 * info reads blue, authority/safe reads brand green. Per brand rules the tan
 * (#D4B896) is reserved and red is used only to communicate real danger.
 */
export interface AlertMeta {
  label: string;
  icon: IconName;
  color: string;
}

export const ALERT_META: Record<AlertCategory, AlertMeta> = {
  traffic: { label: "Traffic", icon: "car", color: "#E08A2B" }, // amber — slow, caution
  accident: { label: "Accident", icon: "warning", color: "#D93A34" }, // red — danger
  road_closure: { label: "Road closed", icon: "close-circle", color: "#C23B22" }, // deep red — blocked
  weather: { label: "Weather", icon: "rainy", color: "#2E80B8" }, // blue — info
  police: { label: "Police", icon: "shield", color: "#2F6C4F" }, // brand green — authority
  general: { label: "Update", icon: "megaphone", color: "#6E8BA6" }, // slate — neutral notice
};
