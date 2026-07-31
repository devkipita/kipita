import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../core/Text';
import { Icon, IconName } from '../core/Icon';
import { Button } from '../core/Button';
import { useTheme } from '@/hooks';
import { spacing, radius } from '@/theme';

// Brand tan — a subtle translucent tan fill with tan text, like a status pill.
const CHIP_BG = 'rgba(212,184,150,0.16)';
const CHIP_TEXT = '#D4B896';

interface EmptyStateProps {
  icon: IconName;
  /** Optional illustration shown instead of the icon (e.g. an imported SVG element). */
  illustration?: React.ReactNode;
  message: string;
  /** Render the action as a rounded tan pill button instead of the outlined default. */
  chip?: boolean;
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
  illustration,
  message,
  chip,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {illustration ? (
        <View style={iconStyles.wrapper}>{illustration}</View>
      ) : (
        <StaticIcon name={icon} color={colors.textTertiary} />
      )}
      <View style={styles.textBlock}>
        {chip && actionLabel && onAction ? (
          // Single-line pill: status + action combined into one tappable button.
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${message}. ${actionLabel}`}
          >
            <Text variant="labelLarge" color={colors.textSecondary} numberOfLines={1}>
              {message}
            </Text>
            <Text variant="labelLarge" color={CHIP_TEXT}>
              ·
            </Text>
            <Text variant="labelLarge" color={CHIP_TEXT} style={styles.bold} numberOfLines={1}>
              {actionLabel}
            </Text>
            <Icon name="arrow-forward" size={15} color={CHIP_TEXT} />
          </Pressable>
        ) : (
          <>
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
          </>
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    minHeight: 180,
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: CHIP_BG,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    alignSelf: 'center',
  },
  chipPressed: {
    opacity: 0.6,
  },
  bold: {
    fontWeight: '700',
  },
});

const iconStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
});
