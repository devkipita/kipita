import React, { memo } from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { typography, TypographyKey } from '@/theme';
import { useTheme } from '@/hooks';

interface TextProps extends RNTextProps {
  variant?: TypographyKey;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export const Text = memo(function Text({
  variant = 'bodyMedium',
  color,
  align,
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[
        typography[variant],
        { color: color ?? colors.text },
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...props}
    />
  );
});
