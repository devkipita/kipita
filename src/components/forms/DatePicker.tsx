import React, { memo, useState, useCallback, useMemo } from "react";
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
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  getDaysInMonth,
  getDay,
} from "date-fns";

interface DatePickerProps {
  label?: string;
  value: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: Date;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const DatePicker = memo(function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Select date",
  minDate,
}: DatePickerProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const parsedValue = value ? new Date(value) : null;

  const [viewMonth, setViewMonth] = useState<Date>(parsedValue ?? today);
  const [selected, setSelected] = useState<Date | null>(parsedValue);

  const displayLabel = selected ? format(selected, "EEE, d MMM yyyy") : null;
  const filled = Boolean(displayLabel);

  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDayOfWeek = getDay(startOfMonth(viewMonth));

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [daysInMonth, firstDayOfWeek]);

  const handleSelectDay = useCallback(
    (day: number) => {
      const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      if (minDate && date < minDate) return;
      setSelected(date);
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    },
    [viewMonth, minDate, onChange],
  );

  const isPastDay = useCallback(
    (day: number) => {
      if (!minDate) return false;
      const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      return date < minDate;
    },
    [viewMonth, minDate],
  );

  const isSelectedDay = useCallback(
    (day: number) => {
      if (!selected) return false;
      return (
        selected.getDate() === day &&
        selected.getMonth() === viewMonth.getMonth() &&
        selected.getFullYear() === viewMonth.getFullYear()
      );
    },
    [selected, viewMonth],
  );

  const isToday = useCallback(
    (day: number) => {
      return (
        today.getDate() === day &&
        today.getMonth() === viewMonth.getMonth() &&
        today.getFullYear() === viewMonth.getFullYear()
      );
    },
    [today, viewMonth],
  );

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
              : filled
                ? colors.primaryContainer
                : colors.inputBackground,
            borderColor: open
              ? colors.inputFocusBorder
              : filled
                ? colors.primary
                : colors.inputBorder,
            borderWidth: open ? 2 : filled ? 1.5 : 1.25,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={displayLabel ?? placeholder}
      >
        <Icon
          name="calendar-outline"
          size={20}
          color={
            open || filled ? colors.primary : colors.placeholder
          }
        />
        <Text
          variant="bodyMedium"
          color={filled ? colors.onPrimaryContainer : colors.placeholder}
          style={styles.triggerText}
        >
          {displayLabel ?? placeholder}
        </Text>
        <Icon
          name="chevron-down"
          size={18}
          color={filled ? colors.onPrimaryContainer : colors.placeholder}
        />
      </Pressable>

      {/* Modal */}
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
            {/* Handle */}
            <View
              style={[styles.handle, { backgroundColor: colors.sheetHandle }]}
            />

            {/* Month nav */}
            <View style={styles.monthNav}>
              <Pressable
                onPress={() => setViewMonth((m) => subMonths(m, 1))}
                hitSlop={12}
                style={styles.navBtn}
              >
                <Icon name="chevron-back" size={22} color={colors.primary} />
              </Pressable>
              <Text variant="titleLarge">{format(viewMonth, "MMMM yyyy")}</Text>
              <Pressable
                onPress={() => setViewMonth((m) => addMonths(m, 1))}
                hitSlop={12}
                style={styles.navBtn}
              >
                <Icon name="chevron-forward" size={22} color={colors.primary} />
              </Pressable>
            </View>

            {/* Day names */}
            <View style={styles.dayNames}>
              {DAY_NAMES.map((d) => (
                <View key={d} style={styles.headCell}>
                  <Text variant="labelSmall" color={colors.textTertiary}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar grid — 7 flexible columns so it fits any width */}
            <View style={styles.grid}>
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }
                const sel = isSelectedDay(day);
                const tod = isToday(day);
                const past = isPastDay(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => !past && handleSelectDay(day)}
                    style={styles.dayCell}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel, disabled: past }}
                  >
                    <View
                      style={[
                        styles.dayInner,
                        sel && { backgroundColor: colors.primary },
                        !sel &&
                          tod && {
                            borderWidth: 1.5,
                            borderColor: colors.primary,
                          },
                      ]}
                    >
                      <Text
                        variant="bodyMedium"
                        color={
                          sel
                            ? colors.onPrimary
                            : past
                              ? colors.textTertiary
                              : tod
                                ? colors.primary
                                : colors.text
                        }
                      >
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Cancel */}
            <Pressable onPress={() => setOpen(false)} style={styles.cancelBtn}>
              <Text variant="labelLarge" color={colors.textSecondary}>
                Cancel
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing["3xl"],
    alignItems: "center",
    // Cap width so the calendar stays comfortable on tablets / web.
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginVertical: spacing.md,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: spacing.md,
  },
  navBtn: {
    padding: spacing.sm,
  },
  dayNames: {
    flexDirection: "row",
    width: "100%",
    marginBottom: spacing.xs,
  },
  headCell: {
    // 7 equal columns — matches the day grid exactly at any width.
    width: `${100 / 7}%`,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing["2xl"],
  },
});
