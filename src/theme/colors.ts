/** Material Design 3 color tokens for Kipita. */

export const palette = {
  primarySeed: "#2F6C4F",
  secondarySeed: "#9EC5A2",
  tertiarySeed: "#D4B896",
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

type BaseColors = {
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
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceDim: string;
  surfaceBright: string;
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
  scrim: string;
  shadow: string;
};

type AliasColors = {
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  surfaceElevated: string;
  card: string;
  border: string;
  borderLight: string;
  divider: string;
  overlay: string;
  shimmer: string;
  ripple: string;
  inputBackground: string;
  inputBorder: string;
  inputFocusBorder: string;
  placeholder: string;
  tabActive: string;
  tabInactive: string;
  headerBackground: string;
  sheetBackground: string;
  sheetHandle: string;
  badge: string;
  badgeText: string;
  glassBg: string;
  glassBorder: string;
  glassHighlight: string;
};

export type M3Colors = BaseColors & AliasColors;

const withAliases = (
  colors: BaseColors,
  options: {
    overlay: string;
    ripple: string;
    glassBg: string;
    glassBorder: string;
    glassHighlight: string;
  },
): M3Colors => ({
  ...colors,
  text: colors.onSurface,
  textSecondary: colors.onSurfaceVariant,
  textTertiary: colors.outline,
  textInverse: colors.inverseOnSurface,
  surfaceElevated: colors.surfaceContainerLow,
  card: colors.surfaceContainerLow,
  border: colors.outline,
  borderLight: colors.outlineVariant,
  divider: colors.outlineVariant,
  overlay: options.overlay,
  shimmer: colors.surfaceContainerHigh,
  ripple: options.ripple,
  inputBackground: colors.surfaceContainerHigh,
  inputBorder: colors.outlineVariant,
  inputFocusBorder: colors.primary,
  placeholder: colors.outline,
  tabActive: colors.primary,
  tabInactive: colors.outline,
  headerBackground: colors.surface,
  sheetBackground: colors.surfaceContainerLow,
  sheetHandle: colors.outlineVariant,
  badge: colors.secondaryContainer,
  badgeText: colors.onSecondaryContainer,
  glassBg: options.glassBg,
  glassBorder: options.glassBorder,
  glassHighlight: options.glassHighlight,
});

const lightBase: BaseColors = {
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

  // ── Surfaces: M3 neutral palette tinted toward the brand green.
  // Light mode is a soft sage canvas — never plain white. The background is
  // the mid sage tone; elevation is expressed by stepping *brighter* toward a
  // soft sage-white (Lowest), while inset tones (Variant/Dim) step *deeper*.
  // The steps carry real green chroma and enough ΔL to read as distinct soft
  // surfaces — cards, sheets and inputs never dissolve into the canvas.
  background: "#DBE8D6",
  onBackground: "#161D17",
  surface: "#DBE8D6",
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

  scrim: "#000000",
  shadow: "#000000",
};

const darkBase: BaseColors = {
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
  surface: "#111412",
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

  scrim: "#000000",
  shadow: "#000000",
};

export const lightColors = withAliases(lightBase, {
  overlay: "rgba(0,0,0,0.4)",
  ripple: "rgba(44,105,77,0.12)",
  glassBg: "rgba(255,255,255,0.45)",
  glassBorder: "rgba(255,255,255,0.7)",
  glassHighlight: "rgba(255,255,255,0.9)",
});

export const darkColors = withAliases(darkBase, {
  overlay: "rgba(0,0,0,0.6)",
  ripple: "rgba(149,212,177,0.16)",
  glassBg: "rgba(20,30,20,0.55)",
  glassBorder: "rgba(255,255,255,0.12)",
  glassHighlight: "rgba(255,255,255,0.08)",
});

export type LightDarkColors = M3Colors;
