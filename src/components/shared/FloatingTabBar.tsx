import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from '@/components/core/Text';
import { Icon, IconName } from '@/components/core/Icon';
import { useTheme } from '@/hooks';
import { haptic } from '@/lib/utils/haptics';
import { spacing, radius, shadows } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Space the floating bar occupies at the bottom — screens should pad by this. */
export const FLOATING_TAB_BAR_SPACE = 108;

const BAR_HEIGHT = 64;

/** Active / inactive icon pairs per route. */
const ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  home: { active: 'home', inactive: 'home-outline' },
  trips: { active: 'car', inactive: 'car-outline' },
  alerts: { active: 'megaphone', inactive: 'megaphone-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

export const FloatingTabBar = memo(function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const bottom = Math.max(insets.bottom, spacing.md);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom }]}
    >
      <View
        style={[
          styles.bar,
          shadows.lg,
          {
            borderColor: colors.glassBorder,
            backgroundColor: isDark ? 'rgba(28,28,32,0.72)' : 'rgba(255,255,255,0.72)',
          },
        ]}
      >
        {/* Frosted backdrop */}
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, styles.blur]}
        />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const isFocused = state.index === index;
          const icons = ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

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

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <AnimatedPressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
              layout={LinearTransition.springify().damping(18).stiffness(180)}
              style={[
                styles.item,
                isFocused && { backgroundColor: colors.primary },
              ]}
            >
              <Icon
                name={isFocused ? icons.active : icons.inactive}
                size={22}
                color={isFocused ? colors.onPrimary : colors.tabInactive}
              />
              {isFocused && (
                <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
                  <Text variant="labelMedium" color={colors.onPrimary} style={styles.label}>
                    {label}
                  </Text>
                </Animated.View>
              )}
            </AnimatedPressable>
          );
        })}
      </View>
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
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    // Constrain width so it reads as a floating pill, not a full-width bar.
    maxWidth: 420,
    ...(Platform.OS === 'web' ? { width: 'auto' } : null),
  },
  blur: {
    borderRadius: radius.full,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    minWidth: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  label: {
    marginLeft: spacing.xs,
  },
});
