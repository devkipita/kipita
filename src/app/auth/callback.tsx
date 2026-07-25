import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "@/components/core/Text";
import { useTheme } from "@/hooks";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/theme";

export default function AuthCallbackScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();

  useEffect(() => {
    let active = true;

    const completeAuth = async () => {
      try {
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            params.code,
          );

          if (error) {
            console.warn("Failed to exchange auth code", error.message);
          }
        }
      } finally {
        if (active) {
          router.replace("/");
        }
      }
    };

    void completeAuth();

    return () => {
      active = false;
    };
  }, [params.code]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text variant="bodyMedium" color={colors.textSecondary}>
        Completing sign in...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
});
