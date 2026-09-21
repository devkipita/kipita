import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../core/Text";
import { Icon, type IconName } from "../core/Icon";
import { spacing, radius } from "@/theme";

export interface WhyItem {
  id: string;
  title: string;
  body: string;
  icon: IconName;
  tint: string;
  ink: string;
  accent: string;
}

export const WhyCard = memo(function WhyCard({ item }: { item: WhyItem }) {
  return (
    <View
      style={[styles.card, { backgroundColor: item.tint }]}
      accessible
      accessibilityLabel={`${item.title}. ${item.body}`}
    >
      <View style={[styles.emblem, { backgroundColor: item.accent + "2E" }]}>
        <Icon name={item.icon} size={24} color={item.accent} />
      </View>
      <Text variant="titleMedium" color={item.ink} align="center" style={styles.title}>
        {item.title}
      </Text>
      <Text variant="bodySmall" color={item.ink} align="center" style={styles.body}>
        {item.body}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 208,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  emblem: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  title: {
    fontWeight: "800",
  },
  body: {
    opacity: 0.78,
    lineHeight: 18,
  },
});
