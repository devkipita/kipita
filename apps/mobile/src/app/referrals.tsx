import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Share,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EMPTY_REFERRAL_SUMMARY,
  formatKes,
  nextTier,
  REFEREE_REWARD,
  referralLink,
  shareMessage,
  tierFor,
  toGo,
  type ReferralEntry,
} from "@kipita/shared";
import { Text } from "@/components/core/Text";
import { Icon } from "@/components/core/Icon";
import { Button } from "@/components/core/Button";
import { TextInput } from "@/components/forms/TextInput";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useTheme, useSafeBack } from "@/hooks";
import { useAuthStore } from "@/store";
import { haptic } from "@/lib/utils/haptics";
import { spacing, radius } from "@/theme";
import { WEBSITE_URL } from "@/lib/constants";
import { queryKeys } from "@/lib/api/queryKeys";
import {
  claimReferral,
  fetchReferrals,
  fetchReferralSummary,
} from "@/lib/api/referrals";

export default function ReferralsScreen() {
  const { colors } = useTheme();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [codeDraft, setCodeDraft] = useState("");
  const [claimState, setClaimState] = useState<"idle" | "busy" | "ok" | "bad">(
    "idle",
  );

  const summaryQuery = useQuery({
    queryKey: queryKeys.referrals.summary(),
    queryFn: fetchReferralSummary,
    enabled: !!user,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.referrals.list(),
    queryFn: () => fetchReferrals(),
    enabled: !!user,
  });

  const summary = summaryQuery.data ?? EMPTY_REFERRAL_SUMMARY;
  const entries = listQuery.data ?? [];
  const current = tierFor(summary.joined);
  const upcoming = nextTier(summary.joined);
  const link = referralLink(WEBSITE_URL, summary.code);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.referrals.all() });
  }, [queryClient]);

  const share = useCallback(async () => {
    if (!summary.code) return;
    haptic.light();
    try {
      await Share.share({ message: shareMessage(summary.code, link) });
    } catch {
      /* empty */
    }
  }, [summary.code, link]);

  const submitCode = useCallback(async () => {
    if (!codeDraft.trim() || claimState === "busy") return;
    setClaimState("busy");
    try {
      const ok = await claimReferral(codeDraft);
      setClaimState(ok ? "ok" : "bad");
      if (ok) {
        haptic.success();
        setCodeDraft("");
        refresh();
      }
    } catch {
      setClaimState("bad");
    }
  }, [codeDraft, claimState, refresh]);

  const loading = summaryQuery.isLoading || listQuery.isLoading;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={goBack}
          hitSlop={10}
          style={[
            styles.headerBtn,
            { backgroundColor: colors.surfaceContainerHigh },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text variant="titleMedium" color={colors.text} style={styles.bold}>
          Invite friends
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isRefetching}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(360)}>
          <View
            style={[styles.hero, { backgroundColor: colors.primaryContainer }]}
          >
            <Text variant="bodySmall" color={colors.onPrimaryContainer}>
              Share your code. When they finish their first paid ride they get{" "}
              {formatKes(REFEREE_REWARD)} and you get{" "}
              {formatKes(current.reward)}.
            </Text>

            <Pressable
              onPress={share}
              style={[styles.codeBox, { borderColor: colors.onPrimaryContainer }]}
              accessibilityRole="button"
              accessibilityLabel="Share your referral code"
            >
              <Text variant="headlineSmall" color={colors.onPrimaryContainer}>
                {summary.code || "—"}
              </Text>
              <View style={styles.codeHint}>
                <Icon
                  name="share-social-outline"
                  size={15}
                  color={colors.onPrimaryContainer}
                />
                <Text variant="labelMedium" color={colors.onPrimaryContainer}>
                  Share
                </Text>
              </View>
            </Pressable>

            <Button
              label="Share invite"
              icon="share-social-outline"
              onPress={share}
              fullWidth
            />
          </View>
        </Animated.View>

        <View style={styles.stats}>
          <Stat label="Joined" value={String(summary.joined)} />
          <Stat label="Pending" value={String(summary.pending)} />
          <Stat label="Earned" value={formatKes(summary.earned)} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
          <View style={styles.tierHead}>
            <Text variant="titleSmall" color={colors.onSurface} style={styles.bold}>
              {current.label} · {formatKes(current.reward)} each
            </Text>
            <Text variant="caption" color={colors.onSurfaceVariant}>
              {upcoming
                ? `${toGo(summary.joined)} more to ${upcoming.label}`
                : "Top tier"}
            </Text>
          </View>

          <Text variant="bodySmall" color={colors.onSurfaceVariant}>
            {upcoming
              ? `${toGo(summary.joined)} more takes you to ${upcoming.label} at ${formatKes(upcoming.reward)} each.`
              : "That's the top of the ladder."}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
          <Text variant="titleSmall" color={colors.onSurface} style={styles.bold}>
            Got a code?
          </Text>
          <Text variant="caption" color={colors.onSurfaceVariant}>
            Enter a friend&apos;s code before your first ride.
          </Text>
          <TextInput
            value={codeDraft}
            onChangeText={(v) => {
              setCodeDraft(v.toUpperCase());
              setClaimState("idle");
            }}
            placeholder="AMINA4F2K"
            autoCapitalize="characters"
            error={
              claimState === "bad"
                ? "That code can't be used on this account."
                : undefined
            }
            hint={claimState === "ok" ? "Code applied." : undefined}
          />
          <Button
            label="Apply code"
            onPress={submitCode}
            loading={claimState === "busy"}
            disabled={!codeDraft.trim()}
            fullWidth
          />
        </View>

        <Text
          variant="titleMedium"
          color={colors.text}
          style={[styles.bold, styles.sectionTitle]}
        >
          Your invites
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon="people-outline"
            message="No one yet. Send your code to someone who travels your route — nothing is paid until their first ride is done."
          />
        ) : (
          <View style={styles.rows}>
            {entries.map((entry) => (
              <InviteRow key={entry.id} entry={entry} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surfaceContainer }]}>
      <Text variant="caption" color={colors.onSurfaceVariant}>
        {label}
      </Text>
      <Text variant="titleLarge" color={colors.onSurface}>
        {value}
      </Text>
    </View>
  );
}

function InviteRow({ entry }: { entry: ReferralEntry }) {
  const { colors } = useTheme();
  const done = entry.status === "rewarded";
  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceContainer }]}>
      <Text
        variant="labelLarge"
        color={colors.onSurface}
        numberOfLines={1}
        style={styles.rowName}
      >
        {entry.name}
      </Text>
      <View
        style={[
          styles.tag,
          {
            backgroundColor: done
              ? colors.successContainer
              : colors.surfaceContainerHigh,
          },
        ]}
      >
        <Text
          variant="labelSmall"
          color={done ? colors.onSuccessContainer : colors.onSurfaceVariant}
        >
          {done ? `+${formatKes(entry.reward)}` : "Awaiting first ride"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bold: { fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: spacing.lg, gap: spacing.md },
  hero: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  codeHint: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 2,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  tierHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: { marginTop: spacing.sm },
  loader: { marginVertical: spacing["3xl"] },
  rows: { gap: spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  rowName: { flex: 1, minWidth: 0 },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
});
