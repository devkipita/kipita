import React, { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { useTheme, useAppMode, useLocale } from "@/hooks";
import { spacing, radius, shadows } from "@/theme";
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
 * A booking's colour comes from its *status*, not the vehicle — so the trips
 * list reads as a clear timeline: amber = needs payment, green = booked, blue =
 * live, deep green = completed, red = cancelled. The card is a two-panel split:
 * a pure-black main panel (~70%) carrying who / route / schedule, and a tonal
 * status panel (~30%) that carries the booking's state accent.
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
  const otherPerson = isDriver ? booking.passenger : booking.driver;
  const isLive = booking.status === "in_progress";

  const metaItems = ride
    ? [
        {
          icon: "calendar-outline" as const,
          label: formatDate(ride.departure_date),
        },
        {
          icon: "time-outline" as const,
          label: formatTime(ride.departure_time),
        },
        {
          icon: "people-outline" as const,
          label: `${booking.seats_booked} seat${booking.seats_booked > 1 ? "s" : ""}`,
        },
      ]
    : [];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.96 : 1 },
        shadows.sm,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.inner}>
        {/* Main panel — pure black. */}
        <View style={styles.mainPanel}>
          <View style={styles.topRow}>
            <Avatar
              uri={otherPerson?.avatar_url}
              name={otherPerson?.full_name ?? "?"}
              size={36}
              onPress={onAvatarPress}
            />
            <View style={styles.info}>
              <Text variant="titleSmall" color="#FFFFFF" numberOfLines={1}>
                {otherPerson?.full_name}
              </Text>
              <View
                style={[styles.statusBadge, { backgroundColor: tone.container }]}
              >
                {isLive && (
                  <View style={[styles.liveDot, { backgroundColor: tone.accent }]} />
                )}
                <Icon name={icon} size={13} color={tone.onContainer} />
                <Text variant="labelSmall" color={tone.onContainer}>
                  {label}
                </Text>
              </View>
            </View>
          </View>

          {ride && (
            <View style={styles.routeRow}>
              <Icon name="ellipse" size={6} color={tone.accent} />
              <Text
                variant="bodySmall"
                color="#FFFFFF"
                numberOfLines={1}
                style={styles.flex}
              >
                {ride.from_location}
              </Text>
              <Icon name="arrow-forward" size={14} color="rgba(255,255,255,0.5)" />
              <Icon name="location" size={12} color={tone.accent} />
              <Text
                variant="bodySmall"
                color="#FFFFFF"
                numberOfLines={1}
                style={styles.flex}
              >
                {ride.to_location}
              </Text>
            </View>
          )}

          {ride && (
            <View style={styles.metaRow}>
              {metaItems.map((item) => (
                <View
                  key={`${booking.id}-${item.icon}`}
                  style={[
                    styles.metaPill,
                    { backgroundColor: "rgba(255,255,255,0.08)" },
                  ]}
                >
                  <Icon name={item.icon} size={14} color="rgba(255,255,255,0.7)" />
                  <Text variant="labelMedium" color="rgba(255,255,255,0.7)">
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Side panel — carries the status tone as a tonal container. */}
        <View style={[styles.sidePanel, { backgroundColor: tone.container }]}>
          <View style={[styles.iconBadge, { backgroundColor: tone.accent }]}>
            <Icon name={icon} size={20} color={tone.onAccent} />
          </View>
          <Text variant="titleSmall" color={tone.onContainer} align="center">
            {formatCurrency(booking.total_price)}
          </Text>
          <Text variant="labelMedium" color={tone.onContainer} align="center">
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    minHeight: 148,
  },
  mainPanel: {
    flex: 2.2,
    backgroundColor: "#000000",
    padding: spacing.lg,
    gap: spacing.md,
  },
  sidePanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  flex: { flex: 1 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
