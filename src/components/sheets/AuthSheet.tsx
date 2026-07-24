import React, { memo, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../core/Text';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';
import { Divider } from '../core/Divider';
import { TextInput } from '../forms/TextInput';
import { useTheme, useLocale } from '@/hooks';
import { useAuthStore, useUIStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/theme';

type AuthStep = 'choice' | 'phone' | 'otp' | 'email';

interface AuthSheetProps {
  onSuccess?: () => void;
}

export const AuthSheet = memo(function AuthSheet({ onSuccess }: AuthSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [step, setStep] = useState<AuthStep>('choice');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneSubmit = useCallback(async () => {
    setLoading(true);
    setError('');
    const formattedPhone = phone.startsWith('+') ? phone : `+254${phone.replace(/^0/, '')}`;
    const { error: err } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setStep('otp');
    }
  }, [phone]);

  const handleOtpVerify = useCallback(async () => {
    setLoading(true);
    setError('');
    const formattedPhone = phone.startsWith('+') ? phone : `+254${phone.replace(/^0/, '')}`;
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else if (data.session) {
      onSuccess?.();
    }
  }, [phone, otp, onSuccess]);

  const handleEmailSubmit = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      // Try sign up
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (signUpErr) {
        setError(signUpErr.message);
      } else if (signUpData.session) {
        onSuccess?.();
      }
    } else {
      setLoading(false);
      if (data.session) {
        onSuccess?.();
      }
    }
  }, [email, password, onSuccess]);

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'kipita://auth/callback' },
    });
    setLoading(false);
    if (err) setError(err.message);
  }, []);

  // Choice screen
  if (step === 'choice') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium" align="center">
            {t('sign_in')}
          </Text>
          <Text variant="bodyMedium" color={colors.textSecondary} align="center">
            {t('welcome_back')}
          </Text>
        </View>

        <Button
          label={t('phone_number')}
          onPress={() => setStep('phone')}
          variant="filled"
          icon="call-outline"
          size="lg"
          fullWidth
        />

        <Button
          label={t('email')}
          onPress={() => setStep('email')}
          variant="outlined"
          icon="mail-outline"
          size="lg"
          fullWidth
        />

        <View style={styles.dividerRow}>
          <Divider style={styles.dividerLine} />
          <Text variant="labelSmall" color={colors.textTertiary}>{t('or')}</Text>
          <Divider style={styles.dividerLine} />
        </View>

        <Button
          label={t('continue_with_google')}
          onPress={handleGoogleSignIn}
          variant="outlined"
          icon="logo-google"
          size="lg"
          fullWidth
          loading={loading}
        />
      </View>
    );
  }

  // Phone input
  if (step === 'phone') {
    return (
      <View style={styles.container}>
        <Pressable onPress={() => setStep('choice')} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="headlineMedium">{t('phone_number')}</Text>
        <TextInput
          label={t('phone_number')}
          placeholder={t('enter_phone')}
          icon="call-outline"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          error={error}
          hint="We'll text you a verification code"
          autoFocus
        />
        <Button
          label={t('send_code')}
          onPress={handlePhoneSubmit}
          variant="filled"
          size="lg"
          fullWidth
          loading={loading}
          disabled={phone.length < 9}
        />
      </View>
    );
  }

  // OTP
  if (step === 'otp') {
    return (
      <View style={styles.container}>
        <Pressable onPress={() => setStep('phone')} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="headlineMedium">{t('verify')}</Text>
        <Text variant="bodyMedium" color={colors.textSecondary}>
          {t('enter_otp')}
        </Text>
        <TextInput
          placeholder="000000"
          icon="keypad-outline"
          keyboardType="number-pad"
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
          error={error}
          autoFocus
        />
        <Button
          label={t('verify')}
          onPress={handleOtpVerify}
          variant="filled"
          size="lg"
          fullWidth
          loading={loading}
          disabled={otp.length < 6}
        />
      </View>
    );
  }

  // Email
  return (
    <View style={styles.container}>
      <Pressable onPress={() => setStep('choice')} style={styles.backBtn}>
        <Icon name="arrow-back" size={24} color={colors.text} />
      </Pressable>
      <Text variant="headlineMedium">{t('email')}</Text>
      <TextInput
        label={t('email')}
        placeholder="you@example.com"
        icon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        label={t('password')}
        placeholder="••••••••"
        icon="lock-closed-outline"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={error}
      />
      <Button
        label={t('continue')}
        onPress={handleEmailSubmit}
        variant="filled"
        size="lg"
        fullWidth
        loading={loading}
        disabled={!email || !password}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
  },
});
