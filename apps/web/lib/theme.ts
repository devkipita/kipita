/**
 * Design tokens for the Kipita web app, expressed as styled-components themes.
 *
 * This is the full Material 3 role set from `apps/mobile/src/theme/colors.ts`
 * (seed #2F6C4F), not a subset. Every value here is the mobile value, so a
 * surface or accent means the same thing on both platforms.
 *
 * Use the roles, not the aliases, in new code:
 *
 *   primary / secondary / tertiary   accents, in descending emphasis
 *   *Container / on*Container        the low-emphasis fill of an accent
 *   success / warning / info / error semantic status, same quad shape
 *   surfaceContainer*                elevation: Lowest is highest-lifted here,
 *                                    because light mode steps BRIGHTER toward
 *                                    sage-white rather than darker
 *   outline / outlineVariant         interactive borders / dividers
 *
 * Pair every base with its `on-` partner. Picking a background and guessing a
 * foreground is how contrast breaks in dark mode.
 *
 * The legacy aliases (bg, surface2, text, muted, line…) map onto these roles so
 * existing components keep working.
 */

const radius = {
  xxs: "8px",
  xs: "11px",
  sm: "14px",
  md: "22px",
  lg: "30px",
  xl: "36px",
  pill: "999px",
} as const;

export type RadiusScale = typeof radius;

