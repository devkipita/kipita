import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../core/Text';
import { Icon, IconName } from '../core/Icon';
import { Avatar } from '../core/Avatar';
import { useTheme } from '@/hooks';
import { spacing, radius, shadows } from '@/theme';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { resolveCarColor, isLightColor, onColor, mixHex } from '@/lib/utils/carColor';
import type { Trip, RideRequest } from '@/types';

interface TripCardProps {
  /** Works for both rides and requests — shared card */
  item: Trip | RideRequest;
  variant: 'ride' | 'request';
  onPress: () => void;
  onAvatarPress?: () => void;
}

const CARD_W = 300;
const CARD_H = 168;

export const TripCard = memo(function TripCard({ item, variant, onPress, onAvatarPress }: TripCardProps) {
  const { colors, isDark } = useTheme();
  const isRide = variant === 'ride';
  const ride = isRide ? (item as Trip) : undefined;
  const request = !isRide ? (item as RideRequest) : undefined;
  const person = ride?.driver ?? request?.passenger;

  // Accent colour is derived from the vehicle colour (rides). Requests have no
  // vehicle, so they fall back to the brand primary.
  const base = isRide
    ? resolveCarColor(ride?.vehicle?.color, colors.primary)
    : colors.primary;

  const light = isLightColor(base);
  const ink = onColor(base);
  const subInk = light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)';

  // Gradient gives the solid panel depth (like the reference promo card).
  const gradTop = mixHex(base, '#FFFFFF', 0.12);
  const gradBottom = mixHex(base, '#000000', 0.14);

  // Right panel: a light tint of the accent that reads on both themes.
  const rightBg = mixHex(base, isDark ? '#14140F' : '#FFFFFF', isDark ? 0.72 : 0.82);
  const rightIconColor = light ? mixHex(base, '#000000', 0.35) : base;

  // Price "CTA" pill contrasts against the solid panel.
  const pillBg = light ? '#1A1A1F' : 'rgba(255,255,255,0.95)';
  const pillInk = light ? '#FFFFFF' : '#1A1A1F';

  const dateStr = ride
    ? formatDate(ride.departure_date)
    : request?.preferred_date
      ? formatDate(request.preferred_date)
      : 'Flexible';

  const seats = ride ? ride.seats_available : request?.seats_needed ?? 1;
  const rightIcon: IconName = ride ? 'car-sport' : 'person';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
        shadows.md,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.from_location} to ${item.to_location}`}
    >
      <View style={styles.inner}>
        {/* ── Left solid (accent) panel ── */}
        <LinearGradient
          colors={[gradTop, base, gradBottom] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.left}
        >
          {/* Driver / passenger mini-row */}
          <View style={styles.personRow}>
            <Avatar uri={person?.avatar_url} name={person?.full_name ?? '?'} size={26} onPress={onAvatarPress} />
            <Text variant="labelMedium" color={ink} numberOfLines={1} style={styles.personName}>
              {person?.full_name ?? 'Kipita'}
            </Text>
            {person?.is_verified && <Icon name="checkmark-circle" size={14} color={ink} />}
          </View>

          {/* Route headline */}
          <View style={styles.route}>
            <View style={styles.routeLine}>
              <View style={[styles.dot, { backgroundColor: ink }]} />
              <Text variant="titleMedium" color={ink} numberOfLines={1} style={styles.routeText}>
                {item.from_location}
              </Text>
            </View>
            <View style={styles.routeLine}>
              <Icon name="arrow-down" size={11} color={subInk} />
              <Text variant="titleMedium" color={ink} numberOfLines={1} style={styles.routeText}>
                {item.to_location}
              </Text>
            </View>
          </View>

          {/* Price / action pill (like "Order now") */}
          <View style={[styles.pill, { backgroundColor: pillBg }]}>
            {ride ? (
              <>
                <Text variant="labelLarge" color={pillInk}>{formatCurrency(ride.price_per_seat)}</Text>
                <Text variant="caption" color={pillInk} style={styles.pillSub}>/ seat</Text>
              </>
            ) : (
              <Text variant="labelMedium" color={pillInk}>{seats} seat{seats > 1 ? 's' : ''} wanted</Text>
            )}
          </View>
        </LinearGradient>

        {/* ── Right tinted panel ── */}
        <View style={[styles.right, { backgroundColor: rightBg }]}>
          <Icon name={rightIcon} size={34} color={rightIconColor} />
          <View style={styles.seatsWrap}>
            <Text variant="titleMedium" color={colors.text}>{seats}</Text>
            <Text variant="caption" color={colors.textTertiary}>{ride ? 'seats left' : 'needed'}</Text>
          </View>
          <View style={styles.dateWrap}>
            <Icon name="calendar-outline" size={11} color={colors.textTertiary} />
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{dateStr}</Text>
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
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  left: {
    flex: 1.85,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  personName: {
    flex: 1,
  },
  route: {
    gap: 4,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  routeText: {
    flex: 1,
    fontWeight: '800',
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'baseline',
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  seatsWrap: {
    alignItems: 'center',
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
