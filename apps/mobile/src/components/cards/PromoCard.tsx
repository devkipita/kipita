import React, { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "../core/Text";
import { Icon, type IconName } from "../core/Icon";
import { useTheme } from "@/hooks";
import { spacing, radius } from "@/theme";

export interface Promo {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  icon: IconName;
  tint: string;
  ink: string;
}

interface PromoCardProps {
  promo: Promo;
  onPress?: () => void;
}

export const PromoCard = memo(function PromoCard({ promo, onPress }: PromoCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${promo.headline}. ${promo.body}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: promo.tint, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text variant="labelSmall" color={promo.ink} style={styles.eyebrow}>
            {promo.eyebrow}
          </Text>
          <Text variant="titleLarge" color={promo.ink} style={styles.headline}>
            {promo.headline}
          </Text>
          <Text variant="bodySmall" color={promo.ink} style={styles.body}>
            {promo.body}
          </Text>
        </View>

        <View style={[styles.emblem, { backgroundColor: promo.ink }]}>
          <Icon name={promo.icon} size={26} color={promo.tint} />
        </View>
      </View>

      <View style={[styles.cta, { backgroundColor: promo.ink }]}>
        <Text variant="labelMedium" color={promo.tint} style={styles.ctaText}>
          {promo.cta}
        </Text>
        <Icon name="arrow-forward" size={14} color={promo.tint} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "800",
    opacity: 0.75,
  },
  headline: {
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  body: {
    opacity: 0.82,
    lineHeight: 18,
  },
  emblem: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    height: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  ctaText: {
    fontWeight: "800",
  },
});
