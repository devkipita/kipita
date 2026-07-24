import React, { memo } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Text } from '../core/Text';
import { Avatar } from '../core/Avatar';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import { Divider } from '../core/Divider';
import { useTheme, useLocale } from '@/hooks';
import { spacing } from '@/theme';
import { formatRating, formatPhone } from '@/lib/formatters';
import type { User } from '@/types';

interface PersonSheetProps {
  user: User;
  onMessage?: () => void;
}

export const PersonSheet = memo(function PersonSheet({ user, onMessage }: PersonSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();

  const handleCall = () => {
    if (user.phone) {
      Linking.openURL(`tel:${user.phone}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar uri={user.avatar_url} name={user.full_name} size={64} />
        <View style={styles.headerInfo}>
          <Text variant="headlineSmall">{user.full_name}</Text>
          <View style={styles.verifiedRow}>
            <Icon
              name={user.is_verified ? 'checkmark-circle' : 'alert-circle-outline'}
              size={16}
              color={user.is_verified ? colors.success : colors.warning}
            />
            <Text variant="labelSmall" color={user.is_verified ? colors.success : colors.warning}>
              {t(user.is_verified ? 'verified' : 'unverified')}
            </Text>
          </View>
        </View>
      </View>

      <Divider />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Icon name="star" size={20} color="#FFC107" />
          <Text variant="titleMedium">{formatRating(user.rating)}</Text>
          <Text variant="caption" color={colors.textTertiary}>{t('rating')}</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="car-outline" size={20} color={colors.primary} />
          <Text variant="titleMedium">{user.total_trips}</Text>
          <Text variant="caption" color={colors.textTertiary}>{t('total_trips')}</Text>
        </View>
      </View>

      <Divider />

      {/* Contact */}
      {user.phone && (
        <View style={styles.contactRow}>
          <Icon name="call-outline" size={18} color={colors.textSecondary} />
          <Text variant="bodyMedium" color={colors.textSecondary}>
            {formatPhone(user.phone)}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {user.phone && (
          <Button
            label={t('call')}
            onPress={handleCall}
            variant="outlined"
            icon="call-outline"
            size="md"
          />
        )}
        {onMessage && (
          <Button
            label={t('message')}
            onPress={onMessage}
            variant="filled"
            icon="chatbubble-outline"
            size="md"
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
