import React, { memo, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { KipitaLogo } from "../core/Logo";
import { useTheme } from "@/hooks";
import { spacing } from "@/theme";
import { APP_NAME } from "@/lib/constants";

export const TopBar = memo(function TopBar() {
  const { colors, toggle, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/(tabs)/home";
  const showBack = !isHome;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  if (isHome) return null; // Home manages its own top padding inside the hero

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xs,
          // Blend seamlessly with the screen — no divider under the top bar.
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityLabel="Back"
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}

        <View style={styles.logoRow}>
          <KipitaLogo
            size={28}
            primaryColor={colors.primary}
            accentColor={colors.primary + "88"}
          />
          <Text
            variant="headlineSmall"
            color={colors.primary}
            style={styles.logoText}
          >
            {APP_NAME}
          </Text>
        </View>

        <Pressable
          onPress={toggle}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityLabel="Toggle theme"
        >
          <Icon
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={22}
            color={colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    height: 44,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  logoText: {
    fontWeight: "700",
  },
});
