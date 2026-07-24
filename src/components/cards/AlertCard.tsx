import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '../core/Text';
import { Icon } from '../core/Icon';
import { Avatar } from '../core/Avatar';
import { useTheme } from '@/hooks';
import { spacing, radius, shadows } from '@/theme';
import { formatRelativeTime, truncate } from '@/lib/formatters';
import type { Alert, AlertCategory } from '@/types';
import type { IconName } from '../core/Icon';

const CATEGORY_ICONS: Record<AlertCategory, IconName> = {
  traffic: 'car-outline',
  accident: 'warning-outline',
  road_closure: 'close-circle-outline',
  weather: 'rainy-outline',
  police: 'shield-outline',
  general: 'megaphone-outline',
};

const CATEGORY_COLORS: Record<AlertCategory, string> = {
  traffic: '#FF9800',
  accident: '#F44336',
  road_closure: '#E91E63',
  weather: '#2196F3',
  police: '#9C27B0',
  general: '#607D8B',
};

interface AlertCardProps {
  alert: Alert;
  compact?: boolean;
  onPress: () => void;
}

export const AlertCard = memo(function AlertCard({ alert, compact, onPress }: AlertCardProps) {
  const { colors } = useTheme();
  const catIcon = CATEGORY_ICONS[alert.category];
  const catColor = CATEGORY_COLORS[alert.category];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
          opacity: pressed ? 0.92 : 1,
        },
        compact && styles.cardCompact,
        shadows.sm,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
          <Icon name={catIcon} size={16} color={catColor} />
        </View>
        <View style={styles.headerText}>
          <Text variant="labelMedium" color={catColor}>
            {alert.location}
          </Text>
          <Text variant="caption" color={colors.textTertiary}>
            {formatRelativeTime(alert.created_at)}
          </Text>
        </View>
        {alert.user && (
          <Avatar uri={alert.user.avatar_url} name={alert.user.full_name} size={24} />
        )}
      </View>

      <Text variant="bodySmall" numberOfLines={compact ? 2 : 4}>
        {compact ? truncate(alert.content, 80) : alert.content}
      </Text>

      {!compact && (
        <View style={styles.actions}>
          <View style={styles.actionItem}>
            <Icon name="heart-outline" size={16} color={colors.textTertiary} />
            <Text variant="caption" color={colors.textTertiary}>
              {alert.reactions_count}
            </Text>
          </View>
          <View style={styles.actionItem}>
            <Icon name="chatbubble-outline" size={16} color={colors.textTertiary} />
            <Text variant="caption" color={colors.textTertiary}>
              {alert.comments_count}
            </Text>
          </View>
          <View style={styles.actionItem}>
            <Icon name="share-outline" size={16} color={colors.textTertiary} />
          </View>
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
    gap: spacing.sm,
  },
  cardCompact: {
    width: 260,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  catBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingTop: spacing.xs,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
