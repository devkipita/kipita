import { TextStyle } from "react-native";

/**
 * Rounded app font family.
 * Uses loaded Nunito weights for native consistency.
 */
export const fonts = {
  regular: "Nunito_400Regular",
  medium: "Nunito_500Medium",
  semiBold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extraBold: "Nunito_800ExtraBold",
};

type TypographyVariant = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle["fontWeight"];
  letterSpacing?: number;
};

export const typography = {
  displayLarge: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800" as const,
    letterSpacing: -0.3,
  },
  displayMedium: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
    letterSpacing: -0.2,
  },
  headlineLarge: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },
  headlineMedium: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700" as const,
  },
  headlineSmall: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  titleLarge: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600" as const,
  },
  titleMedium: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600" as const,
  },
  titleSmall: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600" as const,
  },
  bodyLarge: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodyMedium: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  labelLarge: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  labelMedium: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  labelSmall: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500" as const,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "400" as const,
  },
} satisfies Record<string, TypographyVariant>;

export type TypographyKey = keyof typeof typography;

/** Legacy export kept for compat */
export const fontFamily = fonts.regular;
