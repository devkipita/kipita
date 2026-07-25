import React, { memo, useState, useCallback } from "react";
import { View, Modal, Pressable, StyleSheet, ScrollView } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { useTheme } from "@/hooks";
import { spacing, radius, shadows } from "@/theme";

interface TimePickerProps {
  label?: string;
  value: string | null;
  onChange: (time: string) => void;
  placeholder?: string;
}

const JUNGLE_GREEN = "#1F4734";
const LIME_GREEN = "#96C93D";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"];

function formatDisplay(h: number, m: string, p: string) {
  return `${String(h).padStart(2, "0")}:${m} ${p}`;
}

function to24Hour(h: number, m: string, p: string): string {
  let hour = h;
  if (p === "AM" && h === 12) hour = 0;
  if (p === "PM" && h !== 12) hour = h + 12;
  return `${String(hour).padStart(2, "0")}:${m}`;
}

export const TimePicker = memo(function TimePicker({
  label,
  value,
  onChange,
  placeholder = "Select time",
}: TimePickerProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  // Parse value if present (HH:mm format)
  const parseValue = useCallback(() => {
    if (!value) return { h: 8, m: "00", p: "AM" };
    const [hStr, mStr] = value.split(":");
    const totalH = parseInt(hStr, 10);
    const period = totalH >= 12 ? "PM" : "AM";
    const hour = totalH % 12 || 12;
    return { h: hour, m: mStr ?? "00", p: period };
  }, [value]);

  const init = parseValue();
  const [selectedH, setSelectedH] = useState(init.h);
  const [selectedM, setSelectedM] = useState(init.m);
  const [selectedP, setSelectedP] = useState(init.p);

  const displayLabel = value
    ? formatDisplay(selectedH, selectedM, selectedP)
    : null;

  const handleConfirm = useCallback(() => {
    onChange(to24Hour(selectedH, selectedM, selectedP));
    setOpen(false);
  }, [selectedH, selectedM, selectedP, onChange]);

  return (
    <View style={styles.container}>
      {label && (
        <Text
          variant="labelMedium"
          color={colors.textSecondary}
          style={styles.label}
        >
          {label}
        </Text>
      )}

      {/* Trigger */}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          shadows.lg,
          {
            shadowColor: colors.shadow,
            backgroundColor: pressed
              ? colors.surfaceContainerLow
              : colors.inputBackground,
            borderColor: open ? colors.inputFocusBorder : colors.inputBorder,
            borderWidth: open ? 2 : 1.25,
          },
        ]}
        accessibilityRole="button"
      >
        <Icon
          name="time-outline"
          size={20}
          color={open ? colors.inputFocusBorder : colors.placeholder}
        />
        <Text
          variant="bodyMedium"
          color={displayLabel ? colors.onSurface : colors.placeholder}
          style={styles.triggerText}
        >
          {displayLabel ?? placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.placeholder} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(100)}
          style={styles.backdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <Animated.View
            entering={SlideInDown.springify().damping(20)}
            exiting={SlideOutDown.duration(200)}
            style={[styles.sheet, { backgroundColor: colors.sheetBackground }]}
          >
            <View
              style={[styles.handle, { backgroundColor: colors.sheetHandle }]}
            />

            <Text variant="headlineSmall" style={styles.sheetTitle}>
              Departure Time
            </Text>

            {/* Time display */}
            <View
              style={[
                styles.displayRow,
                {
                  backgroundColor: JUNGLE_GREEN,
                  borderRadius: radius.xl,
                },
              ]}
            >
              <Text variant="displayMedium" color={LIME_GREEN}>
                {String(selectedH).padStart(2, "0")}:{selectedM}
              </Text>
              <Text
                variant="headlineMedium"
                color={LIME_GREEN}
                style={{ marginLeft: spacing.sm }}
              >
                {selectedP}
              </Text>
            </View>

            {/* Hour row */}
            <View style={styles.sectionRow}>
              <Text
                variant="labelMedium"
                color={colors.textSecondary}
                style={styles.sectionLabel}
              >
                Hour
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.optionRow}
              >
                {HOURS.map((h) => {
                  const sel = selectedH === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setSelectedH(h)}
                      style={[
                        styles.optionCell,
                        {
                          backgroundColor: sel
                            ? JUNGLE_GREEN
                            : colors.surfaceVariant,
                          borderRadius: radius.md,
                        },
                      ]}
                    >
                      <Text
                        variant="titleMedium"
                        color={sel ? LIME_GREEN : colors.text}
                      >
                        {String(h).padStart(2, "0")}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Minute row */}
            <View style={styles.sectionRow}>
              <Text
                variant="labelMedium"
                color={colors.textSecondary}
                style={styles.sectionLabel}
              >
                Minute
              </Text>
              <View style={styles.optionRow}>
                {MINUTES.map((m) => {
                  const sel = selectedM === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setSelectedM(m)}
                      style={[
                        styles.optionCell,
                        styles.minuteCell,
                        {
                          backgroundColor: sel
                            ? JUNGLE_GREEN
                            : colors.surfaceVariant,
                          borderRadius: radius.md,
                        },
                      ]}
                    >
                      <Text
                        variant="titleMedium"
                        color={sel ? LIME_GREEN : colors.text}
                      >
                        :{m}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* AM/PM */}
            <View style={styles.sectionRow}>
              <Text
                variant="labelMedium"
                color={colors.textSecondary}
                style={styles.sectionLabel}
              >
                Period
              </Text>
              <View style={styles.optionRow}>
                {PERIODS.map((p) => {
                  const sel = selectedP === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setSelectedP(p)}
                      style={[
                        styles.optionCell,
                        styles.periodCell,
                        {
                          backgroundColor: sel
                            ? JUNGLE_GREEN
                            : colors.surfaceVariant,
                          borderRadius: radius.md,
                        },
                      ]}
                    >
                      <Text
                        variant="titleMedium"
                        color={sel ? LIME_GREEN : colors.text}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Confirm */}
            <Pressable
              onPress={handleConfirm}
              style={[
                styles.confirmBtn,
                { backgroundColor: JUNGLE_GREEN, borderRadius: radius.lg },
              ]}
            >
              <Text variant="titleMedium" color={LIME_GREEN}>
                Confirm
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { marginLeft: 2 },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.25,
    gap: spacing.sm,
  },
  triggerText: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"],
    alignItems: "center",
    gap: spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginVertical: spacing.md,
  },
  sheetTitle: {
    alignSelf: "flex-start",
  },
  displayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    width: "100%",
    justifyContent: "center",
  },
  sectionRow: {
    width: "100%",
    gap: spacing.sm,
  },
  sectionLabel: {
    marginLeft: 2,
  },
  optionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionCell: {
    width: 52,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  minuteCell: {
    width: 68,
  },
  periodCell: {
    width: 72,
  },
  confirmBtn: {
    width: "100%",
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
});
