import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '../core/Text';
import { Icon } from '../core/Icon';
import { useTheme } from '@/hooks';
import { spacing, radius } from '@/theme';
import { formatRelativeTime } from '@/lib/formatters';
import type { AppNotification, NotificationType } from '@/types';
import type { IconName } from '../core/Icon';

const NOTIF_ICONS: Record<NotificationType, IconName> = {
  ride_match: 'car-outline',
  request_match: 'hand-right-outline',
  payment_success: 'checkmark-circle-outline',
  payment_failed: 'close-circle-outline',
  trip_started: 'navigate-outline',
  trip_completed: 'flag-outline',
  new_message: 'chatbubble-outline',
  new_alert: 'megaphone-outline',
  system: 'information-circle-outline',
};

interface NotificationCardProps {
  notification: AppNotification;
  onPress: () => void;
}

export const NotificationCard = memo(function NotificationCard({
  notification,
  onPress,
}: NotificationCardProps) {
  const { colors } = useTheme();
  const icon = NOTIF_ICONS[notification.type];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: notification.read ? colors.card : colors.primaryContainer,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceVariant }]}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text variant="titleSmall" numberOfLines={1}>
          {notification.title}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>
      <Text variant="caption" color={colors.textTertiary}>
        {formatRelativeTime(notification.created_at)}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
});
