import React, { memo, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { Badge } from "../core/Badge";
import { KipitaLogo } from "../core/Logo";
import { useTheme } from "@/hooks";
import { useAuthStore } from "@/store";
import { fetchUnreadCount, queryKeys } from "@/lib/api";
import { spacing } from "@/theme";
import { APP_NAME } from "@/lib/constants";

export const TopBar = memo(function TopBar() {
  const { colors, toggle, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const isHome = pathname === "/" || pathname === "/(tabs)/home";
  const showBack = !isHome;

  // Unread notifications drive the badge on the bell.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const goToNotifications = useCallback(() => {
    router.push("/(tabs)/alerts?tab=notifications" as any);
  }, [router]);

  const goToProfile = useCallback(() => {
    router.push("/(tabs)/profile" as any);
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

        {/* Right-side actions: notifications + profile / theme toggle */}
        <View style={styles.actions}>
          <Pressable
            onPress={goToNotifications}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Icon name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badgeWrap} pointerEvents="none">
                <Badge count={unreadCount} size={16} />
              </View>
            )}
          </Pressable>

          {user ? (
            <Avatar
              uri={user.avatar_url}
              name={user.full_name || "You"}
              size={32}
              onPress={goToProfile}
            />
          ) : (
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
          )}
        </View>

        {/* Centered logo — absolutely positioned so it stays centered
            regardless of how wide the side actions get. */}
        <View style={styles.logoOverlay} pointerEvents="none">
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
        </View>
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badgeWrap: {
    position: "absolute",
    top: -2,
    right: -4,
  },
  logoOverlay: {
    ...StyleSheet.absoluteFillObject,
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
