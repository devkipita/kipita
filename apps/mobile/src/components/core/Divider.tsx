import React, { memo } from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';

interface DividerProps {
  vertical?: boolean;
  style?: ViewStyle;
}

export const Divider = memo(function Divider({ vertical, style }: DividerProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        vertical
          ? { width: 1, height: '100%', backgroundColor: colors.divider }
          : { height: 1, width: '100%', backgroundColor: colors.divider, marginVertical: spacing.sm },
        style,
      ]}
    />
  );
});
