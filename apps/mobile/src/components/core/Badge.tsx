import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/hooks';

interface BadgeProps {
  count: number;
  size?: number;
}

export const Badge = memo(function Badge({ count, size = 18 }: BadgeProps) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View
      style={[
        styles.badge,
        {
          minWidth: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.badge,
        },
      ]}
    >
      <Text variant="caption" color={colors.badgeText} style={{ fontSize: size * 0.6 }}>
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
