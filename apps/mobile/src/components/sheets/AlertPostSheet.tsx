import React, { useState, useCallback } from "react";
import { View, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { ALERT_META } from "../cards/alertMeta";
import { useTheme, useLocale } from "@/hooks";
import { useAuthStore, useUIStore } from "@/store";
import { createAlert, queryKeys } from "@/lib/api";
import { ALERT_CATEGORIES } from "@/lib/constants";
import { pickAndCompressImage } from "@/lib/utils/media";
import { haptic } from "@/lib/utils/haptics";
import { spacing, radius, typography } from "@/theme";
import type { AlertCategory } from "@/types";

const MAX_CONTENT = 500;

export function AlertPostSheet() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const closeSheet = useUIStore((s) => s.closeSheet);
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<AlertCategory>("traffic");
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createAlert({
        user_id: user!.id,
        location: location.trim() || "Nearby",
        category,
        content: content.trim(),
        image_url: photo,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.feed() });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.preview() });
      closeSheet();
    },
  });

  const canPost = content.trim().length >= 3 && !!user && !mutation.isPending;

  const handlePost = useCallback(() => {
    if (!canPost) return;
    haptic.light();
    mutation.mutate();
  }, [canPost, mutation]);

  const handlePickPhoto = useCallback(async () => {
    const picked = await pickAndCompressImage();
    if (picked) setPhoto(picked.uri);
  }, []);

  const meta = ALERT_META[category];

  return (
    <View style={styles.container}>
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <View style={[styles.headIcon, { backgroundColor: meta.color + "22" }]}>
            <Icon name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.headCopy}>
            <Text variant="titleLarge" color={colors.text} style={styles.bold}>
              {t("post_alert")}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {t("post_alert_hint")}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          keyboardShouldPersistTaps="handled"
        >
          {ALERT_CATEGORIES.map((cat) => {
            const m = ALERT_META[cat];
            const selected = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: selected ? m.color : colors.surfaceContainerHigh,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={m.label}
              >
                <Icon name={m.icon} size={14} color={selected ? "#fff" : m.color} />
                <Text
                  variant="labelSmall"
                  color={selected ? "#fff" : colors.textSecondary}
                  style={styles.bold}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.field, { backgroundColor: colors.surfaceContainerHigh }]}>
          <Icon name="location-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.fieldInput, typography.input, { color: colors.text }]}
            placeholder={t("alert_location_placeholder")}
            placeholderTextColor={colors.placeholder}
            value={location}
            onChangeText={setLocation}
            accessibilityLabel={t("alert_location")}
          />
        </View>

        <View style={[styles.body, { backgroundColor: colors.surfaceContainerHigh }]}>
          <TextInput
            style={[styles.bodyInput, typography.input, { color: colors.text }]}
            placeholder={t("alert_content")}
            placeholderTextColor={colors.placeholder}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={MAX_CONTENT}
            textAlignVertical="top"
            accessibilityLabel={t("alert_content")}
          />
          <View style={styles.bodyFoot}>
            <Pressable
              onPress={handlePickPhoto}
              hitSlop={8}
              style={styles.photoBtn}
              accessibilityRole="button"
              accessibilityLabel={t("add_photo")}
            >
              <Icon name="image-outline" size={18} color={colors.primary} />
              <Text variant="labelSmall" color={colors.primary} style={styles.bold}>
                {t("add_photo")}
              </Text>
            </Pressable>
            <Text variant="caption" color={colors.textTertiary}>
              {content.length}/{MAX_CONTENT}
            </Text>
          </View>
        </View>

        {photo && (
          <View style={styles.preview}>
            <Image source={{ uri: photo }} style={styles.previewImg} contentFit="cover" />
            <Pressable
              onPress={() => setPhoto(null)}
              hitSlop={8}
              style={styles.previewRemove}
              accessibilityRole="button"
              accessibilityLabel={t("remove")}
            >
              <Icon name="close" size={15} color="#fff" />
            </Pressable>
          </View>
        )}
      </BottomSheetScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.divider },
        ]}
      >
        <Pressable
          onPress={handlePost}
          disabled={!canPost}
          style={[
            styles.postBtn,
            { backgroundColor: canPost ? colors.primary : colors.surfaceContainerHigh },
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPost }}
          accessibilityLabel={t("post_alert")}
        >
          <Icon
            name="megaphone"
            size={18}
            color={canPost ? colors.onPrimary : colors.textTertiary}
          />
          <Text
            variant="labelLarge"
            color={canPost ? colors.onPrimary : colors.textTertiary}
            style={styles.bold}
          >
            {mutation.isPending ? t("posting") : t("post_alert")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  bold: { fontWeight: "700" },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headCopy: { flex: 1, gap: 2 },
  catRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 50,
    borderRadius: radius.lg,
  },
  fieldInput: { flex: 1, padding: 0 },
  body: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  bodyInput: {
    minHeight: 104,
    padding: 0,
  },
  bodyFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  preview: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  previewImg: {
    width: "100%",
    height: 160,
  },
  previewRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.full,
  },
});
