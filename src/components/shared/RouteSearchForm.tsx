import React, {
  memo,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { TextInput } from "../forms/TextInput";
import { DatePicker } from "../forms/DatePicker";
import { TimePicker } from "../forms/TimePicker";
import { Toggle } from "../forms/Toggle";
import { Button } from "../core/Button";
import { Text } from "../core/Text";
import { Icon } from "../core/Icon";
import { useTheme, useLocale, useAppMode } from "@/hooks";
import { spacing, radius, shadows } from "@/theme";
import { format } from "date-fns";
import { storage, STORAGE_KEYS } from "@/lib/utils/mmkv";
import { DEFAULT_PREFERENCES } from "@/lib/constants";
import { detectNearestTownByIp } from "@/lib/utils/location";
import type {
  KenyanTown,
  RouteSearchForm as FormData,
  RidePreferences,
} from "@/types";
import towns from "@/assets/data/towns.json";

interface RouteSearchFormProps {
  onSearch: (form: FormData) => void;
  loading?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const JUNGLE_GREEN = "#1F4734";
const LIME_GREEN = "#96C93D";

export const RouteSearchForm = memo(function RouteSearchForm({
  onSearch,
  loading,
  expanded,
  onExpandedChange,
}: RouteSearchFormProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const { config } = useAppMode();

  const draft = useMemo(
    () => storage.getJSON<FormData>(STORAGE_KEYS.ROUTE_SEARCH_DRAFT),
    [],
  );

  const [from, setFrom] = useState(draft?.from ?? "");
  const [to, setTo] = useState(draft?.to ?? "");
  const [date, setDate] = useState<string | null>(draft?.date ?? null);
  const [time, setTime] = useState<string | null>(
    draft?.departure_time ?? null,
  );
  const [prefs, setPrefs] = useState<RidePreferences>(
    draft?.preferences ?? DEFAULT_PREFERENCES,
  );
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isExpanded = expanded ?? internalExpanded;

  const setExpanded = useCallback(
    (value: boolean) => {
      if (expanded === undefined) {
        setInternalExpanded(value);
      }
      onExpandedChange?.(value);
    },
    [expanded, onExpandedChange],
  );

  const [activeField, setActiveField] = useState<"from" | "to">("to");
  // A draft that already carries a date/time was scheduled for "later".
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">(
    draft?.date || draft?.departure_time ? "later" : "now",
  );

  const attemptedAutoFrom = useRef(false);
  const fromValueRef = useRef(from);

  useEffect(() => {
    fromValueRef.current = from;
  }, [from]);

  useEffect(() => {
    if (attemptedAutoFrom.current) return;
    if ((draft?.from?.trim().length ?? 0) > 0) {
      attemptedAutoFrom.current = true;
      return;
    }
    if (from.trim().length > 0) {
      attemptedAutoFrom.current = true;
      return;
    }

    attemptedAutoFrom.current = true;
    let mounted = true;

    detectNearestTownByIp(towns as KenyanTown[]).then((nearestTown) => {
      if (!mounted || !nearestTown || fromValueRef.current.trim().length > 0)
        return;
      setFrom(nearestTown.name);
    });

    return () => {
      mounted = false;
    };
  }, [draft?.from, from]);

  // Persist draft
  useEffect(() => {
    storage.setJSON(STORAGE_KEYS.ROUTE_SEARCH_DRAFT, {
      from,
      to,
      date,
      departure_time: time,
      preferences: prefs,
    } as FormData);
  }, [from, to, date, time, prefs]);

  const searchTowns = useCallback((query: string): KenyanTown[] => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return (towns as KenyanTown[])
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.county.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, []);

  const handleFromChange = useCallback((text: string) => {
    setFrom(text);
    setActiveField("from");
  }, []);

  const handleToChange = useCallback((text: string) => {
    setTo(text);
    setActiveField("to");
  }, []);

  const selectFrom = useCallback((town: KenyanTown) => {
    setFrom(town.name);
  }, []);

  const selectTo = useCallback((town: KenyanTown) => {
    setTo(town.name);
  }, []);

  // Pre-fill an empty schedule with the next quarter-hour so "Later" always
  // lands on a concrete, editable departure instead of a blank picker.
  const ensureSchedule = useCallback(() => {
    const quarter = 1000 * 60 * 15;
    const slot = new Date(Math.ceil(Date.now() / quarter) * quarter);
    setDate((prev) => prev ?? format(slot, "yyyy-MM-dd"));
    setTime((prev) => prev ?? format(slot, "HH:mm"));
  }, []);

  const expandToPlanner = useCallback(() => {
    setExpanded(true);
    setActiveField("to");
  }, [setExpanded]);

  const openLater = useCallback(() => {
    setScheduleMode("later");
    ensureSchedule();
    setExpanded(true);
    setActiveField("to");
  }, [ensureSchedule, setExpanded]);

  const chooseNow = useCallback(() => {
    setScheduleMode("now");
    setDate(null);
    setTime(null);
  }, []);

  const chooseSchedule = useCallback(() => {
    setScheduleMode("later");
    ensureSchedule();
  }, [ensureSchedule]);

  // Compact label for the "Later" pill once a departure has been picked.
  const scheduleLabel = useMemo(() => {
    if (scheduleMode !== "later" || !date) return null;
    const dt = new Date(`${date}T${time ?? "00:00"}`);
    if (Number.isNaN(dt.getTime())) return null;
    return time ? format(dt, "EEE d, HH:mm") : format(dt, "EEE d MMM");
  }, [scheduleMode, date, time]);

  const fallbackSuggestions = useMemo(() => {
    const source = towns as KenyanTown[];
    const pinned =
      from.trim().length > 0
        ? source.find(
            (town) => town.name.toLowerCase() === from.trim().toLowerCase(),
          )
        : null;

    const results: KenyanTown[] = [];
    if (pinned) results.push(pinned);

    for (const town of source) {
      if (results.length >= 6) break;
      if (results.some((existing) => existing.name === town.name)) continue;
      results.push(town);
    }
    return results;
  }, [from]);

  const suggestionItems = useMemo(() => {
    const activeValue = activeField === "from" ? from : to;
    const query = activeValue.trim();
    if (query.length > 0) return searchTowns(query);
    return fallbackSuggestions;
  }, [activeField, from, to, searchTowns, fallbackSuggestions]);

  const handleSuggestionPick = useCallback(
    (town: KenyanTown) => {
      if (activeField === "from") {
        selectFrom(town);
        return;
      }
      selectTo(town);
    },
    [activeField, selectFrom, selectTo],
  );

  const togglePref = useCallback(
    (key: keyof RidePreferences) => (val: boolean) => {
      setPrefs((prev) => ({ ...prev, [key]: val }));
    },
    [],
  );

  const handleSearch = useCallback(() => {
    onSearch({ from, to, date, departure_time: time, preferences: prefs });
  }, [from, to, date, time, prefs, onSearch]);

  const canSearch = from.length >= 2 && to.length >= 2;

  return (
    <View style={styles.container}>
      {!isExpanded ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={[
            styles.compactRow,
            shadows.lg,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <Pressable
            onPress={expandToPlanner}
            style={styles.compactSearchTap}
            accessibilityRole="button"
          >
            <Icon name="search-outline" size={20} color={colors.placeholder} />
            <Text
              variant="titleSmall"
              color={to.trim().length > 0 ? colors.text : colors.placeholder}
              style={styles.compactText}
              numberOfLines={1}
            >
              {to.trim().length > 0 ? to : t("to_placeholder")}
            </Text>
          </Pressable>

          <Pressable
            onPress={openLater}
            style={[
              styles.laterButton,
              shadows.sm,
              {
                backgroundColor: JUNGLE_GREEN,
                borderWidth: 1,
                borderColor: JUNGLE_GREEN,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              scheduleLabel ? `Scheduled for ${scheduleLabel}` : t("later")
            }
          >
            <Icon name="calendar-outline" size={15} color={LIME_GREEN} />
            <Text variant="labelMedium" color={LIME_GREEN} numberOfLines={1}>
              {scheduleLabel ?? t("later")}
            </Text>
          </Pressable>
        </Animated.View>
      ) : (
        <>
          {/* ── Collapse header: gives the user a clear way back to the
               available rides instead of being trapped in the planner ── */}
          <View style={styles.expandedHeader}>
            <Text variant="titleSmall" color={colors.text} style={styles.bold}>
              {t(config.searchCTA as any)}
            </Text>
            <Pressable
              onPress={() => setExpanded(false)}
              hitSlop={10}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfaceVariant },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("close")}
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* ── When: leave now vs. schedule for later ── */}
          <View
            style={[styles.segment, { backgroundColor: colors.surfaceVariant }]}
          >
            <Pressable
              onPress={chooseNow}
              style={[
                styles.segmentBtn,
                scheduleMode === "now" && [
                  styles.segmentBtnActive,
                  { backgroundColor: colors.surface },
                  shadows.sm,
                ],
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: scheduleMode === "now" }}
            >
              <Icon
                name="flash-outline"
                size={16}
                color={
                  scheduleMode === "now" ? colors.primary : colors.textSecondary
                }
              />
              <Text
                variant="labelMedium"
                color={
                  scheduleMode === "now" ? colors.primary : colors.textSecondary
                }
              >
                {t("leave_now")}
              </Text>
            </Pressable>
            <Pressable
              onPress={chooseSchedule}
              style={[
                styles.segmentBtn,
                scheduleMode === "later" && [
                  styles.segmentBtnActive,
                  { backgroundColor: JUNGLE_GREEN },
                  shadows.sm,
                ],
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: scheduleMode === "later" }}
            >
              <Icon
                name="calendar-outline"
                size={16}
                color={
                  scheduleMode === "later" ? LIME_GREEN : colors.textSecondary
                }
              />
              <Text
                variant="labelMedium"
                color={
                  scheduleMode === "later" ? LIME_GREEN : colors.textSecondary
                }
              >
                {t("schedule")}
              </Text>
            </Pressable>
          </View>

          {/* ── Schedule pickers (only when booking for later) ── */}
          {scheduleMode === "later" && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(120)}
              style={styles.dateTimeRow}
            >
              <View style={styles.dateTimeField}>
                <DatePicker
                  label={t("date")}
                  value={date}
                  onChange={setDate}
                  placeholder="Pick date"
                  minDate={new Date()}
                />
              </View>
              <View style={styles.dateTimeField}>
                <TimePicker
                  label={t("departure_time")}
                  value={time}
                  onChange={setTime}
                  placeholder="Pick time"
                />
              </View>
            </Animated.View>
          )}

          {/* ── From field ── */}
          <View style={styles.fieldGroup}>
            <TextInput
              placeholder={t("from_placeholder")}
              icon="ellipse-outline"
              value={from}
              onChangeText={handleFromChange}
              onFocus={() => setActiveField("from")}
              returnKeyType="next"
              autoCorrect={false}
            />
          </View>

          {/* Route connector dot */}
          <View style={styles.routeConnector}>
            <View
              style={[styles.connectorDot, { backgroundColor: colors.primary }]}
            />
            <View
              style={[styles.connectorLine, { borderColor: colors.border }]}
            />
            <View
              style={[styles.connectorDot, { backgroundColor: colors.error }]}
            />
          </View>

          {/* ── To field ── */}
          <View style={styles.fieldGroup}>
            <TextInput
              placeholder={t("to_placeholder")}
              icon="location-outline"
              value={to}
              onChangeText={handleToChange}
              onFocus={() => setActiveField("to")}
              returnKeyType="done"
              autoCorrect={false}
            />
          </View>

          {/* ── Suggestions below both fields ── */}
          {suggestionItems.length > 0 && (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(100)}
              style={styles.suggestionBox}
            >
              {suggestionItems.map((town, index) => (
                <Pressable
                  key={`${town.name}-${town.county}`}
                  onPress={() => handleSuggestionPick(town)}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    index < suggestionItems.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.borderLight,
                    },
                    {
                      backgroundColor: pressed
                        ? colors.surfaceElevated
                        : "transparent",
                    },
                  ]}
                >
                  <Icon
                    name="location-outline"
                    size={16}
                    color={
                      activeField === "from" ? colors.primary : colors.error
                    }
                  />
                  <View style={styles.suggestionText}>
                    <Text variant="titleSmall">{town.name}</Text>
                    <Text variant="caption" color={colors.textTertiary}>
                      {town.county}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Animated.View>
          )}
        </>
      )}

      {/* ── Advanced toggle ── */}
      {isExpanded && canSearch && (
        <Pressable
          onPress={() => setShowAdvanced((prev) => !prev)}
          style={styles.advancedToggle}
          accessibilityRole="button"
        >
          <Icon name="options-outline" size={16} color={colors.primary} />
          <Text variant="labelMedium" color={colors.primary}>
            {t("choose_comfort")}
          </Text>
          <Icon
            name={showAdvanced ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.primary}
          />
        </Pressable>
      )}

      {/* ── Advanced section ── */}
      {isExpanded && canSearch && showAdvanced && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.advanced}
        >
          <View
            style={[
              styles.prefsCard,
              {
                backgroundColor: colors.surfaceVariant,
                borderRadius: radius.lg,
              },
            ]}
          >
            <Text
              variant="labelMedium"
              color={colors.textSecondary}
              style={styles.prefsLabel}
            >
              {t(config.preferencesLabel as any)}
            </Text>
            <Toggle
              label={t("luggage")}
              icon="briefcase-outline"
              value={prefs.luggage}
              onToggle={togglePref("luggage")}
            />
            <Toggle
              label={t("pets")}
              icon="paw-outline"
              value={prefs.pets}
              onToggle={togglePref("pets")}
            />
            <Toggle
              label={t("silent_ride")}
              icon="volume-mute-outline"
              value={prefs.silent_ride}
              onToggle={togglePref("silent_ride")}
            />
            <Toggle
              label={t("music")}
              icon="musical-notes-outline"
              value={prefs.music}
              onToggle={togglePref("music")}
            />
          </View>
        </Animated.View>
      )}

      {/* ── Search CTA ── */}
      {isExpanded && (
        <Button
          label={t(config.searchCTA as any)}
          onPress={handleSearch}
          variant="filled"
          size="lg"
          fullWidth
          disabled={!canSearch}
          loading={loading}
          icon="search-outline"
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  bold: {
    fontWeight: "700",
  },
  expandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  compactRow: {
    height: 60,
    borderRadius: radius.full,
    borderWidth: 1.25,
    paddingHorizontal: spacing.xs + 2,
    paddingLeft: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    // Raised, tappable pill — reads as the primary action on the screen.
    elevation: 8,
  },
  compactSearchTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  compactText: {
    flex: 1,
  },
  laterButton: {
    borderRadius: radius.full,
    height: 42,
    maxWidth: 150,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  segment: {
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
    height: 40,
    borderRadius: radius.full,
  },
  segmentBtnActive: {
    borderRadius: radius.full,
  },
  fieldGroup: {
    gap: 0,
  },
  routeConnector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    marginVertical: -spacing.xs,
    gap: 2,
  },
  connectorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectorLine: {
    flex: 1,
    height: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  suggestionBox: {
    marginTop: spacing.xs,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    gap: 1,
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.xs,
  },
  advanced: {
    gap: spacing.md,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  dateTimeField: {
    flex: 1,
  },
  prefsCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  prefsLabel: {
    marginBottom: spacing.xs,
  },
});
