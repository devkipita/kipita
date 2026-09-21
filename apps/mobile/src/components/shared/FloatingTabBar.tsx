import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from '@/components/core/Text';
import { Icon, IconName } from '@/components/core/Icon';
import { useTheme } from '@/hooks';
import { haptic } from '@/lib/utils/haptics';
import { tabBarHidden } from '@/lib/utils/tabBar';
import { spacing, radius, shadows } from '@/theme';

export const FLOATING_TAB_BAR_SPACE = 112;

const BAR_HEIGHT = 58;
const ITEM_HEIGHT = 48;

const ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  home: { active: 'home', inactive: 'home-outline' },
  trips: { active: 'car', inactive: 'car-outline' },
  alerts: { active: 'megaphone', inactive: 'megaphone-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

function oneWord(label: string): string {
  return label.trim().split(/\s+/)[0] ?? label;
}

export const FloatingTabBar = memo(function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const bottom = Math.max(insets.bottom, spacing.md);
  const hideDistance = BAR_HEIGHT + bottom + spacing.xl;

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarHidden.value * hideDistance }],
    opacity: 1 - tabBarHidden.value,
  }));

  useEffect(() => {
    tabBarHidden.value = withTiming(0, { duration: 200 });
  }, [state.index]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View
        style={[
          styles.bar,
          shadows.lg,
          {
            borderColor: colors.glassBorder,
            backgroundColor: isDark
              ? 'rgba(22,24,23,0.82)'
              : 'rgba(255,255,255,0.86)',
          },
          barStyle,
        ]}
      >
        <BlurView
          intensity={36}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, styles.blur]}
        />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const rawLabel =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const label = oneWord(rawLabel);
          const isFocused = state.index === index;
          const icons =
            ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
          const tint = isFocused ? colors.primary : colors.textSecondary;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              haptic.selection();
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
              style={styles.item}
            >
              <View
                style={[
                  styles.iconWell,
                  isFocused && { backgroundColor: colors.primaryContainer },
                ]}
              >
                <Icon
                  name={isFocused ? icons.active : icons.inactive}
                  size={19}
                  color={isFocused ? colors.onPrimaryContainer : tint}
                />
              </View>
              <Text
                variant="labelSmall"
                color={tint}
                numberOfLines={1}
                style={[styles.label, isFocused && styles.labelActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: 380,
    ...(Platform.OS === 'web' ? { width: 'auto' } : null),
  },
  blur: {
    borderRadius: radius.full,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: ITEM_HEIGHT,
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  iconWell: {
    width: 40,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '600',
  },
  labelActive: {
    fontWeight: '800',
  },
});
