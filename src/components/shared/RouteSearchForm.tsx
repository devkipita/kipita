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
import { spacing, radius } from "@/theme";
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
}

export const RouteSearchForm = memo(function RouteSearchForm({
  onSearch,
  loading,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeField, setActiveField] = useState<"from" | "to">("to");

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

  const expandToPlanner = useCallback(() => {
    setIsExpanded(true);
    setActiveField("to");
  }, []);

  const openLater = useCallback(() => {
    setIsExpanded(true);
    setShowAdvanced(true);
    setActiveField("to");
  }, []);

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
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
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
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.borderLight,
              },
            ]}
            accessibilityRole="button"
          >
            <Icon
              name="calendar-outline"
              size={15}
              color={colors.textSecondary}
            />
            <Text variant="labelMedium" color={colors.textSecondary}>
              Later
            </Text>
          </Pressable>
        </Animated.View>
      ) : (
        <>
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
          <Text variant="labelMedium" color={colors.primary}>
            {t("advanced_options")}
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
          <View style={styles.dateTimeRow}>
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
          </View>

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
  compactRow: {
    height: 58,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
    borderWidth: 1,
    height: 36,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
