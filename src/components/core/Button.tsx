import React, { memo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { haptic } from '@/lib/utils/haptics';
import { Text } from './Text';
import { Icon, IconName } from './Icon';
import { useTheme } from '@/hooks';
import { spacing, radius } from '@/theme';

type ButtonVariant = 'filled' | 'outlined' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const sizeMap: Record<ButtonSize, { h: number; px: number; textVariant: 'labelMedium' | 'labelLarge' | 'titleMedium'; iconSize: number }> = {
  sm: { h: 36, px: spacing.md, textVariant: 'labelMedium', iconSize: 16 },
  md: { h: 44, px: spacing.lg, textVariant: 'labelLarge', iconSize: 20 },
  lg: { h: 52, px: spacing.xl, textVariant: 'titleMedium', iconSize: 22 },
};

export const Button = memo(function Button({
  label,
  onPress,
  variant = 'filled',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const s = sizeMap[size];

  const handlePress = useCallback(() => {
    haptic.light();
    onPress();
  }, [onPress]);

  const isFilled = variant === 'filled';
  const isOutlined = variant === 'outlined';

  const bg = isFilled ? colors.primary : 'transparent';
  const borderColor = isOutlined ? colors.primary : 'transparent';
  const textColor = isFilled ? colors.onPrimary : colors.primary;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.h,
          paddingHorizontal: s.px,
          backgroundColor: bg,
          borderColor,
          borderWidth: isOutlined ? 1.5 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && <Icon name={icon} size={s.iconSize} color={textColor} />}
          <Text
            variant={s.textVariant}
            color={textColor}
            style={[icon ? { marginLeft: spacing.sm } : undefined, iconRight ? { marginRight: spacing.sm } : undefined]}
          >
            {label}
          </Text>
          {iconRight && <Icon name={iconRight} size={s.iconSize} color={textColor} />}
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    gap: 6,
  },
  fullWidth: {
    width: '100%',
  },
});
