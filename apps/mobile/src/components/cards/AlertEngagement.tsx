import React, { memo, useCallback, useState } from "react";
import { View, Pressable, StyleSheet, Text as RNText } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { MessageGlyph, ViewsGlyph } from "../core/GlyphIcons";
import { useTheme } from "@/hooks";
import { useAuthStore, useUIStore } from "@/store";
import { reactToAlert } from "@/lib/api";
import { haptic } from "@/lib/utils/haptics";
import { formatCompactNumber } from "@/lib/formatters";
import { spacing, radius } from "@/theme";
import type { Alert } from "@/types";

/** The four quick reactions available on every alert (shown in the detail view). */
export const ALERT_REACTIONS = [
  { emoji: "👍", key: "thumbs_up" },
  { emoji: "❤️", key: "heart" },
  { emoji: "😮", key: "wow" },
  { emoji: "😢", key: "sad" },
] as const;

const LIKE_COLOR = "#E0245E";

interface AlertEngagementProps {
  alert: Alert;
  /** Called when the comment stat is tapped (open the discussion thread). */
  onComment: () => void;
  /** "onMedia" renders light controls for use over a dark image. */
  variant?: "default" | "onMedia";
  /**
   * Compact mode (feed / home): a minimal stat row — comment, like and views.
   * Non-compact (detail popup): the full four-emoji reaction picker. Reactions
   * only "begin" once the user opens an alert.
   */
  compact?: boolean;
}

export const AlertEngagement = memo(function AlertEngagement({
  alert,
  onComment,
  variant = "default",
  compact = false,
}: AlertEngagementProps) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const openSheet = useUIStore((s) => s.openSheet);
  const onMedia = variant === "onMedia";

  const [reaction, setReaction] = useState<string | null>(
    alert.user_reaction ?? null,
  );
  const [count, setCount] = useState(alert.reactions_count);

  const mutation = useMutation({
    mutationFn: (next: string) => reactToAlert(alert.id, user!.id, next),
  });

  const applyReaction = useCallback(
    (key: string) => {
      if (!user) {
        openSheet("auth", {});
        return;
      }
      haptic.light();
      const isSame = reaction === key;
      const next = isSame ? null : key;
      // +1 when adding a first reaction, -1 when clearing, 0 when swapping.
      const delta = isSame ? -1 : reaction ? 0 : 1;
      setReaction(next);
      setCount((c) => Math.max(0, c + delta));
      mutation.mutate(next ?? "");
    },
    [user, reaction, mutation, openSheet],
  );

  const openViewers = useCallback(() => {
    haptic.light();
    openSheet("alert_viewers", { alert, initialTab: "views" });
  }, [openSheet, alert]);

  const statColor = onMedia ? "rgba(255,255,255,0.92)" : colors.textSecondary;

  // ── Compact feed row: comment · like · views ──
  if (compact) {
    const liked = !!reaction;
    return (
      <View style={styles.statRow}>
        <Stat
          icon={<MessageGlyph size={16} color={statColor} />}
          value={alert.comments_count}
          onPress={onComment}
          color={statColor}
          label="comments"
        />
        <Stat
          icon={
            <Icon
              name={liked ? "heart" : "heart-outline"}
              size={17}
              color={liked ? LIKE_COLOR : statColor}
            />
          }
          value={count}
          onPress={() => applyReaction("heart")}
          color={liked ? LIKE_COLOR : statColor}
          label="likes"
        />
        <Stat
          icon={<ViewsGlyph size={16} color={statColor} />}
          value={alert.views_count}
          onPress={openViewers}
          color={statColor}
          label="views"
        />
      </View>
    );
  }

  // ── Detail view: full four-emoji reaction picker + comment + views ──
  const chipBg = onMedia ? "rgba(255,255,255,0.16)" : colors.surfaceContainerHigh;
  const chipActiveBg = onMedia ? "rgba(255,255,255,0.34)" : colors.primaryContainer;
  const chipActiveBorder = onMedia ? "#FFFFFF" : colors.primary;

  return (
    <View style={styles.bar}>
      <View style={styles.reactions}>
        {ALERT_REACTIONS.map(({ emoji, key }) => {
          const active = reaction === key;
          return (
            <Pressable
              key={key}
              onPress={() => applyReaction(key)}
              hitSlop={4}
              style={[
                styles.emojiChip,
                {
                  backgroundColor: active ? chipActiveBg : chipBg,
                  borderColor: active ? chipActiveBorder : "transparent",
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`React ${emoji}`}
            >
              <RNText style={styles.emoji}>{emoji}</RNText>
            </Pressable>
          );
        })}
        {count > 0 && (
          <Text variant="labelMedium" color={statColor} style={styles.reactCount}>
            {formatCompactNumber(count)}
          </Text>
        )}
      </View>

      <View style={styles.spacer} />

      <Stat
        icon={<MessageGlyph size={16} color={statColor} />}
        value={alert.comments_count}
        onPress={onComment}
        color={statColor}
        label="comments"
      />
      <Stat
        icon={<ViewsGlyph size={16} color={statColor} />}
        value={alert.views_count}
        onPress={openViewers}
        color={statColor}
        label="views"
      />
    </View>
  );
});

const Stat = memo(function Stat({
  icon,
  value,
  onPress,
  color,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  onPress: () => void;
  color: string;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.stat, pressed && styles.statPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
    >
      {icon}
      <Text variant="labelMedium" color={color}>
        {formatCompactNumber(value)}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // Compact feed stat row
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  // Detail reaction bar
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  reactions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  emojiChip: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 17 },
  reactCount: {
    marginLeft: 4,
    fontWeight: "700",
  },
  spacer: { flex: 1 },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  statPressed: { opacity: 0.5 },
});
