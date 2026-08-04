/**
 * Design tokens for the Kipita web app, expressed as styled-components themes.
 *
 * The palette mirrors the Material 3 tonal system used by apps/mobile (seed
 * #2F6C4F). Two themes are exported — `light` and `dark` — sharing the same
 * token *shape* so every styled component can read `theme.color.*` and adapt to
 * the active colour scheme automatically. The active theme is chosen from the
 * user's `prefers-color-scheme` in ThemeProvider.
 */

// Shape-invariant tokens (identical across light/dark).
const radius = {
  sm: "14px",
  md: "22px",
  lg: "30px",
  xl: "36px",
  pill: "999px",
} as const;

const font =
  'var(--font-dm-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** One container/on-container pair used by bento & accent cards. */
export type Tone = { bg: string; on: string };

export type ToneName =
  | "green"
  | "mint"
  | "tan"
  | "blue"
  | "amber"
  | "deep"
  | "dark"
  | "surface";

/** The token contract every theme must satisfy (light & dark share this shape). */
export interface AppTheme {
  mode: "light" | "dark";
  color: {
    primary: string;
    primaryDark: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    bg: string;
    bgAlt: string;
    surface: string;
    surface2: string;
    surfaceBright: string;
    text: string;
    textSoft: string;
    muted: string;
    line: string;
    green700: string;
    tan: string;
    dangerBg: string;
    dangerText: string;
    warnBg: string;
    warnText: string;
  };
  tone: Record<ToneName, Tone>;
  radius: { sm: string; md: string; lg: string; xl: string; pill: string };
  shadow: { card: string; soft: string };
  font: string;
}

const light: AppTheme = {
  mode: "light",
  color: {
    // Brand / primary
    primary: "#2c694d",
    primaryDark: "#17452f",
    onPrimary: "#ffffff",
    primaryContainer: "#b0f1cc",
    onPrimaryContainer: "#002113",

    // Surfaces — sage canvas, crisp near-white cards
    bg: "#dbe8d6",
    bgAlt: "#cfe0c9",
    surface: "#f7fcf5",
    surface2: "#eff7ec",
    surfaceBright: "#f5fbf2",

    // Text
    text: "#161d17",
    textSoft: "#404a41",
    muted: "#6e796e",
    line: "#c7d6c2",

    // Legacy accents kept so ported pages harmonise
    green700: "#235841",
    tan: "#d4b896",

    // Feedback
    dangerBg: "#fbe2e2",
    dangerText: "#8a2020",
    warnBg: "#fde7cf",
    warnText: "#7a4a06",
  },
  // Container tones (M3 container / on-container) for bento cards.
  tone: {
    green: { bg: "#b0f1cc", on: "#002113" },
    mint: { bg: "#c4edc8", on: "#00210b" },
    tan: { bg: "#fcdeba", on: "#281903" },
    blue: { bg: "#c9e6ff", on: "#001e2f" },
    amber: { bg: "#ffddb4", on: "#291800" },
    deep: { bg: "#0e5136", on: "#b0f1cc" },
    dark: { bg: "#16201b", on: "#dfeee5" },
    surface: { bg: "#f7fcf5", on: "#161d17" },
  },
  radius,
  shadow: {
    card: "0 24px 60px -30px rgba(12, 40, 26, 0.42)",
    soft: "0 12px 34px -20px rgba(16, 36, 24, 0.24)",
  },
  font,
};

const dark: AppTheme = {
  mode: "dark",
  color: {
    primary: "#95d4b1",
    primaryDark: "#7ec3a0",
    onPrimary: "#04281a",
    primaryContainer: "#0e5136",
    onPrimaryContainer: "#b0f1cc",

    bg: "#111412",
    bgAlt: "#171b18",
    surface: "#1d201e",
    surface2: "#272b28",
    surfaceBright: "#23271f",

    text: "#e1e3df",
    textSoft: "#b7c2ba",
    muted: "#8b968d",
    line: "#333a35",

    green700: "#95d4b1",
    tan: "#d4b896",

    dangerBg: "#3a1c1c",
    dangerText: "#f2b8b8",
    warnBg: "#3a2c14",
    warnText: "#f0cfa0",
  },
  tone: {
    green: { bg: "#14392a", on: "#b0f1cc" },
    mint: { bg: "#183524", on: "#c4edc8" },
    tan: { bg: "#4a3b28", on: "#fcdeba" },
    blue: { bg: "#123047", on: "#c9e6ff" },
    amber: { bg: "#4a3a1a", on: "#ffddb4" },
    deep: { bg: "#0e5136", on: "#b0f1cc" },
    dark: { bg: "#0a0d0b", on: "#dfeee5" },
    surface: { bg: "#1d201e", on: "#e1e3df" },
  },
  radius,
  shadow: {
    card: "0 30px 70px -30px rgba(0, 0, 0, 0.6)",
    soft: "0 12px 34px -20px rgba(0, 0, 0, 0.45)",
  },
  font,
};

export const themes: Record<"light" | "dark", AppTheme> = { light, dark };
export type ThemeMode = keyof typeof themes;
