import React, { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks';

export type IconName = keyof typeof Ionicons.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon = memo(function Icon({ name, size = 24, color }: IconProps) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.text} />;
});
