import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "./Text";
import { useTheme } from "@/hooks";
import { spacing } from "@/theme";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  first?: boolean;
}

export const SectionHeading = memo(function SectionHeading({
  title,
  subtitle,
  first,
}: SectionHeadingProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.wrap, first && styles.first]}
      accessibilityRole="header"
    >
      <Text variant="headlineSmall" color={colors.text} style={styles.title}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="bodyMedium" color={colors.textSecondary} style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
    paddingTop: spacing.lg,
  },
  first: {
    paddingTop: 0,
  },
  title: {
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    lineHeight: 20,
  },
});
