import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";

export interface VoiceRecording {
  uri: string;
  durationMs: number;
}

export interface VoiceRecorder {
  isRecording: boolean;
  durationMs: number;
  /** Returns false if mic permission was denied. */
  start: () => Promise<boolean>;
  /** Stops and returns the recorded file, or null if nothing usable. */
  stop: () => Promise<VoiceRecording | null>;
  /** Stops and discards the recording. */
  cancel: () => Promise<void>;
}

/**
 * Thin wrapper over expo-audio's recorder that also tracks elapsed time and
 * owns the audio-mode toggling. Requires the `expo-audio` native module — the
 * app must be rebuilt (dev client / EAS) for recording to work at runtime.
 */
export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const start = useCallback(async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
    setDurationMs(0);
    setIsRecording(true);
    clearTimer();
    timer.current = setInterval(
      () => setDurationMs(Date.now() - startedAt.current),
      200,
    );
    return true;
  }, [recorder, clearTimer]);

  const stop = useCallback(async () => {
    clearTimer();
    if (!isRecording) return null;
    setIsRecording(false);
    const elapsed = Date.now() - startedAt.current;
    try {
      await recorder.stop();
    } catch {
      return null;
    }
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    // Ignore accidental taps that produced almost nothing.
    if (!uri || elapsed < 500) return null;
    return { uri, durationMs: elapsed };
  }, [recorder, isRecording, clearTimer]);

  const cancel = useCallback(async () => {
    clearTimer();
    if (!isRecording) return;
    setIsRecording(false);
    try {
      await recorder.stop();
    } catch {
      /* ignore */
    }
    await setAudioModeAsync({ allowsRecording: false });
  }, [recorder, isRecording, clearTimer]);

  return { isRecording, durationMs, start, stop, cancel };
}