const easing = {
  linear: "cubic-bezier(0, 0, 1, 1)",
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  standardAccelerate: "cubic-bezier(0.3, 0, 1, 1)",
  standardDecelerate: "cubic-bezier(0, 0, 0, 1)",
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  emphasizedAccelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
  emphasizedDecelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

const duration = {
  short1: "50ms",
  short2: "100ms",
  short3: "150ms",
  short4: "200ms",
  medium1: "250ms",
  medium2: "300ms",
  medium3: "350ms",
  medium4: "400ms",
  long1: "450ms",
  long2: "500ms",
  long3: "550ms",
  long4: "600ms",
  extraLong1: "700ms",
  extraLong2: "800ms",
} as const;

const motion = { easing, duration } as const;

export type MotionScale = typeof motion;

export type ElevationScale = Record<0 | 1 | 2 | 3 | 4 | 5, string>;

const lightElevation: ElevationScale = {
  0: "none",
  1: "0 1px 2px 0 rgba(16, 36, 24, 0.22), 0 1px 3px 1px rgba(16, 36, 24, 0.10)",
  2: "0 1px 2px 0 rgba(16, 36, 24, 0.22), 0 2px 6px 2px rgba(16, 36, 24, 0.10)",
  3: "0 1px 3px 0 rgba(16, 36, 24, 0.22), 0 4px 8px 3px rgba(16, 36, 24, 0.11)",
  4: "0 2px 3px 0 rgba(16, 36, 24, 0.22), 0 6px 10px 4px rgba(16, 36, 24, 0.11)",
  5: "0 4px 4px 0 rgba(16, 36, 24, 0.22), 0 8px 12px 6px rgba(16, 36, 24, 0.11)",
};

const darkElevation: ElevationScale = {
  0: "none",
  1: "0 1px 2px 0 rgba(0, 0, 0, 0.5), 0 1px 3px 1px rgba(0, 0, 0, 0.32)",
  2: "0 1px 2px 0 rgba(0, 0, 0, 0.5), 0 2px 6px 2px rgba(0, 0, 0, 0.32)",
  3: "0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 4px 8px 3px rgba(0, 0, 0, 0.34)",
  4: "0 2px 3px 0 rgba(0, 0, 0, 0.5), 0 6px 10px 4px rgba(0, 0, 0, 0.34)",
  5: "0 4px 4px 0 rgba(0, 0, 0, 0.5), 0 8px 12px 6px rgba(0, 0, 0, 0.34)",
};

const STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

/** Body copy, form fields, labels — everything that is read rather than scanned. */
const font = `var(--font-dm-sans), "DM Sans", ${STACK}`;

/**
 * Headings and titles. A second, more geometric face so a heading is a
 * different voice rather than just a larger size — the pairing Material's own
 * site uses (Google Sans over Roboto).
 */
const fontHeading = `var(--font-heading), "Outfit", var(--font-dm-sans), ${STACK}`;

/**
 * The type scale. Seven steps, and nothing between them.
 *
 * Before this the app used 29 distinct sizes on one page, most of them within
 * two percent of each other — which is not a hierarchy, it is noise. Pick the
 * step that matches the role; if two things want sizes a hair apart, they are
 * the same step and the difference belongs in weight or colour.
 *
 * `micro` at 13px is the floor. Nothing renders smaller: the old 0.62rem was
 * under 10px, which is unreadable for anyone who is not young with good eyes.
 */
const type = {
  display: "clamp(2.25rem, 4.4vw, 3rem)",
  title: "clamp(1.75rem, 3vw, 2.125rem)",
  heading: "1.5rem",
  subhead: "1.125rem",
  body: "1rem",
  label: "0.875rem",
  micro: "0.8125rem",
} as const;

export type TypeScale = typeof type;

/**
 * Spacing, on a 4px base — the web half of
 * `apps/mobile/src/theme/spacing.ts`, so a gap means the same thing on both
 * platforms. Before this the web app had no spacing tokens at all and every
 * component invented its own numbers.
 */
const space = {
  xxs: "2px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  xxl: "24px",
} as const;

export type SpaceScale = typeof space;

/** One container/on-container pair used by bento & accent cards. */
export type Tone = { bg: string; on: string };

export const palette = {
  white: "#ffffff",
  whiteOff: "#f7f9fc",
  grayLight: "#e9edf6",
  gray: "#c8ceda",
  grayMid: "#a1a8b7",
  grayDark: "#393d46",
  blackLight: "#242628",
  blackMid: "#1b1b1b",
  black: "#0a0a0a",
  pink: "#fff1eb",

  orangeLight: "#ffa680",
  orange: "#ff5c16",
  orangeDark: "#661800",
  orangeDeep: "#3d0e00",

  purpleLight: "#eac2ff",
  purple: "#d075ff",
  purpleDark: "#3d065f",
  purpleDeep: "#25043a",

  limeLight: "#e5ffc3",
  lime: "#baf24a",
  limeDark: "#013330",
  limeDeep: "#012321",

  blueLight: "#cce7ff",
  blue: "#89b0ff",
  blueDark: "#190066",
  blueDeep: "#0c0033",

  redLight: "#ffd9d9",
  red: "#dc2626",
  redDark: "#6b0f0f",

  error: "#dc2626",
  success: "#457a39",
  increase: "#457a39",
  decrease: "#e50000",
} as const;

export type AccentName = "orange" | "purple" | "lime" | "blue" | "red";
export type AccentStep = "soft" | "bold" | "deep";
export type AccentSet = Record<AccentStep, Tone>;

const lightAccent: Record<AccentName, AccentSet> = {
  orange: {
    soft: { bg: palette.orangeLight, on: palette.orangeDark },
    bold: { bg: palette.orange, on: palette.orangeDark },
    deep: { bg: palette.orangeDark, on: palette.orangeLight },
  },
  purple: {
    soft: { bg: palette.purpleLight, on: palette.purpleDark },
    bold: { bg: palette.purple, on: palette.purpleDeep },
    deep: { bg: palette.purpleDark, on: palette.purpleLight },
  },
  lime: {
    soft: { bg: palette.limeLight, on: palette.limeDark },
    bold: { bg: palette.lime, on: palette.limeDark },
    deep: { bg: palette.limeDark, on: palette.limeLight },
  },
  blue: {
    soft: { bg: palette.blueLight, on: palette.blueDark },
    bold: { bg: palette.blue, on: palette.blueDark },
    deep: { bg: palette.blueDark, on: palette.blueLight },
  },
  red: {
    soft: { bg: palette.redLight, on: palette.redDark },
    bold: { bg: palette.red, on: palette.white },
    deep: { bg: palette.redDark, on: palette.redLight },
  },
};

const darkAccent: Record<AccentName, AccentSet> = {
  orange: {
    soft: { bg: palette.orangeDeep, on: palette.orangeLight },
    bold: { bg: palette.orange, on: palette.orangeDark },
    deep: { bg: palette.orangeDark, on: palette.orangeLight },
  },
  purple: {
    soft: { bg: palette.purpleDeep, on: palette.purpleLight },
    bold: { bg: palette.purple, on: palette.purpleDeep },
    deep: { bg: palette.purpleDark, on: palette.purpleLight },
  },
  lime: {
    soft: { bg: palette.limeDeep, on: palette.limeLight },
    bold: { bg: palette.lime, on: palette.limeDark },
    deep: { bg: palette.limeDark, on: palette.limeLight },
  },
  blue: {
    soft: { bg: palette.blueDeep, on: palette.blueLight },
    bold: { bg: palette.blue, on: palette.blueDark },
    deep: { bg: palette.blueDark, on: palette.blueLight },
  },
  red: {
    soft: { bg: "#3a0a0a", on: palette.redLight },
    bold: { bg: palette.red, on: palette.white },
    deep: { bg: palette.redDark, on: palette.redLight },
  },
};

export type ToneName =
  | "green"
  | "mint"
  | "tan"
  | "blue"
  | "amber"
  | "lav"
  | "deep"
  | "dark"
  | "surface"
  // Vibrant, theme-independent accents mirroring the landing's StepFlow cards.
  | "forest"
  | "peach"
  | "lilac"
  | "lime"
  // Mobile's schedule pill and verified badge pair.
  | "jungle";

export interface AppColors {
  // ── Accents ──
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // ── Semantic status ──
  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;
  warning: string;
  onWarning: string;
  warningContainer: string;
  onWarningContainer: string;
  info: string;
  onInfo: string;
  infoContainer: string;
  onInfoContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // ── Surfaces ──
  background: string;
  onBackground: string;
  surfaceRole: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceDim: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // ── Lifted surfaces. Light steps brighter, dark steps lighter, so the
  //    "raised" container is a different role in each mode. ──
  elevated: string;
  elevatedHover: string;
  elevatedInset: string;

  // ── Legacy aliases, mapped onto the roles above ──
  primaryDark: string;
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
}

export interface AppTheme {
  mode: "light" | "dark";
  color: AppColors;
  tone: Record<ToneName, Tone>;
  accent: Record<AccentName, AccentSet>;
  radius: RadiusScale;
  shadow: { card: string; soft: string };
  elevation: ElevationScale;
  motion: MotionScale;
  font: string;
  fontHeading: string;
  type: TypeScale;
  space: SpaceScale;
}

type Roles = Omit<
  AppColors,
  | "elevated"
  | "elevatedHover"
  | "elevatedInset"
  | "primaryDark"
  | "bg"
  | "bgAlt"
  | "surface"
  | "surface2"
  | "surfaceBright"
  | "text"
  | "textSoft"
  | "muted"
  | "line"
  | "green700"
  | "tan"
  | "dangerBg"
  | "dangerText"
  | "warnBg"
  | "warnText"
> & { surfaceBright: string };

function withAliases(
  r: Roles,
  primaryDark: string,
  tanAccent: string,
  lifted: { rest: string; hover: string; inset: string },
): AppColors {
  return {
    ...r,
    elevated: lifted.rest,
    elevatedHover: lifted.hover,
    elevatedInset: lifted.inset,
    primaryDark,
    bg: r.background,
    bgAlt: r.surfaceVariant,
    surface: r.surfaceContainerLowest,
    surface2: r.surfaceContainerLow,
    text: r.onSurface,
    textSoft: r.onSurfaceVariant,
    muted: r.outline,
    line: r.outlineVariant,
    green700: primaryDark,
    tan: tanAccent,
    dangerBg: r.errorContainer,
    dangerText: r.onErrorContainer,
    warnBg: r.warningContainer,
    warnText: r.onWarningContainer,
  };
}

const lightRoles: Roles = {
  primary: "#2C694D",
  onPrimary: "#FFFFFF",
  primaryContainer: "#B0F1CC",
  onPrimaryContainer: "#002113",
  secondary: "#436649",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#C4EDC8",
  onSecondaryContainer: "#00210B",
  tertiary: "#705B3E",
  onTertiary: "#FFFFFF",
  tertiaryContainer: "#FCDEBA",
  onTertiaryContainer: "#281903",

  success: "#1E6B4A",
  onSuccess: "#FFFFFF",
  successContainer: "#A7F3C9",
  onSuccessContainer: "#002113",
  warning: "#815508",
  onWarning: "#FFFFFF",
  warningContainer: "#FFDDB4",
  onWarningContainer: "#291800",
  info: "#306384",
  onInfo: "#FFFFFF",
  infoContainer: "#C9E6FF",
  onInfoContainer: "#001E2F",
  error: "#BA1A1A",
  onError: "#FFFFFF",
  errorContainer: "#FFDAD6",
  onErrorContainer: "#410002",

  background: "#DBE8D6",
  onBackground: "#161D17",
  surfaceRole: "#DBE8D6",
  onSurface: "#161D17",
  surfaceVariant: "#CBDBC6",
  onSurfaceVariant: "#404A41",
  surfaceDim: "#C1D1BB",
  surfaceBright: "#F5FBF2",
  surfaceContainerLowest: "#F7FCF5",
  surfaceContainerLow: "#EFF7EC",
  surfaceContainer: "#E9F2E5",
  surfaceContainerHigh: "#E3EDDF",
  surfaceContainerHighest: "#DDE8D8",
  outline: "#6E796E",
  outlineVariant: "#BCC8B8",
  inverseSurface: "#2E312E",
  inverseOnSurface: "#EFF1ED",
  inversePrimary: "#95D4B1",
};

const darkRoles: Roles = {
  primary: "#95D4B1",
  onPrimary: "#003823",
  primaryContainer: "#0E5136",
  onPrimaryContainer: "#B0F1CC",
  secondary: "#A9D0AD",
  onSecondary: "#14371E",
  secondaryContainer: "#2C4E33",
  onSecondaryContainer: "#C4EDC8",
  tertiary: "#DFC29F",
  onTertiary: "#3F2D15",
  tertiaryContainer: "#574329",
  onTertiaryContainer: "#FCDEBA",

  success: "#8CD6AE",
  onSuccess: "#003823",
  successContainer: "#005235",
  onSuccessContainer: "#A7F3C9",
  warning: "#F7BC6A",
  onWarning: "#452B00",
  warningContainer: "#633F00",
  onWarningContainer: "#FFDDB4",
  info: "#9BCCF1",
  onInfo: "#00344D",
  infoContainer: "#114B6B",
  onInfoContainer: "#C9E6FF",
  error: "#FFB4AB",
  onError: "#690005",
  errorContainer: "#93000A",
  onErrorContainer: "#FFDAD6",

  background: "#111412",
  onBackground: "#E1E3DF",
  surfaceRole: "#111412",
  onSurface: "#E1E3DF",
  surfaceVariant: "#404943",
  onSurfaceVariant: "#C0C9C1",
  surfaceDim: "#111412",
  surfaceBright: "#373A37",
  surfaceContainerLowest: "#0C0F0D",
  surfaceContainerLow: "#191C1A",
  surfaceContainer: "#1D201E",
  surfaceContainerHigh: "#272B28",
  surfaceContainerHighest: "#323633",
  outline: "#8A938C",
  outlineVariant: "#404943",
  inverseSurface: "#E1E3DF",
  inverseOnSurface: "#2E312E",
  inversePrimary: "#2C694D",
};

const light: AppTheme = {
  mode: "light",
  color: withAliases(lightRoles, "#17452F", "#D4B896", {
    rest: lightRoles.surfaceContainerLow,
    hover: lightRoles.surfaceContainerLowest,
    inset: lightRoles.surfaceContainerHigh,
  }),
  tone: {
    green: { bg: "#b0f1cc", on: "#002113" },
    mint: { bg: "#c4edc8", on: "#00210b" },
    tan: { bg: "#fcdeba", on: "#281903" },
    blue: { bg: "#c9e6ff", on: "#001e2f" },
    amber: { bg: "#ffddb4", on: "#291800" },
    lav: { bg: "#e7d8ff", on: "#25084f" },
    deep: { bg: "#0e5136", on: "#b0f1cc" },
    dark: { bg: "#16201b", on: "#dfeee5" },
    surface: { bg: "#f7fcf5", on: "#161d17" },
    forest: { bg: "#013330", on: "#e5ffc3" },
    peach: { bg: "#f8a783", on: "#2a1002" },
    lilac: { bg: "#ddb8fb", on: "#3b0a63" },
    lime: { bg: "#e5ffc3", on: "#013330" },
    jungle: { bg: "#1f4734", on: "#96c93d" },
  },
  accent: lightAccent,
  radius,
  shadow: {
    card: "0 24px 60px -30px rgba(12, 40, 26, 0.42)",
    soft: "0 12px 34px -20px rgba(16, 36, 24, 0.24)",
  },
  elevation: lightElevation,
  motion,
  font,
  fontHeading,
  type,
  space,
};

const dark: AppTheme = {
  mode: "dark",
  color: withAliases(darkRoles, "#7EC3A0", "#D4B896", {
    rest: darkRoles.surfaceContainer,
    hover: darkRoles.surfaceContainerHigh,
    inset: darkRoles.surfaceContainerHighest,
  }),
  tone: {
    green: { bg: "#14392a", on: "#b0f1cc" },
    mint: { bg: "#183524", on: "#c4edc8" },
    tan: { bg: "#4a3b28", on: "#fcdeba" },
    blue: { bg: "#123047", on: "#c9e6ff" },
    amber: { bg: "#4a3a1a", on: "#ffddb4" },
    lav: { bg: "#2c1a4a", on: "#e7d8ff" },
    deep: { bg: "#0e5136", on: "#b0f1cc" },
    dark: { bg: "#0a0d0b", on: "#dfeee5" },
    surface: { bg: "#1d201e", on: "#e1e3df" },
    forest: { bg: "#013330", on: "#e5ffc3" },
    peach: { bg: "#f8a783", on: "#2a1002" },
    lilac: { bg: "#ddb8fb", on: "#3b0a63" },
    lime: { bg: "#e5ffc3", on: "#013330" },
    jungle: { bg: "#1f4734", on: "#96c93d" },
  },
  accent: darkAccent,
  radius,
  shadow: {
    card: "0 30px 70px -30px rgba(0, 0, 0, 0.6)",
    soft: "0 12px 34px -20px rgba(0, 0, 0, 0.45)",
  },
  elevation: darkElevation,
  motion,
  font,
  fontHeading,
  type,
  space,
};

export const themes: Record<"light" | "dark", AppTheme> = { light, dark };
export type ThemeMode = keyof typeof themes;
