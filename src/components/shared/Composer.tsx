import React, { memo, useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput as RNTextInput,
  Pressable,
  Keyboard,
  Platform,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { Icon } from "../core/Icon";
import { Text } from "../core/Text";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import { useTheme, useVoiceRecorder } from "@/hooks";
import { spacing, radius, typography } from "@/theme";
import { pickAndCompressImage } from "@/lib/utils/media";
import { isGiphyEnabled } from "@/lib/api/giphy";
import { haptic } from "@/lib/utils/haptics";

/** Web-only style to kill the default input outline. Kept out of
 * StyleSheet.create so its non-RN props don't widen the sheet's types. */
const WEB_INPUT_RESET = { outlineStyle: "none", boxShadow: "none" } as any;

const MIN_INPUT_H = 40;
const MAX_INPUT_H = 120;
// Drag distance (px) past which a release cancels / locks the recording.
const CANCEL_X = -90;
const LOCK_Y = -70;

function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export interface ComposerAttachment {
  type: "image" | "gif";
  uri: string;
  width?: number;
  height?: number;
}

interface ComposerProps {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  placeholder?: string;
  sending?: boolean;
  /** Enable photo + GIF attachments. */
  media?: boolean;
  attachment?: ComposerAttachment | null;
  onAttachmentChange?: (a: ComposerAttachment | null) => void;
  /** Optional element rendered at the far left (e.g. the current user avatar). */
  leftSlot?: React.ReactNode;
  maxLength?: number;
  autoFocus?: boolean;
  /**
   * Enable voice notes. Hold the mic to record, slide left to cancel, slide up
   * to lock hands-free, release to send. Fires onSendVoice with a local uri.
   */
  voice?: boolean;
  onSendVoice?: (uri: string, durationMs: number) => void;
}

/**
 * One composer to rule them all — chat, alert threads and alert-posting share it.
 * Owns emoji, photo/GIF attach, the growing text field and voice recording.
 */
export const Composer = memo(function Composer({
  value,
  onChangeText,
  onSend,
  placeholder = "Type a message…",
  sending = false,
  media = false,
  attachment = null,
  onAttachmentChange,
  leftSlot,
  maxLength = 500,
  autoFocus = false,
  voice = false,
  onSendVoice,
}: ComposerProps) {
  const { colors } = useTheme();
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_H);
  const [locked, setLocked] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const recorder = useVoiceRecorder();

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const hasContent = value.trim().length > 0 || !!attachment;
  const canSend = hasContent && !sending;
  const voiceEnabled = voice && !!onSendVoice;
  const recording = recorder.isRecording;
  const holding = recording && !locked;
  const lockedRec = recording && locked;
  // Mic (gesture) when voice is on, the field is empty, and not in a locked take.
  const showMic = voiceEnabled && !hasContent && !sending && !lockedRec;

  // ── Recording controls ──────────────────────────────────────
  const beginRecording = useCallback(async () => {
    setShowEmoji(false);
    Keyboard.dismiss();
    setLocked(false);
    haptic.medium();
    const ok = await recorder.start();
    if (!ok) haptic.error();
  }, [recorder]);

  const sendRecording = useCallback(async () => {
    haptic.success();
    setLocked(false);
    const rec = await recorder.stop();
    if (rec) onSendVoice?.(rec.uri, rec.durationMs);
  }, [recorder, onSendVoice]);

  const cancelRecording = useCallback(async () => {
    haptic.light();
    setLocked(false);
    await recorder.cancel();
  }, [recorder]);

  const lockRecording = useCallback(() => {
    haptic.medium();
    setLocked(true);
  }, []);

  // Resolve a hold-gesture release into send / cancel / lock.
  const resolveRelease = useCallback(
    (x: number, y: number) => {
      if (y < LOCK_Y) {
        lockRecording();
      } else if (x < CANCEL_X) {
        cancelRecording();
      } else {
        sendRecording();
      }
    },
    [lockRecording, cancelRecording, sendRecording],
  );

  // Memoized so the 200ms recording-timer re-renders don't hand GestureDetector
  // a fresh gesture object mid-hold (which can drop the active gesture).
  const holdGesture = useMemo(
    () =>
      Gesture.Pan()
        .shouldCancelWhenOutside(false)
        .onBegin(() => {
          dragX.value = 0;
          dragY.value = 0;
          runOnJS(beginRecording)();
        })
        .onUpdate((e) => {
          dragX.value = Math.min(0, e.translationX);
          dragY.value = Math.min(0, e.translationY);
        })
        .onEnd(() => {
          runOnJS(resolveRelease)(dragX.value, dragY.value);
          dragX.value = withTiming(0);
          dragY.value = withTiming(0);
        }),
    [beginRecording, resolveRelease, dragX, dragY],
  );

  // ── Animated styles for the hold state ──────────────────────
  const micStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      {
        scale: interpolate(dragY.value, [LOCK_Y, 0], [1.25, 1], Extrapolation.CLAMP),
      },
    ],
  }));
  const slideHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [CANCEL_X, CANCEL_X / 2, 0], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [{ translateX: dragX.value * 0.4 }],
  }));
  const lockHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.value, [LOCK_Y, -20, 0], [1, 0.9, 0.5], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(dragY.value, [LOCK_Y, 0], [-6, 0], Extrapolation.CLAMP) },
      { scale: interpolate(dragY.value, [LOCK_Y, 0], [1.15, 1], Extrapolation.CLAMP) },
    ],
  }));

  // ── Emoji / media ───────────────────────────────────────────
  const handleEmoji = useCallback(
    (emoji: string) => {
      if (emoji === "") {
        onChangeText(Array.from(value).slice(0, -1).join(""));
        return;
      }
      onChangeText(value + emoji);
    },
    [value, onChangeText],
  );

  const toggleEmoji = useCallback(() => {
    if (!showEmoji) Keyboard.dismiss();
    setShowEmoji((s) => !s);
  }, [showEmoji]);

  const handlePickImage = useCallback(async () => {
    setShowEmoji(false);
    setPickingImage(true);
    try {
      const img = await pickAndCompressImage();
      if (img) {
        onAttachmentChange?.({
          type: "image",
          uri: img.uri,
          width: img.width,
          height: img.height,
        });
      }
    } finally {
      setPickingImage(false);
    }
  }, [onAttachmentChange]);

  const onInputSize = useCallback((h: number) => {
    setInputHeight(Math.max(MIN_INPUT_H, Math.min(MAX_INPUT_H, Math.ceil(h))));
  }, []);

  return (
    <View>
      {/* Attachment preview */}
      {attachment && (
        <View style={styles.attachRow}>
          <View style={styles.attachThumb}>
            <Image
              source={{ uri: attachment.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <Pressable
              onPress={() => onAttachmentChange?.(null)}
              style={styles.attachRemove}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove attachment"
            >
              <Icon name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Input row — kept as 3 stable slots (leading / center / trailing) so the
          mic GestureDetector never unmounts mid-gesture (which would cancel a
          recording the instant it starts). */}
      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        {/* ── Leading ── */}
        <View style={styles.leading}>
          {lockedRec ? (
            <Pressable
              onPress={cancelRecording}
              style={styles.iconBtn}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Cancel recording"
            >
              <Icon name="trash-outline" size={22} color={colors.error} />
            </Pressable>
          ) : holding ? null : (
            <>
              {leftSlot}
              <Pressable
                onPress={toggleEmoji}
                style={styles.iconBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Emoji"
              >
                <Icon
                  name={showEmoji ? "keypad-outline" : "happy"}
                  size={24}
                  color={showEmoji ? colors.textSecondary : colors.tertiary}
                />
              </Pressable>
              {media && (
                <Pressable
                  onPress={handlePickImage}
                  style={styles.iconBtn}
                  hitSlop={6}
                  disabled={pickingImage}
                  accessibilityRole="button"
                  accessibilityLabel="Attach photo"
                >
                  {pickingImage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Icon name="image" size={24} color={colors.primary} />
                  )}
                </Pressable>
              )}
              {media && isGiphyEnabled && (
                <Pressable
                  onPress={() => {
                    setShowEmoji(false);
                    setShowGif(true);
                  }}
                  style={styles.gifBtn}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Attach GIF"
                >
                  <View style={[styles.gifBadge, { borderColor: colors.secondary }]}>
                    <Text
                      variant="labelSmall"
                      color={colors.secondary}
                      style={styles.gifText}
                    >
                      GIF
                    </Text>
                  </View>
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* ── Center ── */}
        <View style={styles.center}>
          {recording ? (
            <View style={styles.recordBar}>
              <PulseDot color={colors.error} />
              <Text variant="bodyMedium" color={colors.text}>
                {fmtDuration(recorder.durationMs)}
              </Text>
              {lockedRec ? (
                <View style={styles.lockChip}>
                  <Icon name="lock-closed" size={12} color={colors.primary} />
                  <Text variant="caption" color={colors.textSecondary}>
                    Locked
                  </Text>
                </View>
              ) : (
                <Animated.View style={[styles.slideHint, slideHintStyle]}>
                  <Icon name="chevron-back" size={16} color={colors.textSecondary} />
                  <Text variant="caption" color={colors.textSecondary}>
                    slide to cancel
                  </Text>
                </Animated.View>
              )}
            </View>
          ) : (
            <RNTextInput
              style={[
                styles.input,
                typography.bodyMedium,
                {
                  height: inputHeight,
                  color: colors.text,
                  backgroundColor: colors.inputBackground,
                },
                Platform.OS === "web" ? WEB_INPUT_RESET : null,
              ]}
              placeholder={placeholder}
              placeholderTextColor={colors.placeholder}
              value={value}
              onChangeText={onChangeText}
              onFocus={() => setShowEmoji(false)}
              onContentSizeChange={(e) =>
                onInputSize(e.nativeEvent.contentSize.height)
              }
              multiline
              textAlignVertical="center"
              scrollEnabled={inputHeight >= MAX_INPUT_H}
              maxLength={maxLength}
              autoFocus={autoFocus}
            />
          )}
        </View>

        {/* ── Trailing (mic gesture persists across idle↔holding) ── */}
        {lockedRec ? (
          <Pressable
            onPress={sendRecording}
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Send voice note"
          >
            <Icon name="send" size={18} color={colors.onPrimary} />
          </Pressable>
        ) : showMic ? (
          <GestureDetector gesture={holdGesture}>
            <Animated.View
              style={[
                styles.sendBtn,
                { backgroundColor: holding ? colors.error : colors.primary },
                micStyle,
              ]}
            >
              <Icon name="mic" size={20} color={colors.onPrimary} />
            </Animated.View>
          </GestureDetector>
        ) : (
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={[
              styles.sendBtn,
              { backgroundColor: canSend ? colors.primary : colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Icon
                name="send"
                size={18}
                color={canSend ? colors.onPrimary : colors.textTertiary}
              />
            )}
          </Pressable>
        )}

        {/* Lock hint — absolute so it never shifts the trailing slot's index */}
        {holding && (
          <Animated.View style={[styles.lockHint, lockHintStyle]} pointerEvents="none">
            <Icon name="lock-open-outline" size={16} color={colors.textSecondary} />
            <Icon name="chevron-up" size={12} color={colors.textSecondary} />
          </Animated.View>
        )}
      </View>

      {/* Emoji panel */}
      {showEmoji && <EmojiPicker onSelect={handleEmoji} />}

      <GifPicker
        visible={showGif}
        onClose={() => setShowGif(false)}
        onSelect={(gif) =>
          onAttachmentChange?.({
            type: "gif",
            uri: gif.url,
            width: gif.width,
            height: gif.height,
          })
        }
      />
    </View>
  );
});

/** Small pulsing red dot shown while recording. */
const PulseDot = memo(function PulseDot({ color }: { color: string }) {
  const o = useSharedValue(1);
  React.useEffect(() => {
    o.value = withRepeat(withTiming(0.25, { duration: 600 }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.recordDot, { backgroundColor: color }, style]} />;
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  leading: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },
  iconBtn: {
    width: 36,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  gifBtn: {
    height: 42,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  gifBadge: {
    borderWidth: 1.5,
    borderRadius: radius.xs,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  gifText: { fontWeight: "800", letterSpacing: 0.5 },
  input: {
    width: "100%",
    maxHeight: MAX_INPUT_H,
    minHeight: MIN_INPUT_H,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.sm : spacing.xs,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  recordBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 42,
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  slideHint: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },
  lockHint: {
    position: "absolute",
    right: 20,
    bottom: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  lockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: "auto",
  },
  attachRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  attachThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  attachRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
