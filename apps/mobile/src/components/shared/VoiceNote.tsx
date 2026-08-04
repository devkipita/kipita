import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from "react";
import { View, Pressable, StyleSheet, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  type SharedValue,
} from "react-native-reanimated";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Icon } from "../core/Icon";
import { Text } from "../core/Text";
import { spacing, radius } from "@/theme";

const BAR_COUNT = 34;
const BAR_W = 3;
const BAR_GAP = 2;
const MAX_H = 24;
const MIN_H = 5;
const SPEEDS = [1, 1.5, 2] as const;

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Deterministic bar heights from the uri so a note always looks the same. */
function seededBars(uri: string): number[] {
  let seed = 0;
  for (let i = 0; i < uri.length; i++) seed = (seed * 31 + uri.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const r = (seed % 1000) / 1000;
    out.push(MIN_H + r * (MAX_H - MIN_H));
  }
  return out;
}

interface VoiceNoteProps {
  uri: string;
  durationMs?: number;
  /** Foreground color (icons + filled bars). */
  tint: string;
  /** Muted color for unplayed bars + time. */
  track: string;
}

/** WhatsApp/Telegram-style voice player: seekable colorful waveform + speed. */
export const VoiceNote = memo(function VoiceNote({
  uri,
  durationMs,
  tint,
  track,
}: VoiceNoteProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const bars = useMemo(() => seededBars(uri), [uri]);

  const [width, setWidth] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);

  // On web HTMLMediaElement.duration is Infinity/NaN until metadata loads, so
  // only trust a finite, positive value — otherwise fall back to the sent meta.
  const total =
    Number.isFinite(status.duration) && status.duration > 0
      ? status.duration
      : (durationMs ?? 0) / 1000;
  const current = Number.isFinite(status.currentTime) ? status.currentTime : 0;
  const progress = total > 0 ? Math.min(1, current / total) : 0;
  const playing = !!status.playing;

  // Guard every seek: passing a non-finite time throws on the web audio element.
  const safeSeekTo = useCallback(
    (t: number) => {
      if (Number.isFinite(t)) player.seekTo(Math.max(0, t));
    },
    [player],
  );

  const toggle = useCallback(() => {
    if (playing) {
      player.pause();
    } else {
      if (status.didJustFinish || progress >= 1) safeSeekTo(0);
      player.play();
    }
  }, [player, playing, status.didJustFinish, progress, safeSeekTo]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const seek = useCallback(
    (x: number) => {
      if (!width || !Number.isFinite(total) || total <= 0) return;
      const frac = Math.max(0, Math.min(1, x / width));
      safeSeekTo(frac * total);
    },
    [safeSeekTo, width, total],
  );

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    try {
      player.setPlaybackRate(SPEEDS[next]);
    } catch {
      /* setPlaybackRate unsupported — ignore */
    }
  }, [player, speedIdx]);

  // Gentle wave animation while playing.
  const wave = useSharedValue(0);
  useEffect(() => {
    if (playing) {
      wave.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    } else {
      cancelAnimation(wave);
      wave.value = withTiming(0, { duration: 200 });
    }
  }, [playing, wave]);

  const filledCount = Math.round(progress * BAR_COUNT);
  const label = fmt(playing || current > 0 ? current : total);

  return (
    <View style={styles.row}>
      <Pressable onPress={toggle} hitSlop={8} style={[styles.playBtn, { backgroundColor: tint + "22" }]}>
        <Icon name={playing ? "pause" : "play"} size={18} color={tint} />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.waveWrap} onLayout={onLayout}>
          {bars.map((h, i) => (
            <WaveBar
              key={i}
              h={h}
              index={i}
              filled={i < filledCount}
              color={i < filledCount ? tint : track}
              wave={wave}
            />
          ))}
          {/* Transparent seek surface on top of the bars. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={(e) => seek(e.nativeEvent.locationX)}
            accessibilityRole="adjustable"
            accessibilityLabel="Seek voice note"
          />
        </View>

        <View style={styles.meta}>
          <Text variant="caption" color={track}>
            {label}
          </Text>
          <Pressable
            onPress={cycleSpeed}
            hitSlop={8}
            style={[styles.speed, { borderColor: tint }]}
            accessibilityRole="button"
            accessibilityLabel={`Playback speed ${SPEEDS[speedIdx]}x`}
          >
            <Text variant="labelSmall" color={tint} style={styles.speedText}>
              {SPEEDS[speedIdx]}x
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const WaveBar = memo(function WaveBar({
  h,
  index,
  filled,
  color,
  wave,
}: {
  h: number;
  index: number;
  filled: boolean;
  color: string;
  wave: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // Only unplayed→played bars breathe; keeps it subtle and cheap.
    const phase = index * 0.5;
    const m = 1 + wave.value * 0.35 * Math.abs(Math.sin(phase + wave.value * Math.PI * 2));
    return { transform: [{ scaleY: filled ? m : 1 }] };
  });
  return (
    <Animated.View
      style={[
        styles.bar,
        { height: h, backgroundColor: color },
        style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 200,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 4 },
  waveWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: MAX_H,
    gap: BAR_GAP,
    overflow: "hidden",
  },
  bar: {
    width: BAR_W,
    borderRadius: BAR_W,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  speed: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  speedText: { fontWeight: "700" },
});
