/** Kipita color palette — Material 3 inspired, Kenya-first */

export const palette = {
  // Greens
  green50: "#F2F7F3",
  green100: "#DCEADF",
  green200: "#C6DDCB",
  green300: "#9EC5A2",
  green400: "#7EAD88",
  green500: "#5E9570",
  green600: "#4A8160",
  green700: "#3C7357",
  green800: "#2F6C4F",
  green900: "#25553E",

  // Warm neutral accent
  sand100: "#F1E7D7",
  sand200: "#E7D6BE",
  sand300: "#DCC5A6",
  sand400: "#D4B896",
  sand900: "#705D45",

  // Charcoal / Neutrals
  charcoal50: "#F5F5F6",
  charcoal100: "#E8E8EA",
  charcoal200: "#D1D1D5",
  charcoal300: "#B0B0B7",
  charcoal400: "#8A8A94",
  charcoal500: "#6B6B77",
  charcoal600: "#55555F",
  charcoal700: "#3E3E47",
  charcoal800: "#2A2A31",
  charcoal900: "#1A1A1F",
  charcoal950: "#111114",

  // Accent
  amber400: "#DCC5A6",
  amber500: "#D4B896",
  red400: "#DCC5A6",
  red500: "#D4B896",
  blue400: "#42A5F5",

  // Utility
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

export const lightColors = {
  // Surfaces
  background: "#EFF6EF",
  surface: "#FFFFFF",
  surfaceVariant: "#E8F0E8",
  surfaceElevated: "#FFFFFF",
  card: "#FFFFFF",

  // Text
  text: palette.charcoal900,
  textSecondary: palette.charcoal500,
  textTertiary: palette.charcoal400,
  textInverse: palette.white,

  // Brand
  primary: palette.green800,
  primaryContainer: palette.green100,
  onPrimary: palette.white,
  onPrimaryContainer: palette.green900,

  // Secondary
  secondary: palette.green300,
  secondaryContainer: palette.green100,

  // Status
  error: palette.red500,
  errorContainer: palette.sand100,
  success: palette.green600,
  successContainer: palette.green50,
  warning: palette.amber500,
  warningContainer: palette.sand100,
  info: palette.blue400,

  // UI
  border: palette.charcoal200,
  borderLight: palette.charcoal100,
  divider: palette.charcoal100,
  overlay: "rgba(0,0,0,0.4)",
  shimmer: palette.charcoal100,

  // Interactive
  ripple: "rgba(27,94,32,0.12)",
  inputBackground: palette.charcoal50,
  inputBorder: palette.charcoal200,
  inputFocusBorder: palette.green700,
  placeholder: palette.charcoal400,

  // Navigation
  tabActive: palette.green800,
  tabInactive: palette.charcoal400,
  headerBackground: "#EFF6EF",

  // Bottom sheet
  sheetBackground: "#FFFFFF",
  sheetHandle: palette.charcoal300,

  // Badges
  badge: palette.secondary,
  badgeText: palette.white,

  // Shadows
  shadow: "rgba(0,0,0,0.08)",

  // Glass
  glassBg: "rgba(255,255,255,0.45)",
  glassBorder: "rgba(255,255,255,0.7)",
  glassHighlight: "rgba(255,255,255,0.9)",
} as const;

export type LightDarkColors = Record<keyof typeof lightColors, string>;

export const darkColors: LightDarkColors = {
  background: palette.charcoal950,
  surface: palette.charcoal900,
  surfaceVariant: palette.charcoal800,
  surfaceElevated: palette.charcoal800,
  card: palette.charcoal900,

  text: palette.charcoal50,
  textSecondary: palette.charcoal400,
  textTertiary: palette.charcoal500,
  textInverse: palette.charcoal900,

  primary: palette.green400,
  primaryContainer: "#1F4734",
  onPrimary: palette.charcoal900,
  onPrimaryContainer: palette.green200,

  secondary: palette.green300,
  secondaryContainer: "#345844",

  error: palette.red400,
  errorContainer: "#3A3128",
  success: palette.green400,
  successContainer: "#1F4734",
  warning: palette.amber400,
  warningContainer: "#3A3128",
  info: palette.blue400,

  border: palette.charcoal700,
  borderLight: palette.charcoal800,
  divider: palette.charcoal800,
  overlay: "rgba(0,0,0,0.6)",
  shimmer: palette.charcoal800,

  ripple: "rgba(102,187,106,0.15)",
  inputBackground: palette.charcoal800,
  inputBorder: palette.charcoal700,
  inputFocusBorder: palette.green400,
  placeholder: palette.charcoal500,

  tabActive: palette.green400,
  tabInactive: palette.charcoal500,
  headerBackground: palette.charcoal950,

  sheetBackground: palette.charcoal900,
  sheetHandle: palette.charcoal600,

  badge: palette.secondary,
  badgeText: palette.white,

  shadow: "rgba(0,0,0,0.3)",

  // Glass
  glassBg: "rgba(20,30,20,0.55)",
  glassBorder: "rgba(255,255,255,0.12)",
  glassHighlight: "rgba(255,255,255,0.08)",
} as const;
