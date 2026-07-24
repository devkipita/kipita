import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../core/Text';
import { Icon } from '../core/Icon';
import { useTheme, useLocale } from '@/hooks';
import { spacing } from '@/theme';
import { useUIStore } from '@/store';

export const OfflineBanner = memo(function OfflineBanner() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const isOffline = useUIStore(s => s.isOffline);

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.warningContainer }]}>
      <Icon name="cloud-offline-outline" size={16} color={colors.warning} />
      <Text variant="labelSmall" color={colors.warning}>
        {t('error_offline')}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
});
