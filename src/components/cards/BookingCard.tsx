import React, { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { useTheme, useAppMode } from "@/hooks";
import { spacing, radius, shadows } from "@/theme";
import { formatDate, formatTime, formatCurrency } from "@/lib/formatters";
import { createTonalCardScheme, resolveCarColor } from "@/lib/utils/carColor";
import type { Booking, BookingStatus } from "@/types";
import type { IconName } from "../core/Icon";

const STATUS_CONFIG: Record<
  BookingStatus,
  { icon: IconName; color: string; label: string }
> = {
  pending_payment: { icon: "time-outline", color: "#D4B896", label: "Pending" },
  confirmed: {
    icon: "checkmark-circle-outline",
    color: "#2F6C4F",
    label: "Confirmed",
  },
  in_progress: {
    icon: "navigate-outline",
    color: "#2196F3",
    label: "In Progress",
  },
  completed: {
    icon: "checkmark-done-outline",
    color: "#9EC5A2",
    label: "Completed",
  },
  cancelled: {
    icon: "close-circle-outline",
    color: "#D4B896",
    label: "Cancelled",
  },
};

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onAvatarPress?: () => void;
}

const STATUS_SOURCE: Record<BookingStatus, string> = {
  pending_payment: "#B88912",
  confirmed: "#2F6C4F",
  in_progress: "#1167D8",
  completed: "#00786B",
  cancelled: "#C9342C",
};

export const BookingCard = memo(function BookingCard({
  booking,
  onPress,
  onAvatarPress,
}: BookingCardProps) {
  const { colors, isDark } = useTheme();
  const { isDriver } = useAppMode();
  const status = STATUS_CONFIG[booking.status];
  const ride = booking.trip;
  const otherPerson = isDriver ? booking.passenger : booking.driver;
  const source = ride?.vehicle?.color
    ? resolveCarColor(ride.vehicle.color, STATUS_SOURCE[booking.status])
    : STATUS_SOURCE[booking.status];
  const scheme = createTonalCardScheme(source, isDark, "ride");

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
        {
          backgroundColor: scheme.leftBg,
          borderColor: scheme.outline,
          opacity: pressed ? 0.96 : 1,
        },
        shadows.sm,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.inner}>
        <View style={styles.mainPanel}>
          <View style={styles.topRow}>
            <Avatar
              uri={otherPerson?.avatar_url}
              name={otherPerson?.full_name ?? "?"}
              size={36}
              onPress={onAvatarPress}
            />
            <View style={styles.info}>
              <Text
                variant="titleSmall"
                color={scheme.leftInk}
                numberOfLines={1}
              >
                {otherPerson?.full_name}
              </Text>
              <View style={styles.statusRow}>
                <Icon name={status.icon} size={14} color={scheme.leftAccent} />
                <Text variant="caption" color={scheme.leftAccent}>
                  {status.label}
                </Text>
              </View>
            </View>
          </View>

          {ride && (
            <View style={styles.routeRow}>
              <Icon name="ellipse" size={6} color={scheme.leftAccent} />
              <Text
                variant="bodySmall"
                color={scheme.leftInk}
                numberOfLines={1}
                style={styles.flex}
              >
                {ride.from_location}
              </Text>
              <Icon name="arrow-forward" size={14} color={scheme.leftMuted} />
              <Icon name="location" size={12} color={scheme.leftAccent} />
              <Text
                variant="bodySmall"
                color={scheme.leftInk}
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
                    {
                      backgroundColor: scheme.pillBg,
                      borderColor: scheme.outline,
                    },
                  ]}
                >
                  <Icon name={item.icon} size={14} color={scheme.pillInk} />
                  <Text variant="labelMedium" color={scheme.pillInk}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View
          style={[
            styles.sidePanel,
            {
              backgroundColor: scheme.rightBg,
              borderLeftColor: scheme.outline,
            },
          ]}
        >
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: scheme.rightAccentSoft },
            ]}
          >
            <Icon name={status.icon} size={20} color={scheme.rightAccent} />
          </View>
          <Text variant="titleSmall" color={scheme.rightInk} align="center">
            {formatCurrency(booking.total_price)}
          </Text>
          <Text variant="labelMedium" color={scheme.rightInk} align="center">
            {status.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    minHeight: 148,
  },
  mainPanel: {
    flex: 2.2,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sidePanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    borderWidth: 1,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
