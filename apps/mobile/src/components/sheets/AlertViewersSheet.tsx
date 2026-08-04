import React, { memo, useCallback, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Avatar";
import { LoadingState } from "../feedback/LoadingState";
import { EmptyState } from "../feedback/EmptyState";
import { useTheme, useLocale } from "@/hooks";
import { useAuthStore, useUIStore } from "@/store";
import { queryKeys, fetchAlertViewers, fetchAlertReactors } from "@/lib/api";
import { haptic } from "@/lib/utils/haptics";
import { formatCompactNumber, deriveHandle } from "@/lib/formatters";
import { spacing, radius } from "@/theme";
import type { Alert, User } from "@/types";

type ViewersTab = "likes" | "views";

interface AlertViewersSheetProps {
  alert: Alert;
  initialTab?: ViewersTab;
}

/**
 * People list for a road alert — who liked it and who has seen it. Mirrors the
 * familiar social "Likes / Views" switcher, opened from the alert view stat.
 */
export const AlertViewersSheet = memo(function AlertViewersSheet({
  alert,
  initialTab = "views",
}: AlertViewersSheetProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const openSheet = useUIStore((s) => s.openSheet);
  const [tab, setTab] = useState<ViewersTab>(initialTab);

  const { data: viewers = [], isLoading: viewersLoading } = useQuery({
    queryKey: queryKeys.alerts.viewers(alert.id),
    queryFn: () => fetchAlertViewers(alert.id, alert.views_count),
    enabled: tab === "views",
    staleTime: 60_000,
  });

  const { data: reactors = [], isLoading: reactorsLoading } = useQuery({
    queryKey: queryKeys.alerts.reactors(alert.id),
    queryFn: () => fetchAlertReactors(alert.id, alert.reactions_count),
    enabled: tab === "likes",
    staleTime: 60_000,
  });

  const people = tab === "views" ? viewers : reactors;
  const loading = tab === "views" ? viewersLoading : reactorsLoading;

  const openPerson = useCallback(
    (user: User) => {
      openSheet("person", { user });
    },
    [openSheet],
  );

  const tabs: { key: ViewersTab; label: string; count: number }[] = [
    { key: "likes", label: t("likes"), count: alert.reactions_count },
    { key: "views", label: t("views"), count: alert.views_count },
  ];

  return (
    <View style={styles.container}>
      {/* Header: segmented Likes / Views + close */}
      <View style={styles.header}>
        <View style={[styles.segment, { backgroundColor: colors.surfaceContainerHigh }]}>
          {tabs.map((tb) => {
            const active = tab === tb.key;
            return (
              <Pressable
                key={tb.key}
                onPress={() => {
                  haptic.selection();
                  setTab(tb.key);
                }}
                style={[
                  styles.segmentBtn,
                  active && { backgroundColor: colors.surface },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text
                  variant="labelLarge"
                  color={active ? colors.text : colors.textSecondary}
                >
                  {tb.label}
                </Text>
                <Text
                  variant="labelMedium"
                  color={active ? colors.primary : colors.textTertiary}
                >
                  {formatCompactNumber(tb.count)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={closeSheet}
          hitSlop={10}
          style={[styles.closeBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          accessibilityRole="button"
          accessibilityLabel={t("close")}
        >
          <Icon name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {loading ? (
        <LoadingState />
      ) : people.length === 0 ? (
        <EmptyState
          icon={tab === "views" ? "bar-chart-outline" : "heart-outline"}
          message={tab === "views" ? t("no_views_yet") : t("no_likes_yet")}
        />
      ) : (
        <BottomSheetFlatList
          data={people}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PersonRow user={item} onPress={() => openPerson(item)} />
          )}
        />
      )}
    </View>
  );
});

const PersonRow = memo(function PersonRow({
  user,
  onPress,
}: {
  user: User;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const currentUser = useAuthStore((s) => s.user);
  const [following, setFollowing] = useState(false);
  const isSelf = currentUser?.id === user.id;

  const toggleFollow = useCallback(() => {
    haptic.light();
    setFollowing((f) => !f);
  }, []);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        <Avatar uri={user.avatar_url} name={user.full_name} size={44} />
        <View style={styles.rowInfo}>
          <View style={styles.nameLine}>
            <Text variant="labelLarge" color={colors.text} numberOfLines={1}>
              {user.full_name}
            </Text>
            {user.is_verified && (
              <Icon name="checkmark-circle" size={14} color={colors.primary} />
            )}
          </View>
          <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
            {deriveHandle(user)}
          </Text>
        </View>
      </Pressable>

      {!isSelf && (
        <Pressable
          onPress={toggleFollow}
          hitSlop={6}
          style={[
            styles.followBtn,
            following
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.border },
          ]}
          accessibilityRole="button"
        >
          <Text
            variant="labelMedium"
            color={following ? colors.onPrimary : colors.textSecondary}
          >
            {following ? t("following") : t("follow")}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    borderRadius: radius.full,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: radius.full,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowInfo: { flex: 1, gap: 1 },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  followBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
    minWidth: 92,
    alignItems: "center",
  },
});
