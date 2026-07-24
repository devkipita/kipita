import { Platform, TextStyle } from "react-native";

/**
 * App font family.
 * DM Sans is loaded during bootstrap and kept consistent across weights.
 */
const webSansFallback =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

const withWebFallback = (fontFamily: string) =>
  Platform.select({
    web: `"${fontFamily}", "DM Sans", ${webSansFallback}`,
    default: fontFamily,
  }) ?? fontFamily;

export const fonts = {
  regular: withWebFallback("DM Sans"),
  medium: withWebFallback("DM Sans Medium"),
  semiBold: withWebFallback("DM Sans SemiBold"),
  bold: withWebFallback("DM Sans Bold"),
  extraBold: withWebFallback("DM Sans ExtraBold"),
};

type TypographyVariant = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
};

const fontWeightMap: Record<string, string> = {
  normal: fonts.regular,
  "400": fonts.regular,
  "500": fonts.medium,
  "600": fonts.semiBold,
  "700": fonts.bold,
  bold: fonts.bold,
  "800": fonts.extraBold,
  "900": fonts.extraBold,
};

export function resolveFontFamily(
  fontWeight?: TextStyle["fontWeight"],
  fallbackFamily: string = fonts.regular,
) {
  if (!fontWeight) return fallbackFamily;
  return fontWeightMap[String(fontWeight)] ?? fallbackFamily;
}

export const typography = {
  displayLarge: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  displayMedium: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  headlineLarge: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  headlineMedium: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 28,
  },
  headlineSmall: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  titleLarge: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  titleMedium: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  titleSmall: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  bodyLarge: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  labelLarge: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
  },
} satisfies Record<string, TypographyVariant>;

export type TypographyKey = keyof typeof typography;

/** Legacy export kept for compat */
export const fontFamily = fonts.regular;
