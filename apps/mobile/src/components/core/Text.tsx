import React, { memo } from "react";
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
  StyleSheet,
} from "react-native";
import { typography, TypographyKey, resolveFontFamily } from "@/theme";
import { useTheme } from "@/hooks";

interface TextProps extends RNTextProps {
  variant?: TypographyKey;
  color?: string;
  align?: "left" | "center" | "right";
}

export const Text = memo(function Text({
  variant = "bodyMedium",
  color,
  align,
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();
  const resolvedStyle = StyleSheet.flatten([
    typography[variant],
    { color: color ?? colors.text },
    align ? { textAlign: align } : undefined,
    style,
  ]) as TextStyle;

  resolvedStyle.fontFamily = resolveFontFamily(
    resolvedStyle.fontWeight,
    resolvedStyle.fontFamily ?? typography[variant].fontFamily,
  );
  delete resolvedStyle.fontWeight;

  return <RNText style={resolvedStyle} {...props} />;
});
