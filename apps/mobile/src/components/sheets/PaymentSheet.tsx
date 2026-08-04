import React, { memo, useState, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Text } from '../core/Text';
import { Icon } from '../core/Icon';
import { Button } from '../core/Button';
import { Divider } from '../core/Divider';
import { PaymentResultAnimation } from '../shared/PaymentResultAnimation';
import { useTheme, useLocale } from '@/hooks';
import { useAuthStore } from '@/store';
import { spacing, radius, typography } from '@/theme';
import { formatCurrency } from '@/lib/formatters';
import { computeEscrowSplit } from '@/lib/api';
import { haptic } from '@/lib/utils/haptics';
import type { Booking, PaymentMethod } from '@/types';

type PaymentStep = 'select' | 'processing' | 'success' | 'failed' | 'cancelled';

interface PaymentSheetProps {
  booking: Booking;
  onPay: (method: PaymentMethod, phone?: string) => Promise<boolean>;
  onClose: () => void;
}

/** Loose Kenyan mobile check — 07…, 01…, +2547…, or 2547… with ≥9 digits. */
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 9;
}

export const PaymentSheet = memo(function PaymentSheet({ booking, onPay, onClose }: PaymentSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  const [method, setMethod] = useState<PaymentMethod>('mpesa');
  const [step, setStep] = useState<PaymentStep>('select');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [phoneError, setPhoneError] = useState(false);

  // Lets the user bail out of a slow M-Pesa prompt: once cancelled, we ignore
  // whatever the (unabortable) STK push eventually resolves to.
  const cancelled = useRef(false);

  const { fee, driverEarning } = computeEscrowSplit(booking.total_price);

  const handlePay = useCallback(async () => {
    if (method === 'mpesa' && !isValidPhone(phone)) {
      setPhoneError(true);
      haptic.warning();
      return;
    }
    cancelled.current = false;
    haptic.medium();
    setStep('processing');

    let ok = false;
    try {
      ok = await onPay(method, phone.trim() || undefined);
    } catch {
      ok = false;
    }
    if (cancelled.current) return; // user backed out mid-flight

    haptic[ok ? 'success' : 'error']();
    setStep(ok ? 'success' : 'failed');
  }, [method, phone, onPay]);

  const handleCancel = useCallback(() => {
    cancelled.current = true;
    haptic.warning();
    setStep('cancelled');
  }, []);

  const retry = useCallback(() => {
    haptic.light();
    setStep('select');
  }, []);

  // ── Processing ──
  if (step === 'processing') {
    return (
      <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <View style={styles.centerText}>
            <Text variant="headlineSmall" align="center">
              {t('processing_payment')}
            </Text>
            <Text variant="bodyMedium" color={colors.textSecondary} align="center">
              {method === 'mpesa' ? t('payment_pin_hint') : t('check_your_phone')}
            </Text>
          </View>
          <Pressable onPress={handleCancel} hitSlop={8} style={styles.cancelLink}>
            <Text variant="labelLarge" color={colors.textSecondary}>
              {t('cancel_payment')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // ── Success ──
  if (step === 'success') {
    return (
      <Animated.View entering={FadeIn.duration(240)} style={styles.container}>
        <View style={styles.center}>
          <PaymentResultAnimation variant="success" color={colors.success} />
          <View style={styles.centerText}>
            <Text variant="headlineMedium" align="center">
              {t('payment_success')}
            </Text>
            <Text variant="bodyMedium" color={colors.textSecondary} align="center">
              {t('payment_success_sub')}
            </Text>
          </View>
          <Button label={t('done')} onPress={onClose} variant="filled" size="lg" fullWidth />
        </View>
      </Animated.View>
    );
  }

  // ── Failed / Cancelled ──
  if (step === 'failed' || step === 'cancelled') {
    const isCancel = step === 'cancelled';
    return (
      <Animated.View entering={FadeIn.duration(240)} style={styles.container}>
        <View style={styles.center}>
          <PaymentResultAnimation
            variant="error"
            color={isCancel ? colors.warning : colors.error}
          />
          <View style={styles.centerText}>
            <Text variant="headlineMedium" align="center">
              {isCancel ? t('payment_cancelled') : t('payment_failed')}
            </Text>
            {isCancel && (
              <Text variant="bodyMedium" color={colors.textSecondary} align="center">
                {t('payment_cancelled_body')}
              </Text>
            )}
          </View>
          <View style={styles.actionRow}>
            <Button label={t('close')} onPress={onClose} variant="outlined" size="lg" style={styles.flex} />
            <Button label={t('retry')} onPress={retry} variant="filled" size="lg" style={styles.flex} />
          </View>
        </View>
      </Animated.View>
    );
  }

  // ── Select ──
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
      <Text variant="headlineSmall">{t('payment')}</Text>

      {/* Amount */}
      <View style={styles.amountRow}>
        <Text variant="bodyMedium" color={colors.textSecondary}>{t('you_pay')}</Text>
        <Text variant="displayMedium" color={colors.primary}>
          {formatCurrency(booking.total_price)}
        </Text>
      </View>

      {/* Escrow reassurance */}
      <View style={[styles.escrowCard, { backgroundColor: colors.successContainer }]}>
        <Icon name="shield-checkmark-outline" size={22} color={colors.success} />
        <View style={styles.flex}>
          <Text variant="labelLarge" color={colors.onSuccessContainer}>
            {t('held_in_escrow')}
          </Text>
          <Text variant="caption" color={colors.onSuccessContainer}>
            {t('escrow_explainer')}
          </Text>
        </View>
      </View>

      <Divider />

      {/* Method selection */}
      <PaymentMethodOption
        label={t('mpesa')}
        icon="phone-portrait-outline"
        selected={method === 'mpesa'}
        onPress={() => {
          haptic.selection();
          setMethod('mpesa');
        }}
        brandColor="#4CAF50"
      />
      <PaymentMethodOption
        label={t('card')}
        icon="card-outline"
        selected={method === 'card'}
        onPress={() => {
          haptic.selection();
          setMethod('card');
        }}
        brandColor="#1976D2"
      />

      {/* M-Pesa number */}
      {method === 'mpesa' && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.phoneField}>
          <Text variant="labelMedium" color={colors.textSecondary}>
            {t('enter_mpesa_number')}
          </Text>
          <BottomSheetTextInput
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              if (phoneError) setPhoneError(false);
            }}
            placeholder="07XX XXX XXX"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            style={[
              styles.phoneInput,
              typography.bodyLarge,
              {
                color: colors.text,
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: phoneError ? colors.error : 'transparent',
              },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
            ]}
          />
        </Animated.View>
      )}

      {/* Fee transparency */}
      <View style={styles.breakdown}>
        <View style={styles.breakdownRow}>
          <Text variant="caption" color={colors.textTertiary}>{t('kipita_fee')}</Text>
          <Text variant="caption" color={colors.textSecondary}>{formatCurrency(fee)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text variant="caption" color={colors.textTertiary}>{t('driver_receives')}</Text>
          <Text variant="caption" color={colors.textSecondary}>{formatCurrency(driverEarning)}</Text>
        </View>
      </View>

      <Button
        label={t('pay_securely')}
        onPress={handlePay}
        variant="filled"
        size="lg"
        fullWidth
        icon="lock-closed-outline"
      />
    </Animated.View>
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
  flex: { flex: 1 },
  amountRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  escrowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  centerText: { gap: spacing.xs, alignItems: 'center' },
  cancelLink: { paddingVertical: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  phoneField: { gap: spacing.xs },
  phoneInput: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
  },
  breakdown: { gap: spacing.xs },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
