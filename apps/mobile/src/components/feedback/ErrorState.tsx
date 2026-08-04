import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../core/Text';
import { Icon } from '../core/Icon';
import { Button } from '../core/Button';
import { useTheme } from '@/hooks';
import { useLocale } from '@/hooks';
import { spacing } from '@/theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = memo(function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  return (
    <View style={styles.container}>
      <Icon name="alert-circle-outline" size={48} color={colors.error} />
      <Text variant="bodyMedium" color={colors.textSecondary} align="center">
        {message ?? t('error_generic')}
      </Text>
      {onRetry && (
        <Button label={t('retry')} onPress={onRetry} variant="outlined" size="sm" icon="refresh-outline" />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
    minHeight: 200,
  },
});
