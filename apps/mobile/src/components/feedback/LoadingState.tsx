import React, { memo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';

interface LoadingStateProps {
  size?: 'small' | 'large';
}

export const LoadingState = memo(function LoadingState({ size = 'large' }: LoadingStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    minHeight: 120,
  },
});
