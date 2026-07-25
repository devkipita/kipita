import React, { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "../core/Text";
import { Icon, IconName } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { VerifiedBadgeIcon } from "../core/VerifiedBadgeIcon";
import { useTheme } from "@/hooks";
import { spacing, radius, shadows } from "@/theme";
import { formatDate, formatCurrency } from "@/lib/formatters";
import {
  createTonalCardScheme,
  resolveCarColor,
  resolveRequestColorSource,
} from "@/lib/utils/carColor";
import type { Trip, RideRequest } from "@/types";

interface TripCardProps {
  /** Works for both rides and requests — shared card */
  item: Trip | RideRequest;
  variant: "ride" | "request";
  onPress: () => void;
  onAvatarPress?: () => void;
}

const CARD_W = 300;
const CARD_H = 168;
const VERIFIED_BADGE_STROKE = "#1F4734";
const VERIFIED_BADGE_FILL = "#96C93D";

export const TripCard = memo(function TripCard({
  item,
  variant,
  onPress,
  onAvatarPress,
}: TripCardProps) {
  const { colors, isDark } = useTheme();
  const isRide = variant === "ride";
  const ride = isRide ? (item as Trip) : undefined;
  const request = !isRide ? (item as RideRequest) : undefined;
  const person = ride?.driver ?? request?.passenger;

  // Accent colour is derived from the vehicle colour (rides). Requests have no
  // vehicle, so they fall back to the brand primary.
  const rideSource = isRide
    ? resolveCarColor(ride?.vehicle?.color, colors.primary)
    : colors.primary;
  const requestSeed = [
    request?.passenger_id,
    request?.passenger?.full_name,
    request?.passenger?.city,
    request?.from_location,
    request?.to_location,
  ]
    .filter(Boolean)
    .join("|");
  const requestSource = resolveRequestColorSource(requestSeed, colors.primary);
  const scheme = createTonalCardScheme(
    isRide ? rideSource : requestSource,
    isDark,
    isRide ? "ride" : "request",
  );

  const dateStr = ride
    ? formatDate(ride.departure_date)
    : request?.preferred_date
      ? formatDate(request.preferred_date)
      : "Flexible";

  const seats = ride ? ride.seats_available : (request?.seats_needed ?? 1);
  const rightIcon: IconName = ride ? "car-sport" : "person";
  const rightCountVariant = isRide ? "headlineSmall" : "titleMedium";
  const rightMetaVariant = isRide ? "labelMedium" : "caption";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: scheme.leftBg,
          borderColor: scheme.outline,
        },
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
        shadows.md,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.from_location} to ${item.to_location}`}
    >
      <View style={styles.inner}>
        <View style={[styles.left, { backgroundColor: scheme.leftBg }]}>
          {/* Driver / passenger mini-row */}
          <View style={styles.personRow}>
            <Avatar
              uri={person?.avatar_url}
              name={person?.full_name ?? "?"}
              size={26}
              onPress={onAvatarPress}
            />
            <Text
              variant="labelMedium"
              color={scheme.leftInk}
              numberOfLines={1}
              style={styles.personName}
            >
              {person?.full_name ?? "Kipita"}
            </Text>
            {person?.is_verified && (
              <VerifiedBadgeIcon
                size={19}
                stroke={VERIFIED_BADGE_STROKE}
                fill={VERIFIED_BADGE_FILL}
                strokeWidth={2.1}
              />
            )}
          </View>

          {/* Route headline */}
          <View style={styles.route}>
            <View style={styles.routeLine}>
              <View
                style={[styles.dot, { backgroundColor: scheme.leftAccent }]}
              />
              <Text
                variant="titleMedium"
                color={scheme.leftInk}
                numberOfLines={1}
                style={styles.routeText}
              >
                {item.from_location}
              </Text>
            </View>
            <View style={styles.routeLine}>
              <Icon name="arrow-down" size={11} color={scheme.leftMuted} />
              <Text
                variant="titleMedium"
                color={scheme.leftInk}
                numberOfLines={1}
                style={styles.routeText}
              >
                {item.to_location}
              </Text>
            </View>
          </View>

          {/* Price / action pill (like "Order now") */}
          <View style={[styles.pill, { backgroundColor: scheme.pillBg }]}>
            {ride ? (
              <>
                <Text variant="labelLarge" color={scheme.pillInk}>
                  {formatCurrency(ride.price_per_seat)}
                </Text>
                <Text
                  variant="caption"
                  color={scheme.pillInk}
                  style={styles.pillSub}
                >
                  / seat
                </Text>
              </>
            ) : (
              <Text variant="labelMedium" color={scheme.pillInk}>
                {seats} seat{seats > 1 ? "s" : ""} wanted
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.right,
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
            <Icon name={rightIcon} size={30} color={scheme.rightAccent} />
          </View>
          <View style={styles.seatsWrap}>
            <Text variant={rightCountVariant} color={scheme.rightInk}>
              {seats}
            </Text>
            <Text variant={rightMetaVariant} color={scheme.rightInk}>
              {ride ? "seats left" : "needed"}
            </Text>
          </View>
          <View style={styles.dateWrap}>
            <Icon name="calendar-outline" size={11} color={scheme.rightInk} />
            <Text
              variant={rightMetaVariant}
              color={scheme.rightInk}
              numberOfLines={1}
            >
              {dateStr}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  left: {
    flex: 2.33,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  personName: {
    flex: 1,
  },
  route: {
    gap: 4,
  },
  routeLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  routeText: {
    flex: 1,
    fontWeight: "800",
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: 4,
  },
  pillSub: {
    opacity: 0.8,
  },
  right: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 1,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  seatsWrap: {
    alignItems: "center",
  },
  dateWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
});
