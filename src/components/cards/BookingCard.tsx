import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '../core/Text';
import { Icon } from '../core/Icon';
import { Avatar } from '../core/Avatar';
import { Chip } from '../core/Chip';
import { useTheme, useAppMode } from '@/hooks';
import { spacing, radius, shadows } from '@/theme';
import { formatDate, formatTime, formatCurrency } from '@/lib/formatters';
import type { Booking, BookingStatus } from '@/types';
import type { IconName } from '../core/Icon';

const STATUS_CONFIG: Record<BookingStatus, { icon: IconName; color: string; label: string }> = {
  pending_payment: { icon: 'time-outline', color: '#FF9800', label: 'Pending' },
  confirmed: { icon: 'checkmark-circle-outline', color: '#4CAF50', label: 'Confirmed' },
  in_progress: { icon: 'navigate-outline', color: '#2196F3', label: 'In Progress' },
  completed: { icon: 'checkmark-done-outline', color: '#66BB6A', label: 'Completed' },
  cancelled: { icon: 'close-circle-outline', color: '#F44336', label: 'Cancelled' },
};

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onAvatarPress?: () => void;
}

export const BookingCard = memo(function BookingCard({ booking, onPress, onAvatarPress }: BookingCardProps) {
  const { colors } = useTheme();
  const { isDriver } = useAppMode();
  const status = STATUS_CONFIG[booking.status];
  const ride = booking.trip;
  const otherPerson = isDriver ? booking.passenger : booking.driver;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.92 : 1 },
        shadows.sm,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <Avatar
          uri={otherPerson?.avatar_url}
          name={otherPerson?.full_name ?? '?'}
          size={36}
          onPress={onAvatarPress}
        />
        <View style={styles.info}>
          <Text variant="titleSmall" numberOfLines={1}>
            {otherPerson?.full_name}
          </Text>
          <View style={styles.statusRow}>
            <Icon name={status.icon} size={14} color={status.color} />
            <Text variant="caption" color={status.color}>{status.label}</Text>
          </View>
        </View>
        <Text variant="titleSmall" color={colors.primary}>
          {formatCurrency(booking.total_price)}
        </Text>
      </View>

      {ride && (
        <View style={styles.routeRow}>
          <Icon name="ellipse" size={6} color={colors.primary} />
          <Text variant="bodySmall" numberOfLines={1} style={styles.flex}>
            {ride.from_location}
          </Text>
          <Icon name="arrow-forward" size={14} color={colors.textTertiary} />
          <Icon name="location" size={6} color={colors.error} />
          <Text variant="bodySmall" numberOfLines={1} style={styles.flex}>
            {ride.to_location}
          </Text>
        </View>
      )}

      {ride && (
        <View style={styles.metaRow}>
          <Chip label={formatDate(ride.departure_date)} icon="calendar-outline" />
          <Chip label={formatTime(ride.departure_time)} icon="time-outline" />
          <Chip label={`${booking.seats_booked} seat${booking.seats_booked > 1 ? 's' : ''}`} icon="people-outline" />
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flex: { flex: 1 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
