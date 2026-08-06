import React, { memo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import { Text } from "@/components/core/Text";
import { Icon } from "@/components/core/Icon";
import type { IconName } from "@/components/core/Icon";
import { spacing } from "@/theme";

export type StatusFlowStep = {
  key: string;
  label: string;
  icon?: IconName;
};

export type StatusFlowState = "active" | "complete" | "error";

export interface StatusFlowProps {
  steps: StatusFlowStep[];
  /** Index of the current node. */
  currentIndex: number;
  /**
   * active   → the leg leaving the current node flows toward the next stage.
   * complete → every node reached, nothing in motion.
   * error    → current node shown in `accent` (pass an error colour), no motion.
   */
  state?: StatusFlowState;
  /** Filled / active colour. */
  accent: string;
  /** Icon colour drawn on top of `accent`. */
  onAccent: string;
  /** Muted colour for idle nodes, upcoming track, and idle labels. */
  track: string;
  /** Reached-label colour. */
  labelColor: string;
}

const DOT = 34;
const TILE = 12;
const PIP = 4;

/**
 * A horizontal, animated status tracker: labelled nodes joined by a dotted
 * track whose completed/active leg "flows" toward the next stage. Reused for
 * the ride lifecycle and the payment/escrow state. RN-native (Reanimated), so
 * it mirrors the web landing's flowing-dot language without any CSS.
 */
export const StatusFlow = memo(function StatusFlow({
  steps,
  currentIndex,
  state = "active",
  accent,
  onAccent,
  track,
  labelColor,
}: StatusFlowProps) {
  return (
    <View style={styles.row}>
      {steps.map((s, i) => {
        const reached = state === "complete" || i <= currentIndex;
        const active = state === "active" && i === currentIndex;
        const hasNext = i < steps.length - 1;
        const legDone = state === "complete" || i < currentIndex;
        const legFlowing = state === "active" && i === currentIndex && hasNext;
        return (
          <React.Fragment key={s.key}>
            <View style={styles.step}>
              <Node
                icon={s.icon}
                reached={reached}
                active={active}
                accent={accent}
                onAccent={onAccent}
                track={track}
              />
              <Text
                variant="caption"
                color={reached ? labelColor : track}
                align="center"
                style={[styles.label, reached ? styles.bold : null]}
              >
                {s.label}
              </Text>
            </View>
            {hasNext && (
              <DottedTrack
                color={legDone || legFlowing ? accent : track}
                flowing={legFlowing}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
});

const Node = memo(function Node({
  icon,
  reached,
  active,
  accent,
  onAccent,
  track,
}: {
  icon?: IconName;
  reached: boolean;
  active: boolean;
  accent: string;
  onAccent: string;
  track: string;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    return () => cancelAnimation(pulse);
  }, [active, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.85 }],
  }));

  return (
    <View style={styles.node}>
      {active && (
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { backgroundColor: accent }, haloStyle]}
        />
      )}
      <View
        style={[
          styles.dot,
          reached
            ? { backgroundColor: accent }
            : { backgroundColor: "transparent", borderWidth: 2, borderColor: track },
        ]}
      >
        {icon ? (
          <Icon name={icon} size={16} color={reached ? onAccent : track} />
        ) : null}
      </View>
    </View>
  );
});

const DottedTrack = memo(function DottedTrack({
  color,
  flowing,
}: {
  color: string;
  flowing: boolean;
}) {
  const shift = useSharedValue(0);

  useEffect(() => {
    if (flowing) {
      shift.value = 0;
      shift.value = withRepeat(
        withTiming(TILE, { duration: 650, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(shift);
      shift.value = 0;
    }
    return () => cancelAnimation(shift);
  }, [flowing, shift]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
  }));

  return (
    <View style={styles.trackClip}>
      <Animated.View style={[styles.trackRow, rowStyle]}>
        {Array.from({ length: 26 }).map((_, i) => (
          <View key={i} style={[styles.pip, { backgroundColor: color }]} />
        ))}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  step: { width: 74, alignItems: "center" },
  node: { width: DOT, height: DOT, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: DOT, height: DOT, borderRadius: DOT / 2 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { marginTop: spacing.sm },
  bold: { fontWeight: "700" },
  trackClip: {
    flex: 1,
    height: PIP,
    marginTop: (DOT - PIP) / 2,
    overflow: "hidden",
    justifyContent: "center",
  },
  trackRow: { flexDirection: "row", marginLeft: -TILE },
  pip: { width: PIP, height: PIP, borderRadius: PIP / 2, marginRight: TILE - PIP },
});
