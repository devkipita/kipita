import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Icon, IconName } from './Icon';
import { useTheme } from '@/hooks';
import { spacing, radius } from '@/theme';

interface ChipProps {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
}

export const Chip = memo(function Chip({ label, icon, selected, onPress }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primaryContainer : colors.surfaceVariant,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon && <Icon name={icon} size={16} color={selected ? colors.primary : colors.textSecondary} />}
      <Text
        variant="labelMedium"
        color={selected ? colors.primary : colors.textSecondary}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
