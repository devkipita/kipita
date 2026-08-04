import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';
import { useTheme } from '@/hooks';
import { initials } from '@/lib/formatters';
import { radius } from '@/theme';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  onPress?: () => void;
}

export const Avatar = memo(function Avatar({ uri, name, size = 40, onPress }: AvatarProps) {
  const { colors } = useTheme();
  const r = size / 2;

  const content = uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: r }}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: colors.primaryContainer,
        },
      ]}
    >
      <Text variant="titleMedium" color={colors.onPrimaryContainer} style={{ fontSize: size * 0.36 }}>
        {initials(name)}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      // NOTE: role is intentionally "imagebutton" (not "button"). On react-native-web
      // this maps to a plain <div> rather than a native <button>, which prevents the
      // "<button> cannot contain a nested <button>" DOM warning when an Avatar is
      // rendered inside a pressable card. On native it still announces as a button.
      <Pressable onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={name}>
        {content}
      </Pressable>
    );
  }
  return content;
});

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
