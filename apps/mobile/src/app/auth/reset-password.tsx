import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/core/Text";
import { Button } from "@/components/core/Button";
import { TextInput } from "@/components/forms/TextInput";
import { useTheme, useLocale } from "@/hooks";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/theme";

/**
 * Landing screen for the "reset password" email link. The link deep-links here
 * with a PKCE `code`; we exchange it for a (recovery) session, then let the
 * user choose a new password via supabase.auth.updateUser.
 */
export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();

  const [exchanging, setExchanging] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Establish the recovery session from the emailed link.
  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        if (params.code) {
          const { error: err } = await supabase.auth.exchangeCodeForSession(
            params.code,
          );
          if (err) throw err;
        }
        // Either the code exchange worked, or a PASSWORD_RECOVERY session is
        // already active (opened from onAuthStateChange).
        const { data } = await supabase.auth.getSession();
        if (active) setReady(Boolean(data.session));
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "This reset link is invalid.",
          );
        }
      } finally {
        if (active) setExchanging(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [params.code]);

  const handleSubmit = useCallback(async () => {
    setError("");
    if (password.length < 8) {
      setError(t("password_too_short"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwords_dont_match"));
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => router.replace("/"), 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update password.",
      );
    } finally {
      setLoading(false);
    }
  }, [password, confirm, t]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + spacing.xl },
      ]}
    >
      <Text variant="headlineMedium">{t("new_password")}</Text>

      {exchanging ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !ready ? (
        <>
          <Text variant="bodyMedium" color={colors.error}>
            {error || t("reset_link_invalid")}
          </Text>
          <Button
            label={t("close")}
            onPress={() => router.replace("/")}
            variant="outlined"
            size="lg"
            fullWidth
          />
        </>
      ) : done ? (
        <Text variant="bodyMedium" color={colors.success}>
          {t("password_updated")}
        </Text>
      ) : (
        <>
          <Text variant="bodyMedium" color={colors.textSecondary}>
            {t("new_password_hint")}
          </Text>
          <TextInput
            label={t("password")}
            placeholder="••••••••"
            icon="lock-closed-outline"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            label={t("confirm_password")}
            placeholder="••••••••"
            icon="lock-closed-outline"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            error={error}
          />
          <Button
            label={t("update_password")}
            onPress={handleSubmit}
            variant="filled"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!password || !confirm}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  center: {
    paddingVertical: spacing["4xl"],
    alignItems: "center",
  },
});
