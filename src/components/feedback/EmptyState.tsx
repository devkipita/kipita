import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../core/Text';
import { Icon, IconName } from '../core/Icon';
import { Button } from '../core/Button';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';

interface EmptyStateProps {
  icon: IconName;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const StaticIcon = memo(function StaticIcon({ name, color }: { name: IconName; color: string }) {
  return (
    <View style={iconStyles.wrapper}>
      <Icon name={name} size={72} color={color} />
    </View>
  );
});

export const EmptyState = memo(function EmptyState({
  icon,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <StaticIcon name={icon} color={colors.textTertiary} />
      <View style={styles.textBlock}>
        <Text variant="bodyMedium" color={colors.textSecondary} align="center">
          {message}
        </Text>
        {actionLabel && onAction && (
          <Button
            label={actionLabel}
            onPress={onAction}
            variant="outlined"
            size="sm"
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.xl,
    minHeight: 240,
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.lg,
  },
});

const iconStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
});
