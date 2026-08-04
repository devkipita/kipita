import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { haptic } from '@/lib/utils/haptics';
import { Text } from '../core/Text';
import { Icon, IconName } from '../core/Icon';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';

interface ToggleProps {
  label: string;
  icon?: IconName;
  value: boolean;
  onToggle: (value: boolean) => void;
}

const TRACK_W = 48;
const TRACK_H = 28;
const THUMB_SIZE = 22;
const TRACK_PAD = 3;

export const Toggle = memo(function Toggle({ label, icon, value, onToggle }: ToggleProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    haptic.light();
    onToggle(!value);
  }, [value, onToggle]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? colors.primary : colors.border, { duration: 200 }),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(value ? TRACK_W - THUMB_SIZE - TRACK_PAD : TRACK_PAD, {
          duration: 200,
        }),
      },
    ],
  }));

  return (
    <Pressable
      style={styles.row}
      onPress={handlePress}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
    >
      <View style={styles.labelRow}>
        {icon && <Icon name={icon} size={20} color={colors.textSecondary} />}
        <Text variant="bodyMedium">{label}</Text>
      </View>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: colors.surface },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
});
