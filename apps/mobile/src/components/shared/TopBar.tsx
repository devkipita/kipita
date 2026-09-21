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
import { spacing, radius } from "@/theme";
import { APP_NAME } from "@/lib/constants";

const MAX_NAME = 11;

function shortName(full?: string | null): string {
  const first = (full ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first) return "You";
  return first.length > MAX_NAME ? `${first.slice(0, MAX_NAME - 1)}…` : first;
}

export const TopBar = memo(function TopBar() {
  const { colors, toggle, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const isHome = pathname === "/" || pathname === "/(tabs)/home";
  const ownsHeader =
    pathname === "/alerts" ||
    pathname === "/(tabs)/alerts" ||
    pathname === "/trips" ||
    pathname === "/(tabs)/trips";

  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  const goToNotifications = useCallback(() => {
    router.push("/(tabs)/alerts?tab=notifications" as any);
  }, [router]);

  const goToProfile = useCallback(() => {
    router.push("/(tabs)/profile" as any);
  }, [router]);

  if (isHome || ownsHeader) return null;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xs,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {router.canGoBack() && (
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Icon name="arrow-back" size={20} color={colors.text} />
            </Pressable>
          )}

          <View style={styles.logoRow}>
            <KipitaLogo
              size={26}
              primaryColor={colors.primary}
              accentColor={colors.primary + "88"}
            />
            <Text
              variant="titleLarge"
              color={colors.primary}
              numberOfLines={1}
              style={styles.logoText}
            >
              {APP_NAME}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={goToNotifications}
            hitSlop={10}
            style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Icon name="notifications-outline" size={19} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badgeWrap} pointerEvents="none">
                <Badge count={unreadCount} size={15} />
              </View>
            )}
          </Pressable>

          <View
            style={[
              styles.pill,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <Pressable
              onPress={toggle}
              hitSlop={8}
              style={styles.pillIcon}
              accessibilityRole="switch"
              accessibilityState={{ checked: isDark }}
              accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <Icon
                name={isDark ? "sunny" : "moon"}
                size={16}
                color={isDark ? colors.warning : colors.textSecondary}
              />
            </Pressable>

            <View style={[styles.pillDivider, { backgroundColor: colors.outlineVariant }]} />

            <Pressable
              onPress={goToProfile}
              hitSlop={8}
              style={styles.pillProfile}
              accessibilityRole="button"
              accessibilityLabel={user ? `Profile, ${shortName(user.full_name)}` : "Sign in"}
            >
              <Avatar
                uri={user?.avatar_url}
                name={user?.full_name || "You"}
                size={24}
              />
              <Text
                variant="labelMedium"
                color={colors.text}
                numberOfLines={1}
                style={styles.pillName}
              >
                {shortName(user?.full_name)}
              </Text>
            </Pressable>
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
    height: 48,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  badgeWrap: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  pillIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pillDivider: {
    width: 1,
    height: 18,
  },
  pillProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 4,
    maxWidth: 130,
  },
  pillName: {
    fontWeight: "700",
    flexShrink: 1,
  },
  logoRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  logoText: {
    fontWeight: "800",
    flexShrink: 1,
  },
});
