import {
  Car,
  CloudRain,
  SmileySad as Frown,
  Heart,
  Megaphone,
  Shield,
  Sparkle as Sparkles,
  ThumbsUp,
  Warning as TriangleAlert,
  XCircle,
} from "@/components/icons";
import type { KipitaIcon as LucideIcon } from "@/components/icons";
import { isSafeImageUrl } from "@/lib/security/url";
import { palette } from "@/lib/theme";
import type { AccentName, AccentStep, ToneName } from "@/lib/theme";
import type { AlertCategory, ReactionKey } from "./types";

/**
 * Category presentation. Each category owns a hue from the palette and a step
 * within it, so the badge, the edge stripe and the map pin all say the same
 * thing. `deep` steps are a dark fill with light text; `soft` steps invert it.
 */
export const ALERT_META: Record<
  AlertCategory,
  {
    label: string;
    icon: LucideIcon;
    accent: AccentName;
    step: AccentStep;
    color: string;
  }
> = {
  traffic: {
    label: "Traffic",
    icon: Car,
    accent: "orange",
    step: "soft",
    color: palette.orange,
  },
  accident: {
    label: "Accident",
    icon: TriangleAlert,
    accent: "red",
    step: "bold",
    color: palette.red,
  },
  road_closure: {
    label: "Road closed",
    icon: XCircle,
    accent: "red",
    step: "deep",
    color: palette.redDark,
  },
  weather: {
    label: "Weather",
    icon: CloudRain,
    accent: "blue",
    step: "soft",
    color: palette.blue,
  },
  police: {
    label: "Police",
    icon: Shield,
    accent: "lime",
    step: "deep",
    color: palette.limeDark,
  },
  general: {
    label: "Update",
    icon: Megaphone,
    accent: "purple",
    step: "soft",
    color: palette.purple,
  },
};

export const ALERT_CATEGORIES = Object.keys(ALERT_META) as AlertCategory[];

/**
 * Category → theme tone. The tone pairs carry a matched `on` colour, so a badge
 * or wash built from one is legible in both schemes without hand-picking text
 * colours the way `categoryTint` needs.
 */
export const CATEGORY_TONE: Record<AlertCategory, ToneName> = {
  traffic: "amber",
  accident: "peach",
  road_closure: "tan",
  weather: "blue",
  police: "green",
  general: "lav",
};

/**
 * Category → M3 semantic role. Severity maps onto the status quads the theme
 * already carries, so a card reads the same way as any other status surface in
 * the app and stays legible in both schemes.
 */
export type CategoryRole = "error" | "warning" | "info" | "primary" | "secondary";

export const CATEGORY_ROLE: Record<AlertCategory, CategoryRole> = {
  accident: "error",
  road_closure: "error",
  traffic: "warning",
  weather: "info",
  police: "primary",
  general: "secondary",
};

/**
 * Reaction presentation. The stored value is the key (identical to mobile), so
 * a reaction crosses between clients; only the drawing differs — mobile uses
 * emoji, the web app uses lucide icons throughout.
 */
export const REACTION_META: Record<
  ReactionKey,
  { label: string; icon: LucideIcon; color: string }
> = {
  thumbs_up: { label: "Thumbs up", icon: ThumbsUp, color: palette.limeDark },
  heart: { label: "Heart", icon: Heart, color: palette.red },
  wow: { label: "Wow", icon: Sparkles, color: palette.orange },
  sad: { label: "Sad", icon: Frown, color: palette.blue },
};

/** A soft wash of the category colour, for chips on a light or dark surface. */
export function categoryTint(color: string): string {
  return `color-mix(in srgb, ${color} 14%, transparent)`;
}

/** Mirrors the five-minute window in the RLS policies from migration 022. */
export const EDIT_WINDOW_MS = 5 * 60 * 1000;

export function editWindowRemaining(createdAt: string): number {
  const ends = new Date(createdAt).getTime() + EDIT_WINDOW_MS;
  return Math.max(0, ends - Date.now());
}

export function canEditAlert(createdAt: string): boolean {
  return editWindowRemaining(createdAt) > 0;
}

/**
 * `updated_at` defaults to `created_at` on insert, and the two are written in
 * the same statement but not the same instant, so a small tolerance keeps a
 * freshly posted alert from claiming it was edited.
 */
export function wasEdited(alert: {
  created_at: string;
  updated_at?: string | null;
}): boolean {
  if (!alert.updated_at) return false;
  return (
    new Date(alert.updated_at).getTime() - new Date(alert.created_at).getTime() >
    2000
  );
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
  // Also the XSS guard for stored image URLs — anything that isn't http(s) is
  // rejected outright rather than handed to an <img src>.
  return isSafeImageUrl(url) && /^https?:\/\//i.test(url ?? "");
}

/** "12" / "1.2k" / "3.4m" — matches mobile's compact counts. */
export function formatCompactNumber(value: number | null | undefined): string {
  const n = value ?? 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}
