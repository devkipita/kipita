import React, { memo, useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Linking from "expo-linking";
import { Text } from "../core/Text";
import { Button } from "../core/Button";
import { Icon } from "../core/Icon";
import { Divider } from "../core/Divider";
import { TextInput } from "../forms/TextInput";
import { useTheme, useLocale } from "@/hooks";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/theme";

type AuthStep = "choice" | "phone" | "otp" | "sign_in" | "sign_up";

interface AuthSheetProps {
  onSuccess?: () => void;
}

export const AuthSheet = memo(function AuthSheet({
  onSuccess,
}: AuthSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [step, setStep] = useState<AuthStep>("choice");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handlePhoneSubmit = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const formattedPhone = phone.startsWith("+")
        ? phone
        : `+254${phone.replace(/^0/, "")}`;
      const { error: err } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (err) {
        setError(err.message);
      } else {
        setStep("otp");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const handleOtpVerify = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const formattedPhone = phone.startsWith("+")
        ? phone
        : `+254${phone.replace(/^0/, "")}`;
      const { data, error: err } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });

      if (err) {
        setError(err.message);
      } else if (data.session) {
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code.");
    } finally {
      setLoading(false);
    }
  }, [phone, otp, onSuccess]);

  const handleEmailSignIn = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (err) {
        setError(err.message);
      } else if (data.session) {
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }, [email, password, onSuccess]);

  const handleEmailSignUp = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: Linking.createURL("auth/callback"),
        },
      });

      if (err) {
        setError(err.message);
      } else if (data.session) {
        onSuccess?.();
      } else {
        setNotice(
          "Check your email to confirm your account, then return to Kipita to sign in.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create account.",
      );
    } finally {
      setLoading(false);
    }
  }, [email, password, fullName, onSuccess]);

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: Linking.createURL("auth/callback") },
      });

      if (err) {
        setError(err.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start Google sign in.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Choice screen
  if (step === "choice") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium" align="center">
            {t("sign_in")}
          </Text>
          <Text
            variant="bodyMedium"
            color={colors.textSecondary}
            align="center"
          >
            {t("welcome_back")}
          </Text>
        </View>

        <Button
          label={t("phone_number")}
          onPress={() => setStep("phone")}
          variant="filled"
          icon="call-outline"
          size="lg"
          fullWidth
        />

        <Button
          label={t("email")}
          onPress={() => setStep("sign_in")}
          variant="outlined"
          icon="mail-outline"
          size="lg"
          fullWidth
        />

        <View style={styles.dividerRow}>
          <Divider style={styles.dividerLine} />
          <Text variant="labelSmall" color={colors.textTertiary}>
            {t("or")}
          </Text>
          <Divider style={styles.dividerLine} />
        </View>

        <Button
          label={t("continue_with_google")}
          onPress={handleGoogleSignIn}
          variant="outlined"
          icon="logo-google"
          size="lg"
          fullWidth
          loading={loading}
        />

        <Pressable onPress={() => setStep("sign_up")}>
          <Text variant="labelMedium" color={colors.primary} align="center">
            New to Kipita? Create an account
          </Text>
        </Pressable>
      </View>
    );
  }

  // Phone input
  if (step === "phone") {
    return (
      <View style={styles.container}>
        <Pressable onPress={() => setStep("choice")} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="headlineMedium">{t("phone_number")}</Text>
        <TextInput
          label={t("phone_number")}
          placeholder={t("enter_phone")}
          icon="call-outline"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          error={error}
          hint="We'll text you a verification code"
          autoFocus
        />
        <Button
          label={t("send_code")}
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
  if (step === "otp") {
    return (
      <View style={styles.container}>
        <Pressable onPress={() => setStep("phone")} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="headlineMedium">{t("verify")}</Text>
        <Text variant="bodyMedium" color={colors.textSecondary}>
          {t("enter_otp")}
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
          label={t("verify")}
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

  // Email sign-in and sign-up are deliberately separate. A mistyped
  // password must never silently create a second account.
  return (
    <View style={styles.container}>
      <Pressable onPress={() => setStep("choice")} style={styles.backBtn}>
        <Icon name="arrow-back" size={24} color={colors.text} />
      </Pressable>
      <Text variant="headlineMedium">
        {step === "sign_up" ? "Create your account" : "Sign in with email"}
      </Text>
      {step === "sign_up" && (
        <TextInput
          label="Full name"
          placeholder="Your name"
          icon="person-outline"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
      )}
      <TextInput
        label={t("email")}
        placeholder="you@example.com"
        icon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        label={t("password")}
        placeholder="••••••••"
        icon="lock-closed-outline"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={error}
      />
      {notice ? (
        <Text variant="bodySmall" color={colors.success}>
          {notice}
        </Text>
      ) : null}
      <Button
        label={step === "sign_up" ? "Create account" : t("continue")}
        onPress={step === "sign_up" ? handleEmailSignUp : handleEmailSignIn}
        variant="filled"
        size="lg"
        fullWidth
        loading={loading}
        disabled={
          !email ||
          !password ||
          (step === "sign_up" && fullName.trim().length < 2) ||
          password.length < 8
        }
      />
      <Pressable
        onPress={() => setStep(step === "sign_up" ? "sign_in" : "sign_up")}
      >
        <Text variant="labelMedium" color={colors.primary} align="center">
          {step === "sign_up"
            ? "Already have an account? Sign in"
            : "Need an account? Create one"}
        </Text>
      </Pressable>
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
    alignSelf: "flex-start",
    padding: spacing.xs,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
  },
});
