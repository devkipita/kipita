import React, { useState, useCallback } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { Composer, type ComposerAttachment } from "../shared/Composer";
import { ALERT_META } from "../cards/alertMeta";
import { useTheme, useLocale } from "@/hooks";
import { useAuthStore, useUIStore } from "@/store";
import { createAlert, queryKeys } from "@/lib/api";
import { ALERT_CATEGORIES } from "@/lib/constants";
import { spacing, radius, typography } from "@/theme";
import type { AlertCategory } from "@/types";

/**
 * Compose a road alert — text, emoji, photo (auto-compressed) or GIF.
 * Replaces the previously-missing sheet that rendered a blank drawer.
 */
export function AlertPostSheet() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const closeSheet = useUIStore((s) => s.closeSheet);
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<AlertCategory>("traffic");
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<ComposerAttachment | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createAlert({
        user_id: user!.id,
        location: location.trim() || "Nearby",
        category,
        content: content.trim(),
        // NOTE: prototype stores the local/remote URI directly. Wire real
        // Supabase Storage upload here before production.
        image_url: attachment?.uri ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.feed() });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.preview() });
      closeSheet();
    },
  });

  const handlePost = useCallback(() => {
    if ((!content.trim() && !attachment) || !user) return;
    mutation.mutate();
  }, [content, attachment, user, mutation]);

  return (
    <View style={styles.container}>
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="titleLarge" color={colors.text} style={styles.bold}>
          {t("post_alert")}
        </Text>

        {/* Category picker */}
        <Text variant="labelMedium" color={colors.textSecondary}>
          {t("alert_category")}
        </Text>
        <View style={styles.catRow}>
          {ALERT_CATEGORIES.map((cat) => {
            const meta = ALERT_META[cat];
            const selected = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: selected
                      ? meta.color
                      : colors.surfaceContainerHigh,
                    borderColor: selected ? meta.color : colors.borderLight,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Icon
                  name={meta.icon}
                  size={14}
                  color={selected ? "#fff" : meta.color}
                />
                <Text
                  variant="labelSmall"
                  color={selected ? "#fff" : colors.textSecondary}
                  style={styles.bold}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Location */}
        <Text variant="labelMedium" color={colors.textSecondary}>
          {t("alert_location")}
        </Text>
        <View
          style={[styles.locationRow, { backgroundColor: colors.inputBackground }]}
        >
          <Icon name="location-outline" size={18} color={colors.placeholder} />
          <TextInput
            style={[styles.locationInput, typography.bodyMedium, { color: colors.text }]}
            placeholder="e.g. Mombasa Rd, near Nyayo"
            placeholderTextColor={colors.placeholder}
            value={location}
            onChangeText={setLocation}
          />
        </View>
      </BottomSheetScrollView>

      {/* Composer doubles as the content field + Post action */}
      <Composer
        value={content}
        onChangeText={setContent}
        onSend={handlePost}
        placeholder={t("alert_content")}
        sending={mutation.isPending}
        media
        attachment={attachment}
        onAttachmentChange={setAttachment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  bold: { fontWeight: "700" },
  catRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: radius.md,
  },
  locationInput: { flex: 1 },
});
