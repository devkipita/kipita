import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks';

interface AppBackgroundProps {
  children: React.ReactNode;
}

export const AppBackground = memo(function AppBackground({ children }: AppBackgroundProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Background SVG — rendered via expo-image */}
      <Image
        source={require('@/assets/bgOne.svg')}
        style={styles.bg}
        contentFit="cover"
        tintColor={isDark ? colors.primary + '18' : colors.primary + '14'}
        transition={0}
      />
      {/* Gradient overlay to soften the pattern */}
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? 'rgba(17,17,20,0.72)'
              : 'rgba(219,232,214,0.72)',
          },
        ]}
      />
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
