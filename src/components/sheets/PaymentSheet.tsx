import React, { memo, useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../core/Text';
import { Icon } from '../core/Icon';
import { Button } from '../core/Button';
import { Divider } from '../core/Divider';
import { useTheme, useLocale } from '@/hooks';
import { spacing, radius } from '@/theme';
import { formatCurrency } from '@/lib/formatters';
import type { Booking, PaymentMethod } from '@/types';

type PaymentStep = 'select' | 'processing' | 'success' | 'failed';

interface PaymentSheetProps {
  booking: Booking;
  onPay: (method: PaymentMethod) => Promise<boolean>;
  onClose: () => void;
}

export const PaymentSheet = memo(function PaymentSheet({ booking, onPay, onClose }: PaymentSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [method, setMethod] = useState<PaymentMethod>('mpesa');
  const [step, setStep] = useState<PaymentStep>('select');

  const handlePay = useCallback(async () => {
    setStep('processing');
    const success = await onPay(method);
    setStep(success ? 'success' : 'failed');
  }, [method, onPay]);

  if (step === 'processing') {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyLarge" align="center">
            {method === 'mpesa' ? t('check_your_phone') : t('loading')}
          </Text>
        </View>
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Icon name="checkmark-circle" size={64} color={colors.success} />
          <Text variant="headlineMedium" align="center">
            {t('payment_success')}
          </Text>
          <Button label={t('done')} onPress={onClose} variant="filled" size="lg" fullWidth />
        </View>
      </View>
    );
  }

  if (step === 'failed') {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Icon name="close-circle" size={64} color={colors.error} />
          <Text variant="headlineMedium" align="center">
            {t('payment_failed')}
          </Text>
          <Button label={t('retry')} onPress={() => setStep('select')} variant="filled" size="lg" fullWidth />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">{t('payment')}</Text>

      {/* Amount */}
      <View style={styles.amountRow}>
        <Text variant="bodyMedium" color={colors.textSecondary}>{t('total')}</Text>
        <Text variant="displayMedium" color={colors.primary}>
          {formatCurrency(booking.total_price)}
        </Text>
      </View>

      <Divider />

      {/* Method selection */}
      <PaymentMethodOption
        label={t('mpesa')}
        icon="phone-portrait-outline"
        selected={method === 'mpesa'}
        onPress={() => setMethod('mpesa')}
        brandColor="#4CAF50"
      />
      <PaymentMethodOption
        label={t('card')}
        icon="card-outline"
        selected={method === 'card'}
        onPress={() => setMethod('card')}
        brandColor="#1976D2"
      />

      <Button
        label={t('pay_now')}
        onPress={handlePay}
        variant="filled"
        size="lg"
        fullWidth
        icon="lock-closed-outline"
      />
    </View>
  );
});

const PaymentMethodOption = memo(function PaymentMethodOption({
  label,
  icon,
  selected,
  onPress,
  brandColor,
}: {
  label: string;
  icon: any;
  selected: boolean;
  onPress: () => void;
  brandColor: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        pmStyles.option,
        {
          borderColor: selected ? brandColor : colors.border,
          backgroundColor: selected ? brandColor + '10' : colors.surface,
        },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Icon name={icon} size={24} color={selected ? brandColor : colors.textSecondary} />
      <Text variant="titleMedium" color={selected ? brandColor : colors.text} style={pmStyles.label}>
        {label}
      </Text>
      <Icon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? brandColor : colors.textTertiary}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  amountRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing['3xl'],
  },
});

const pmStyles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  label: { flex: 1 },
});
