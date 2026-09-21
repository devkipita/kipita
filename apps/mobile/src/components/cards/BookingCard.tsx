import React, { memo, useRef } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { useTheme, useAppMode, useLocale, useCityPhoto } from "@/hooks";
import { spacing, radius } from "@/theme";
import { statusTone, STATUS_ICON, STATUS_LABEL_KEY } from "@/theme/statusTone";
import { formatDate, formatTime, formatCurrency } from "@/lib/formatters";
import { cityGradient, cityInitial } from "@/lib/utils/cityImage";
import type { Booking } from "@/types";
import type { TranslationKey } from "@/lib/i18n/en";

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onAvatarPress?: () => void;
}

const HERO_HEIGHT = 152;

export const BookingCard = memo(function BookingCard({
  booking,
  onPress,
  onAvatarPress,
}: BookingCardProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { isDriver } = useAppMode();

  const tone = statusTone(colors, booking.status);
  const icon = STATUS_ICON[booking.status];
  const label = t(STATUS_LABEL_KEY[booking.status] as TranslationKey);
  const ride = booking.trip;
  const person = isDriver ? booking.passenger : booking.driver;
  const isLive = booking.status === "in_progress";

  const destination = ride?.to_location ?? "";
  const origin = ride?.from_location ?? "";
  const photo = useCityPhoto(destination);
  const gradient = cityGradient(destination);

  const scale = useRef(new Animated.Value(1)).current;
  const springTo = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springTo(0.98)}
      onPressOut={() => springTo(1)}
      accessibilityRole="button"
      accessibilityLabel={`${origin} to ${destination}, ${label}, ${formatCurrency(booking.total_price)}`}
    >
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceContainerLow, transform: [{ scale }] },
        ]}
      >
        <View style={styles.hero}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.heroMedia} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroMedia}
            >
              <Text style={styles.monogram}>{cityInitial(destination)}</Text>
            </LinearGradient>
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.78)"]}
            style={styles.scrim}
            pointerEvents="none"
          />

          <View style={[styles.statusChip, { backgroundColor: tone.accent }]}>
            {isLive ? (
              <View style={[styles.liveDot, { backgroundColor: tone.onAccent }]} />
            ) : (
              <Icon name={icon} size={12} color={tone.onAccent} />
            )}
            <Text variant="labelSmall" color={tone.onAccent} style={styles.bold}>
              {label}
            </Text>
          </View>

          <View style={styles.heroCopy}>
            <Text variant="headlineSmall" color="#fff" numberOfLines={1} style={styles.city}>
              {destination}
            </Text>
            <View style={styles.fromRow}>
              <Icon name="navigate" size={12} color="rgba(255,255,255,0.88)" />
              <Text
                variant="bodySmall"
                color="rgba(255,255,255,0.88)"
                numberOfLines={1}
                style={styles.flex}
              >
                {t("from")} {origin}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Pressable style={styles.person} onPress={onAvatarPress} hitSlop={6}>
            <Avatar uri={person?.avatar_url} name={person?.full_name ?? "?"} size={38} />
            <View style={styles.flex}>
              <Text variant="titleSmall" color={colors.text} numberOfLines={1}>
                {person?.full_name}
              </Text>
              <Text variant="labelSmall" color={colors.textSecondary}>
                {isDriver ? t("passenger") : t("driver")}
              </Text>
            </View>
            <Text variant="titleLarge" color={colors.primary} style={styles.bold}>
              {formatCurrency(booking.total_price)}
            </Text>
          </Pressable>

          {ride && (
            <View style={[styles.metaRow, { borderTopColor: colors.divider }]}>
              <Icon name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text variant="bodySmall" color={colors.textSecondary}>
                {formatDate(ride.departure_date)}
              </Text>
              <View style={[styles.metaDot, { backgroundColor: colors.textTertiary }]} />
              <Icon name="time-outline" size={14} color={colors.textSecondary} />
              <Text variant="bodySmall" color={colors.textSecondary}>
                {formatTime(ride.departure_time)}
              </Text>
              <View style={[styles.metaDot, { backgroundColor: colors.textTertiary }]} />
              <Icon name="people-outline" size={14} color={colors.textSecondary} />
              <Text variant="bodySmall" color={colors.textSecondary}>
                {booking.seats_booked}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  flex: { flex: 1 },
  bold: { fontWeight: "800" },
  hero: {
    height: HERO_HEIGHT,
    justifyContent: "flex-end",
  },
  heroMedia: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  monogram: {
    fontSize: 96,
    fontWeight: "900",
    color: "rgba(255,255,255,0.14)",
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusChip: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  heroCopy: {
    padding: spacing.lg,
    gap: 2,
  },
  city: {
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  fromRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: spacing.xxs,
  },
});
