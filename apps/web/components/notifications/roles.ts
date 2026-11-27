import type { DefaultTheme } from "styled-components";
import { chipColors } from "@/components/ui/Chip";
import { nocturne } from "@/lib/nocturne";
import type { ActivityRole } from "@/lib/notifications/activity";

export function roleColors(theme: DefaultTheme, role: ActivityRole): { bg: string; ink: string } {
  if (role === "lime") return { bg: nocturne.lime, ink: nocturne.greenDeep };
  if (role === "neutral") return { bg: theme.color.surfaceContainerHighest, ink: theme.color.onSurface };
  return chipColors(theme, role, false);
}
