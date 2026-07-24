import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks';
import { radius } from '@/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  borderRadius?: number;
  intensity?: number;
  padding?: number;
}

export const GlassCard = memo(function GlassCard({
  children,
  style,
  borderRadius: br = radius.xl,
  intensity = 18,
  padding,
}: GlassCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[{ borderRadius: br, overflow: 'hidden' }, style]}>
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.blur, padding !== undefined ? { padding } : null]}
      >
        {/* Glass surface overlay */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.glassBg,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              borderRadius: br,
            },
          ]}
        />
        {/* Content above overlay */}
        <View style={styles.content}>
          {children}
        </View>
      </BlurView>
    </View>
  );
});

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
  },
});
