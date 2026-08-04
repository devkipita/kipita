import React, { memo, useRef } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { useTheme, useAppMode, useLocale } from "@/hooks";
import { spacing, radius } from "@/theme";
import { statusTone, STATUS_ICON, STATUS_LABEL_KEY } from "@/theme/statusTone";
import { formatDate, formatTime, formatCurrency } from "@/lib/formatters";
import type { Booking } from "@/types";
import type { TranslationKey } from "@/lib/i18n/en";

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onAvatarPress?: () => void;
}

/**
 * A shared ride is a shared *ticket* — so the card is a boarding-pass: a
 * status-tonal top stub carries the route and fare, a punched perforation
 * separates it, and a neutral lower stub carries the person you're travelling
 * with and the schedule. This is a peer match (one driver, one shared trip),
 * not a storefront — so there's no "rebook"; the person is the point.
 *
 * The four M3 systems:
 * · COLOUR — the top stub is a tonal *container* in the status role (amber =
 *   needs payment, green = booked, blue = live, deep green = done, red =
 *   cancelled); the accent role paints the route line, car and status dot. All
 *   status colour is contained to the stub; the lower half stays neutral.
 * · TYPOGRAPHY — route endpoints are the hero (`titleMedium`, high-emphasis),
 *   the fare is the boldest number (`titleLarge`), and schedule/among is quiet
 *   supporting text (`labelSmall` / `bodySmall`).
 * · ELEVATION — tone over shadow: the tonal stub does the lifting; only a soft
 *   level-1 shadow grounds the whole pass.
 * · MOTION — a fast, springy press-scale confirms the tap.
 */
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
      accessibilityLabel={`${ride?.from_location} to ${ride?.to_location}, ${label}, ${formatCurrency(booking.total_price)}`}
    >
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceContainerLow, transform: [{ scale }] },
        ]}
      >
        {/* Top stub — status tone carries the route + fare. */}
        <View style={[styles.stubTop, { backgroundColor: tone.container }]}>
          <View style={styles.stubHead}>
            <View style={[styles.statusChip, { backgroundColor: tone.accent }]}>
              {isLive ? (
                <View style={[styles.liveDot, { backgroundColor: tone.onAccent }]} />
              ) : (
                <Icon name={icon} size={12} color={tone.onAccent} />
              )}
              <Text variant="labelSmall" color={tone.onAccent}>
                {label}
              </Text>
            </View>
            <Text variant="titleLarge" color={tone.onContainer}>
              {formatCurrency(booking.total_price)}
            </Text>
          </View>

          {ride && (
            <View style={styles.routeRow}>
              <View style={styles.routeEnd}>
                <Text variant="labelSmall" color={tone.onContainer} style={styles.caption}>
                  {t("from")}
                </Text>
                <Text variant="titleMedium" color={tone.onContainer} numberOfLines={1}>
                  {ride.from_location}
                </Text>
              </View>

              <View style={styles.routePath}>
                <View style={[styles.pathLine, { backgroundColor: tone.accent }]} />
                <Icon name="car-sport" size={18} color={tone.accent} />
                <View style={[styles.pathLine, { backgroundColor: tone.accent }]} />
                <Icon name="caret-forward" size={12} color={tone.accent} />
              </View>

              <View style={[styles.routeEnd, styles.routeEndRight]}>
                <Text variant="labelSmall" color={tone.onContainer} style={styles.caption}>
                  {t("to")}
                </Text>
                <Text
                  variant="titleMedium"
                  color={tone.onContainer}
                  numberOfLines={1}
                  align="right"
                >
                  {ride.to_location}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Perforation — punched notches + dashed line = the ticket tear. */}
        <View style={[styles.perf, { backgroundColor: tone.container }]}>
          <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.background }]} />
          <View style={styles.dashes}>
            {Array.from({ length: 22 }).map((_, i) => (
              <View
                key={i}
                style={[styles.dash, { backgroundColor: colors.surfaceContainerLow }]}
              />
            ))}
          </View>
          <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.background }]} />
        </View>

        {/* Lower stub — neutral: who you're sharing with + when. */}
        <View style={[styles.stubBottom, { backgroundColor: colors.surfaceContainerLow }]}>
          <Pressable style={styles.person} onPress={onAvatarPress} hitSlop={6}>
            <Avatar uri={person?.avatar_url} name={person?.full_name ?? "?"} size={40} />
            <View style={styles.flex}>
              <Text variant="titleSmall" color={colors.text} numberOfLines={1}>
                {person?.full_name}
              </Text>
              <Text variant="labelSmall" color={colors.textSecondary}>
                {isDriver ? t("passenger") : t("driver")}
              </Text>
            </View>
          </Pressable>

          {ride && (
            <View style={styles.metaRow}>
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

const NOTCH = 20;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  flex: { flex: 1 },
  // Top stub
  stubTop: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  stubHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  routeEnd: { flex: 1, gap: 2 },
  routeEndRight: { alignItems: "flex-end" },
  caption: { textTransform: "uppercase", letterSpacing: 1 },
  routePath: {
    flex: 1.1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pathLine: { flex: 1, height: 1.5, opacity: 0.5, borderRadius: 1 },
  // Perforation
  perf: {
    height: NOTCH,
    justifyContent: "center",
  },
  notch: {
    position: "absolute",
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    top: 0,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  dashes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: NOTCH / 2 + spacing.xs,
  },
  dash: { width: 6, height: 1.5, borderRadius: 1 },
  // Lower stub
  stubBottom: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: spacing.xxs,
  },
});
