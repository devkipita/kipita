import {
  Car,
  CloudRain,
  Frown,
  Heart,
  Megaphone,
  Shield,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { AlertCategory, ReactionKey } from "./types";

/**
 * Category presentation — the web port of
 * `apps/mobile/src/components/cards/alertMeta.ts`.
 *
 * The colours are the exact mobile hexes. They're semantic (red means accident
 * everywhere) and theme-independent, like the forest/peach/lilac/lime tones in
 * `lib/theme.ts`, so they are not routed through the theme.
 */
export const ALERT_META: Record<
  AlertCategory,
  { label: string; icon: LucideIcon; color: string }
> = {
  traffic: { label: "Traffic", icon: Car, color: "#E08A2B" },
  accident: { label: "Accident", icon: TriangleAlert, color: "#D93A34" },
  road_closure: { label: "Road closed", icon: XCircle, color: "#C23B22" },
  weather: { label: "Weather", icon: CloudRain, color: "#2E80B8" },
  police: { label: "Police", icon: Shield, color: "#2F6C4F" },
  general: { label: "Update", icon: Megaphone, color: "#6E8BA6" },
};

export const ALERT_CATEGORIES = Object.keys(ALERT_META) as AlertCategory[];

/**
 * Reaction presentation. The stored value is the key (identical to mobile), so
 * a reaction crosses between clients; only the drawing differs — mobile uses
 * emoji, the web app uses lucide icons throughout.
 */
export const REACTION_META: Record<
  ReactionKey,
  { label: string; icon: LucideIcon; color: string }
> = {
  thumbs_up: { label: "Thumbs up", icon: ThumbsUp, color: "#2F6C4F" },
  heart: { label: "Heart", icon: Heart, color: "#E0245E" },
  wow: { label: "Wow", icon: Sparkles, color: "#D9A21B" },
  sad: { label: "Sad", icon: Frown, color: "#4B79C4" },
};

/** A soft wash of the category colour, for chips on a light or dark surface. */
export function categoryTint(color: string): string {
  return `color-mix(in srgb, ${color} 14%, transparent)`;
}

const MAX_WORDS = 26;

/** Mobile truncates feed bodies at 26 words and appends a "Read more" tail. */
export function truncateWords(text: string): { body: string; truncated: boolean } {
  const words = text.trim().split(/\s+/);
  if (words.length <= MAX_WORDS) return { body: text.trim(), truncated: false };
  return { body: `${words.slice(0, MAX_WORDS).join(" ")}…`, truncated: true };
}

/**
 * Whether an `image_url` can actually be shown.
 *
 * Load-bearing: `AlertPostSheet.tsx` on mobile writes device-local `file:///…`
 * URIs, which are meaningless anywhere else. Without this check the media card
 * layout renders as a black box rather than falling back to text.
 */
export function isDisplayableImage(url: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

/** "12" / "1.2k" / "3.4m" — matches mobile's compact counts. */
export function formatCompactNumber(value: number | null | undefined): string {
  const n = value ?? 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}
