import AudioPlayer from "@/src/components/audioPlayer";
import CustomSlider from "@/src/components/customSlider";
import DonationModal from "@/src/components/DonationModal";
import DonationReminderModal from "@/src/components/DonationReminderModal";
import ErrorModal from "@/src/components/ErrorModal";
import SaveButton from "@/src/components/SaveButton";
import ShareBtn from "@/src/components/shareBtn";
import SilenceTrimSettingsBlock from "@/src/components/silenceTrimSettings";
import * as theme from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { trackAppEvent } from "@/src/scripts/analytics";
import { PCMtoWav, resample, writePCMChunk } from "@/src/scripts/formatHandler";
import { DEFAULT_MODEL_ID, type ModelId, MODELS } from "@/src/scripts/models/registry";
import { getEngine, type StreamStep } from "@/src/scripts/models/runtime";
import ModelSelector from "@/src/components/ModelSelector";
import { DEFAULT_STRENGTH, STRENGTH_STEPS } from "@/src/scripts/models/strength";
import {
  getSettings,
  incrementDenoiseCount,
  markDonationPromptShown,
  shouldShowDonationReminder,
  updateSettings,
} from "@/src/scripts/settings";
import type { SilenceTrimSettings } from "@/src/scripts/silenceTrim";
import { DEFAULT_SILENCE_TRIM } from "@/src/scripts/silenceTrim";
import Feather from "@expo/vector-icons/Feather";
import {
  type AudioDevice,
  AudioDataEvent,
  RecordingConfig,
  useAudioDevices,
  useAudioRecorder,
} from "@siteed/audio-studio";
import * as fs from "expo-file-system";
import { useRouter } from "expo-router";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStyles } from "@/src/hooks/useStyles";

const SAMPLE_RATE = 48000;
/** Safety valve: max queued 100ms chunks (~9s) before falling back to raw PCM. */
const MAX_QUEUED_CHUNKS = 90;
/** Once in passthrough mode, stay there until the backlog drops below this. */
const PASSTHROUGH_RESUME_AT = 30;
/** Tiny sample-count mismatch still tolerated between the two staged PCM files. */
const MAX_PCM_SAMPLE_DELTA = 16;

type DeviceGroupKey = "builtin" | "wired" | "bluetooth" | "usb" | "other";
type FeatherIconName = ComponentProps<typeof Feather>["name"];

const DEVICE_GROUPS: { key: DeviceGroupKey; label: string; icon: FeatherIconName }[] = [
  { key: "builtin", label: "Built-in", icon: "mic" },
  { key: "wired", label: "Wired/Headset", icon: "headphones" },
  { key: "bluetooth", label: "Bluetooth", icon: "bluetooth" },
  { key: "usb", label: "USB", icon: "hard-drive" },
  { key: "other", label: "Other", icon: "more-horizontal" },
];

/** Classify a native Android source label; anything unrecognised is "Other". */
function deviceGroupKey(type: string | undefined): DeviceGroupKey {
  const value = (type ?? "").toLowerCase();
  if (value.includes("bluetooth") || value.includes("a2dp")) return "bluetooth";
  if (value.includes("usb")) return "usb";
  if (
    value.includes("headset") ||
    value.includes("headphone") ||
    value.includes("wired") ||
    value.includes("aux") ||
    value.includes("3.5mm")
  ) {
    return "wired";
  }
  if (
    value.includes("builtin") ||
    value.includes("built-in") ||
    value.includes("internal") ||
    value.includes("microphone") ||
    value === "mic"
  ) {
    return "builtin";
  }
  return "other";
}

/**
 * Android 13+ requires POST_NOTIFICATIONS before a foreground-service
 * notification can be shown. A denial must not block recording — the app just
 * loses the background indicator.
 */
async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== "android" || Number(Platform.Version) < 33) return;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: "Recording notification",
        message:
          "Allow DeepDenoiser to show a notification while recording so it can keep running in the background.",
        buttonNeutral: "Ask me later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      },
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      console.warn("Notification permission not granted; background recording may be hidden.");
    }
  } catch (err) {
    console.warn("Failed to request notification permission:", err);
  }
}

/** Minimal engine surface this screen needs: the DenoiseEngine contract. */
type RecordingEngine = Awaited<ReturnType<typeof getEngine>>;

/**
 * Clear a denoiser's per-run stream state.
 *
 * GTCRN keeps STFT/cache state and DeepFilterNet keeps recurrent state across
 * `denoiseStream` calls, so both must be cleared when the stream is interrupted
 * by raw-passthrough chunks.
 */
function resetStreamIfSupported(engine: RecordingEngine | null): void {
  // `resetStream` is optional on the DenoiseEngine contract; probe for it.
  const maybe = engine as
    | (RecordingEngine & { resetStream?: () => void })
    | null;
  maybe?.resetStream?.();
}

/**
 * Drop the leading algorithmic delay of the model from the written output.
 *
 * `remainingPadding` counts real samples (audio the denoiser was fed), so each
 * call subtracts what it skipped. A chunked model returns output only for
 * whole chunks and drops the unsettled overlap tail (`feedLength - consumed`),
 * which shifts every later output sample; that shift is skipped first so only
 * genuine output counts against the padding.
 */
function trimAlignmentPadding(
  step: StreamStep,
  feedLength: number,
  consumed: number,
  remainingPadding: number,
): { remainingPadding: number; pcm: Float32Array<ArrayBufferLike> } {
  let output: Float32Array<ArrayBufferLike> = step.pcm;
  const shift = feedLength - consumed;
  if (shift > 0) output = output.subarray(Math.min(shift, output.length));

  const paddingToSkip = Math.min(remainingPadding, output.length);
  return {
    remainingPadding: remainingPadding - paddingToSkip,
    pcm: output.subarray(paddingToSkip),
  };
}

export default function RecordingScreen() {
  const router = useRouter();
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    isPaused,
    durationMs,
  } = useAudioRecorder();
  const {
    devices: audioDevices,
    currentDevice,
    loading: devicesLoading,
    selectDevice,
    resetToDefaultDevice,
    refreshDevices,
  } = useAudioDevices();
  const { isDark } = useTheme();
  const styles = useStyles(makeStyles);

  const [denoiserReady, setDenoiserReady] = useState(false);

  // We use refs for files to ensure the callback has immediate access to them
  // without waiting for a re-render or being trapped in a stale closure.
  const originalPcmFileRef = useRef<fs.File | null>(null);
  const denoisedPcmFileRef = useRef<fs.File | null>(null);

  const [finalOriginalWav, setFinalOriginalWav] = useState<fs.File | null>(
    null,
  );
  const [finalDenoisedWav, setFinalDenoisedWav] = useState<fs.File | null>(
    null,
  );
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [isDonationReminderVisible, setIsDonationReminderVisible] =
    useState(false);
  const [isDonationModalVisible, setIsDonationModalVisible] = useState(false);
  const [strength, setStrength] = useState(DEFAULT_STRENGTH);
  const [silenceTrim, setSilenceTrim] =
    useState<SilenceTrimSettings>(DEFAULT_SILENCE_TRIM);
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [micPickerVisible, setMicPickerVisible] = useState(false);
  /**
   * Authoritative source for the picker UI. The library's getCurrentDevice()
   * reflects Android's routing, which does not always change when a source is
   * selected, so it cannot be used to decide which row shows as selected.
   */
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);

  /** Remembered source across screens; null (or unset) means system default. */
  const preferredMicIdRef = useRef<string | null>(null);
  /** Restore the saved source once, after the device list has loaded. */
  const preferenceAppliedRef = useRef(false);
  /** Device id we already notified about, so a single loss alerts only once. */
  const fallbackNotifiedRef = useRef<string | null>(null);

  const availableDevices = useMemo(
    () =>
      audioDevices
        .filter((device) => device.isAvailable)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [audioDevices],
  );
  const groupedDevices = useMemo(
    () =>
      DEVICE_GROUPS.map((group) => ({
        ...group,
        devices: availableDevices.filter(
          (device: AudioDevice) => deviceGroupKey(device.type) === group.key,
        ),
      })).filter((group) => group.devices.length > 0),
    [availableDevices],
  );

  const engineRef = useRef<RecordingEngine | null>(null);
  const audioBufferRef = useRef<Float32Array>(new Float32Array(0));
  /** Denoised samples produced but not yet written (chunked models lag input). */
  const outputQueueRef = useRef<Float32Array>(new Float32Array(0));
  /** Running sample counts for the original and denoised staged PCM files. */
  const inputSamplesWrittenRef = useRef(0);
  const denSamplesWrittenRef = useRef(0);
  const outputPaddingRemainingRef = useRef(0);
  const processingQueueRef = useRef<Promise<void>>(Promise.resolve());
  const processingErrorRef = useRef<Error | null>(null);
  const queueDepthRef = useRef(0);
  const isStoppingRef = useRef(false);
  const isRecordingRef = useRef(isRecording);
  const [pausedDuration, setPausedDuration] = useState(0);
  const isPausedRef = useRef(isPaused);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const [pulseAnim] = useState(() => new Animated.Value(1));
  /** True while chunks are being written raw because the queue is backed up. */
  const passthroughModeRef = useRef(false);
  /** True when the previous chunk was written raw (used to reset model state). */
  const wasPassthroughRef = useRef(false);

  // Waits for every task currently chained on the processing queue. Re-checks
  // until the chain is stable so a stream event racing the stop cannot append
  // late work after the drain completed.
  const drainQueue = async () => {
    let chain = processingQueueRef.current;
    while (true) {
      await chain;
      if (processingQueueRef.current === chain) break;
      chain = processingQueueRef.current;
    }
    if (processingErrorRef.current) {
      throw processingErrorRef.current;
    }
  };

  /**
   * Write denoised samples in lockstep with the original capture. Chunked
   * models with a one-hop start-up delay (GTCRN) emit slightly fewer samples
   * than they consume, so produced samples are queued and only written as the
   * original file grows. Any residual lag is padded at finalization.
   */
  const flushDenoisedOutput = async (file: fs.File, inputSamplesWritten: number) => {
    const queued = outputQueueRef.current;
    const owed = inputSamplesWritten - denSamplesWrittenRef.current;
    if (queued.length === 0 || owed <= 0) return;
    const count = Math.min(queued.length, owed);
    await writePCMChunk(file, queued.subarray(0, count), true);
    denSamplesWrittenRef.current += count;
    outputQueueRef.current = queued.subarray(count).slice();
  };

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Restore the remembered source once the device list is loaded. With no
  // stored preference we deliberately leave the system's current source alone.
  useEffect(() => {
    if (preferenceAppliedRef.current || devicesLoading) return;
    // An empty list can mean enumeration failed (e.g. an emulator with no mic).
    // Never treat that as proof the remembered device was disconnected.
    if (availableDevices.length === 0) return;
    preferenceAppliedRef.current = true;
    void (async () => {
      try {
        const settings = await getSettings();
        const preferred = settings.preferredMicDeviceId ?? null;
        preferredMicIdRef.current = preferred;
        if (!preferred) return;
        if (availableDevices.some((device) => device.id === preferred)) {
          const ok = await selectDevice(preferred);
          if (ok) setSelectedMicId(preferred);
          if (!ok) {
            console.warn("Could not restore preferred microphone:", preferred);
          }
          return;
        }
        // Remembered device is gone: fall back to default and forget it.
        fallbackNotifiedRef.current = preferred;
        const ok = await resetToDefaultDevice();
        preferredMicIdRef.current = null;
        setSelectedMicId(null);
        await updateSettings({ preferredMicDeviceId: null });
        if (!ok) {
          console.warn("Could not reset to the default microphone");
        }
        Alert.alert(
          "Microphone",
          "Your saved microphone is no longer available. Switched to the system default.",
        );
      } catch (err) {
        console.warn("Failed to restore microphone preference:", err);
      }
    })();
  }, [availableDevices, devicesLoading, resetToDefaultDevice, selectDevice]);

  // The library hook refreshes the device list when a source disappears. If the
  // active/remembered non-default source vanishes mid-recording, fall back once
  // and clear the preference so it is not restored on the next visit.
  useEffect(() => {
    if (!isRecording || devicesLoading) return;
    // Only an explicit user choice is ours to restore. Android handles its own
    // routing changes (headset plugged in, BT SCO active, etc.) without help.
    const trackedId = preferredMicIdRef.current;
    if (!trackedId || fallbackNotifiedRef.current === trackedId) return;
    if (availableDevices.some((device) => device.id === trackedId)) return;
    fallbackNotifiedRef.current = trackedId;
    void (async () => {
      try {
        await resetToDefaultDevice();
        preferredMicIdRef.current = null;
        setSelectedMicId(null);
        await updateSettings({ preferredMicDeviceId: null });
        Alert.alert(
          "Microphone",
          "The selected microphone was disconnected. Switched to the system default.",
        );
      } catch (err) {
        console.warn("Failed to fall back to the default microphone:", err);
      }
    })();
  }, [availableDevices, devicesLoading, isRecording, resetToDefaultDevice]);

  useEffect(() => {
    if (isPaused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync pause timestamp for display
      setPausedDuration(durationMs);
    }
  }, [isPaused, durationMs]);

  // Reload the engine whenever the user picks a different model, so the next
  // recording uses it without needing a screen remount.
  useEffect(() => {
    if (isRecording || isFinalizing) return;
    let cancelled = false;
    void (async () => {
      try {
        const engine = await getEngine(selectedModelId);
        if (cancelled) return;
        engineRef.current = engine;
        setDenoiserReady(true);
      } catch (err) {
        if (cancelled) return;
        setDenoiserReady(false);
        console.error("Failed to load selected model:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- engine reload only follows the selection
  }, [selectedModelId]);

  useEffect(() => {
    const initEngine = async () => {
      try {
        const settings = await getSettings();
        const stored = settings.selectedModel;
        // Fall back to the bundled model only when the stored id is unknown.
        // Non-48 kHz models are supported: the stream is resampled around the
        // engine and back to the recorder rate before it is written.
        const modelId: ModelId =
          stored in MODELS ? (stored as ModelId) : DEFAULT_MODEL_ID;
        setSelectedModelId(modelId);
        const engine = await getEngine(modelId);
        engineRef.current = engine;
        setDenoiserReady(true);
      } catch (err) {
        console.error("Failed to init denoiser:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsErrorModalVisible(true);
      }
    };
    initEngine();

    return () => {
      // Stop any in-flight recording when leaving the screen. Nothing is
      // released here: the engine is cached process-wide so the next screen
      // reuses the loaded session, and each new recording resets the stream
      // state itself. isStoppingRef must be set so late stream events are
      // dropped instead of appending to the processing queue after the screen
      // is gone.
      isStoppingRef.current = true;
      if (isRecordingRef.current) {
        stopAudioRecording()
          .then(drainQueue)
          .catch((err) =>
            console.error("Failed to stop recording on unmount:", err),
          );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: stop on unmount
  }, []);

  useEffect(() => {
    animRef.current?.stop();
    if (isRecording && !isPaused) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animRef.current = anim;
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => animRef.current?.stop();
  }, [isRecording, isPaused, pulseAnim]);

  const handleAudioStream = async (event: AudioDataEvent) => {
    if (isPausedRef.current || !engineRef.current || isStoppingRef.current)
      return;

    // Copy buffer immediately — the source may reuse the underlying ArrayBuffer
    const eventData = event.data as Float32Array;
    if (!eventData || eventData.length === 0) return;
    const float32Data = new Float32Array(eventData);

    // If the denoise queue is hopelessly behind (slow device), write the raw
    // PCM for this chunk instead of dropping audio — the denoised file stays
    // time-aligned with the original and memory stays bounded. Hysteresis
    // (stay in passthrough until the backlog is nearly empty) prevents
    // oscillating between raw and denoised every chunk.
    const passthrough = passthroughModeRef.current
      ? queueDepthRef.current >= PASSTHROUGH_RESUME_AT
      : queueDepthRef.current >= MAX_QUEUED_CHUNKS;
    if (passthrough) {
      passthroughModeRef.current = true;
      console.warn(
        "Recording denoise queue backlogged — writing raw PCM chunk instead.",
      );
    } else {
      passthroughModeRef.current = false;
    }
    queueDepthRef.current++;

    processingQueueRef.current = processingQueueRef.current
      .then(async () => {
        try {
          const engine = engineRef.current;
          if (!engine) return;

          // 1. Save original PCM
          const origFile = originalPcmFileRef.current;
          if (origFile) {
            await writePCMChunk(origFile, float32Data, true);
            inputSamplesWrittenRef.current += float32Data.length;
          }

          // 2. Denoise (or passthrough) and save
          const denFile = denoisedPcmFileRef.current;
          if (denFile) {
            // Combine with previous leftovers. The engine consumes whole model
            // chunks of its own size and hands the unconsumed tail back as
            // `rest`, so no frame arithmetic is needed here.
            const combined = new Float32Array(
              audioBufferRef.current.length + float32Data.length,
            );
            combined.set(audioBufferRef.current);
            combined.set(float32Data, audioBufferRef.current.length);

            if (combined.length > 0) {
              let output: Float32Array<ArrayBufferLike>;
              let rest: Float32Array<ArrayBufferLike>;

              if (passthrough) {
                // Write only the new samples, exactly like the original file
                // above, so the two files stay sample-for-sample aligned.
                // Keep the buffered leftovers (including the alignment prefix)
                // for the next real denoise step, and leave the padding counter
                // untouched: no output was produced, so none was consumed.
                output = float32Data;
                rest = audioBufferRef.current;
              } else {
                // If the previous chunk was written raw, the model's recurrent
                // state corresponds to audio seconds behind the current chunk.
                // Reset it so denoising resumes from a clean state instead of
                // a stale one.
                if (wasPassthroughRef.current) {
                  resetStreamIfSupported(engine);
                }
                const streamInput = audioBufferRef.current;
                const engineRate = engine.sampleRate;
                // The recorder always captures at 48 kHz. Models at other rates
                // (e.g. GTCRN 16K) are fed resampled audio and their
                // output is resampled straight back, so both staged PCM files
                // stay in the source domain and sample-for-sample aligned.
                const modelInput =
                  engineRate === SAMPLE_RATE
                    ? combined
                    : resample(combined, SAMPLE_RATE, engineRate);
                const step = await engine.denoiseStream(modelInput, {
                  strength,
                });
                const consumedModel = modelInput.length - step.rest.length;
                const consumed =
                  engineRate === SAMPLE_RATE
                    ? consumedModel
                    : Math.round((consumedModel * SAMPLE_RATE) / engineRate);
                rest = combined.subarray(Math.min(consumed, combined.length));
                const outputAtModelRate = step.pcm;
                const trimmed = trimAlignmentPadding(
                  { pcm: outputAtModelRate, rest: step.rest },
                  engineRate === SAMPLE_RATE
                    ? streamInput.length
                    : Math.round((streamInput.length * engineRate) / SAMPLE_RATE),
                  consumedModel,
                  outputPaddingRemainingRef.current,
                );
                outputPaddingRemainingRef.current = trimmed.remainingPadding;
                output =
                  engineRate === SAMPLE_RATE
                    ? trimmed.pcm
                    : resample(trimmed.pcm, engineRate, SAMPLE_RATE);
              }
              wasPassthroughRef.current = passthrough;
              // Queue produced samples, then write only as many as the
              // original file has grown. This absorbs the small startup lag of
              // overlapping chunk models without drifting the two files.
              if (output.length > 0) {
                const queued = outputQueueRef.current;
                const merged = new Float32Array(queued.length + output.length);
                merged.set(queued);
                merged.set(output, queued.length);
                outputQueueRef.current = merged;
              }
              await flushDenoisedOutput(denFile, inputSamplesWrittenRef.current);

              // Store leftovers for next chunk
              audioBufferRef.current = new Float32Array(rest);
            }
          }
        } catch (err) {
          console.error("Error in audio stream processing:", err);
          processingErrorRef.current ??=
            err instanceof Error ? err : new Error(String(err));
        }
      })
      .catch((err) => {
        // Unreachable in practice (the task body catches everything), but if it
        // ever fires, do NOT reset the chain — resetting would let newly
        // enqueued tasks run concurrently with in-flight ones and interleave
        // writes to the same PCM files.
        console.error("Error in recording processing queue:", err);
        processingErrorRef.current ??=
          err instanceof Error ? err : new Error(String(err));
      })
      .finally(() => {
        queueDepthRef.current = Math.max(0, queueDepthRef.current - 1);
      });
  };

  const chooseAudioDevice = async (id: string | null) => {
    try {
      const ok = id
        ? await selectDevice(id)
        : await resetToDefaultDevice();
      if (!ok) {
        console.warn("Failed to select the audio input device");
        Alert.alert("Microphone", "Could not switch to that input device.");
        return;
      }
      preferredMicIdRef.current = id;
      setSelectedMicId(id);
      fallbackNotifiedRef.current = null;
      await updateSettings({ preferredMicDeviceId: id });
      setMicPickerVisible(false);
    } catch (err) {
      console.warn("Failed to switch microphone:", err);
      Alert.alert("Microphone", "Could not switch to that input device.");
    }
  };

  const startRecording = async () => {
    try {
      if (!denoiserReady) {
        Alert.alert("Wait", "Denoiser is still initializing...");
        return;
      }
      trackAppEvent("start_recording");
      isStoppingRef.current = true;
      processingErrorRef.current = null;
      // Drain prior work before installing the new files, so a late task from
      // an earlier recording can never write into this session's PCM output.
      await drainQueue();

      // Initialize files
      const timestamp = Date.now();
      const origPcm = new fs.File(fs.Paths.cache, `orig_${timestamp}.pcm`);
      const denPcm = new fs.File(fs.Paths.cache, `den_${timestamp}.pcm`);

      await origPcm.create();
      await denPcm.create();

      originalPcmFileRef.current = origPcm;
      denoisedPcmFileRef.current = denPcm;

      setFinalOriginalWav(null);
      setFinalDenoisedWav(null);
      processingQueueRef.current = Promise.resolve();
      passthroughModeRef.current = false;
      wasPassthroughRef.current = false;
      inputSamplesWrittenRef.current = 0;
      denSamplesWrittenRef.current = 0;
      outputQueueRef.current = new Float32Array(0);

      // Reset denoiser states for new recording
      const engine = engineRef.current;
      resetStreamIfSupported(engine);
      // Prefix the stream with the model's algorithmic delay so the delayed
      // output lines up with the original file after the head is trimmed.
      // The staged PCM files and audioBufferRef are at the recorder rate (48k),
      // while alignmentDelaySamples is in the model's own rate — convert for
      // the input prefix but keep the output trim counter in model samples.
      const engineForDelay = engineRef.current;
      const alignmentDelayModel = engineForDelay?.alignmentDelaySamples ?? 0;
      // Some models create their delay in the output buffer instead of needing
      // silence fed in; only prepend what the engine actually requires.
      const prefixModel = engineForDelay?.alignmentPrefixSamples ?? alignmentDelayModel;
      const alignmentPadding = Math.round(
        (prefixModel * SAMPLE_RATE) / (engineForDelay?.sampleRate ?? SAMPLE_RATE),
      );
      audioBufferRef.current = new Float32Array(alignmentPadding);
      outputPaddingRemainingRef.current = alignmentDelayModel;

      const config: RecordingConfig = {
        sampleRate: SAMPLE_RATE,
        channels: 1,
        encoding: "pcm_16bit",
        interval: 100, // Emit data every 100ms
        streamFormat: "float32",
        onAudioStream: handleAudioStream,
        keepAwake: true,
        showNotification: true,
        notification: {
          title: "DeepDenoiser recording",
          text: "Recording and denoising audio in the background",
          android: {
            channelId: "deepdenoiser-recording",
            channelName: "Recording",
            channelDescription: "Active voice recording and denoising",
            notificationId: 1001,
            showPauseResumeActions: true,
          },
        },
      };

      // Android 13+ needs POST_NOTIFICATIONS for the foreground-service
      // notification. A denial only hides the indicator; recording continues.
      await requestNotificationPermission();

      isStoppingRef.current = false;
      await startAudioRecording(config);
    } catch (error) {
      isStoppingRef.current = false;
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Error starting recording:", err);
      setError(err);
      setIsErrorModalVisible(true);
    }
  };

  const stopRecording = async () => {
    try {
      setIsFinalizing(true);
      // Keep accepting stream events until the native recorder is fully
      // stopped: chunks emitted between the tap and the native stop are already
      // in the native WAV, so they must reach the denoised PCM too. Only then
      // flip the ignore flag so no late event can enqueue a duplicate write.
      const result = await stopAudioRecording();
      isStoppingRef.current = true;

      // Wait for all background processing to finish. drainQueue re-checks
      // until the chain is stable — a stream event racing the stop can append
      // a chunk after we captured the promise, which would otherwise write
      // out of order.
      await drainQueue();

      const origPcm = originalPcmFileRef.current;
      const denPcm = denoisedPcmFileRef.current;

      if (origPcm && denPcm) {
        // Handle any remaining samples in the buffer. The engine returns
        // exactly as many samples as it was given, so no chunk padding leaks
        // into the tail of the file.
        // Flush unconditionally: with a one-hop-delayed model the last hop's
        // output is still owed even when no raw samples remain in the buffer.
        if (engineRef.current) {
          const pending = audioBufferRef.current;
          const engineRate = engineRef.current.sampleRate;
          const modelPending =
            engineRate === SAMPLE_RATE
              ? pending
              : resample(pending, SAMPLE_RATE, engineRate);
          const step = await engineRef.current.denoiseFinal(modelPending);
          const { pcm } = trimAlignmentPadding(
            step,
            modelPending.length,
            modelPending.length,
            outputPaddingRemainingRef.current,
          );
          outputPaddingRemainingRef.current = 0;
          const finalPcm =
            engineRate === SAMPLE_RATE
              ? pcm
              : resample(pcm, engineRate, SAMPLE_RATE);
          const queued = outputQueueRef.current;
          const merged = new Float32Array(queued.length + finalPcm.length);
          merged.set(queued);
          merged.set(finalPcm, queued.length);
          outputQueueRef.current = merged;
          audioBufferRef.current = new Float32Array(0);
        }
        // Flush everything the chunked model produced, then pad any residual
        // startup lag so the denoised file matches the original length exactly.
        await flushDenoisedOutput(denPcm, inputSamplesWrittenRef.current);
        const pendingOutput = outputQueueRef.current;
        if (pendingOutput.length > 0) {
          await writePCMChunk(denPcm, pendingOutput, true);
          denSamplesWrittenRef.current += pendingOutput.length;
          outputQueueRef.current = new Float32Array(0);
        }
        const shortBy = inputSamplesWrittenRef.current - denSamplesWrittenRef.current;
        if (shortBy > 0) {
          await writePCMChunk(denPcm, new Float32Array(shortBy), true);
          denSamplesWrittenRef.current += shortBy;
        }

        // Ensure the staged PCM survived the whole recording before wrapping.
        // Report which one is gone and how big it was, because "PCM files
        // missing" alone gave users nothing to act on.
        for (const [stage, staged] of [
          ["original", origPcm],
          ["denoised", denPcm],
        ] as const) {
          if (!staged.exists) {
            throw new Error(
              `The ${stage} recording data is missing (${staged.name}). ` +
                "The device may have cleared temporary storage during the recording.",
            );
          }
          if ((staged.size ?? 0) === 0) {
            throw new Error(
              `The ${stage} recording data is empty. Nothing was captured — ` +
                "check the microphone permission and try again.",
            );
          }
        }

        // Both staged files are 16-bit mono PCM (2 bytes per sample — see
        // writePCMChunk), so their byte counts are directly comparable. A
        // divergence means some chunks reached only one file; wrapping those
        // as WAVs would silently produce drifting original/denoised audio.
        const origBytes = origPcm.size ?? 0;
        const denBytes = denPcm.size ?? 0;
        const sampleDelta = Math.abs(origBytes - denBytes) / 2;
        if (sampleDelta > MAX_PCM_SAMPLE_DELTA) {
          throw new Error(
            `Original and denoised audio lengths diverged by ${sampleDelta.toFixed(0)} samples ` +
              `(original: ${origBytes} bytes, denoised: ${denBytes} bytes). ` +
              "Refusing to export misaligned audio.",
          );
        }

        const origWav =
          result && result.fileUri
            ? new fs.File(result.fileUri)
            : (await PCMtoWav(origPcm, SAMPLE_RATE)).file;
        // Trim is applied HERE, at finalization — only after the entire
        // recording has been denoised and the queue fully drained. It never
        // runs during recording, and only when the user explicitly enabled it
        // (the toggle-off case must be honored, so disabled => no trim map).
        const denWavResult = await PCMtoWav(
          denPcm,
          SAMPLE_RATE,
          silenceTrim.enabled ? silenceTrim : undefined,
        );
        const denWav = denWavResult.file;

        setFinalOriginalWav(origWav);
        setFinalDenoisedWav(denWav);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Error stopping recording:", err);
      setError(err);
      setIsErrorModalVisible(true);
    } finally {
      setIsFinalizing(false);
      isStoppingRef.current = false;
      originalPcmFileRef.current = null;
      denoisedPcmFileRef.current = null;
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  useEffect(() => {
    if (!finalDenoisedWav) return;
    (async () => {
      await incrementDenoiseCount();
      const shouldShow = await shouldShowDonationReminder();
      if (shouldShow) {
        await markDonationPromptShown();
        setIsDonationReminderVisible(true);
      }
    })();
  }, [finalDenoisedWav]);

  // Prefer the user's explicit choice; fall back to the native device only
  // when no choice has been made in this app.
  const effectiveMicId =
    selectedMicId ??
    (currentDevice && currentDevice.isDefault === false ? currentDevice.id : null);
  const defaultMicSelected = effectiveMicId === null;
  const selectedMicName =
    availableDevices.find((device) => device.id === effectiveMicId)?.name ??
    currentDevice?.name;

  const micSourceControl = (
    <>
      <TouchableOpacity
        style={styles.micSourceButton}
        onPress={() => {
          void refreshDevices();
          setMicPickerVisible(true);
        }}
        disabled={isFinalizing}
      >
        <Feather name="mic" size={18} color={theme.COLORS.primary} />
        <View style={styles.micSourceText}>
          <Text style={styles.micSourceLabel}>Microphone source</Text>
          <Text style={styles.micSourceValue} numberOfLines={1}>
            {defaultMicSelected ? "System default" : selectedMicName ?? "Selected microphone"}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={theme.COLORS.subtext} />
      </TouchableOpacity>
      {(isRecording || isPaused) && (
        <Text style={styles.micSwitchHint}>
          You can switch microphones while recording.
        </Text>
      )}
    </>
  );

  // Recording controls live directly under the timer so starting/stopping is
  // always one tap without scrolling past the model and settings controls.
  const recordControls = isFinalizing || finalOriginalWav ? null : (
    !isRecording && !isPaused ? (
      <Pressable
        style={({ pressed }) => [
          styles.recordButton,
          { opacity: pressed ? 0.9 : 1 },
        ]}
        onPress={startRecording}
        android_ripple={{
          color: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
          borderless: true,
          radius: 70,
        }}
      >
        <View style={styles.recordButtonInner}>
          <Feather name="mic" size={40} color={theme.COLORS.white} />
        </View>
        <Text style={styles.buttonLabel}>Tap to Start</Text>
      </Pressable>
    ) : (
      <View style={styles.activeControls}>
        <Pressable
          style={({ pressed }) => [
            styles.controlCircle,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : theme.COLORS.surfaceContainer,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={isPaused ? resumeRecording : pauseRecording}
          android_ripple={{
            color: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)",
            borderless: true,
            radius: 32,
          }}
        >
          <Feather
            name={isPaused ? "play" : "pause"}
            size={28}
            color={theme.COLORS.text}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.stopButton,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : theme.COLORS.surfaceContainer,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={stopRecording}
          android_ripple={{
            color: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)",
            borderless: true,
            radius: 50,
          }}
        >
          <View style={styles.stopButtonInner}>
            <Feather
              name="square"
              size={32}
              color={theme.COLORS.white}
            />
          </View>
        </Pressable>
      </View>
    )
  );

  return (
    <SafeAreaView style={theme.Styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          disabled={isRecording}
          android_ripple={{
            color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
            borderless: true,
            radius: 24,
          }}
        >
          <Feather name="arrow-left" size={24} color={theme.COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Voice Recorder</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!finalOriginalWav && !isFinalizing && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              {formatTime(isPaused ? pausedDuration : (durationMs ?? 0))}
            </Text>
            {isRecording && !isPaused && (
              <View style={styles.recordingIndicator}>
                <Animated.View
                  style={[
                    styles.pulseCircle,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <View style={styles.recordingDot} />
              </View>
            )}
          </View>
        )}

        <View style={styles.topControls}>{recordControls}</View>

        {isFinalizing ? (
          <View style={styles.finalizingContainer}>
            <ActivityIndicator size="large" color={theme.COLORS.primary} />
            <Text style={styles.statusText}>Finalizing Audio...</Text>
          </View>
        ) : !finalOriginalWav ? (
          <View style={styles.controlsContainer}>
            <Text style={styles.statusText}>
              {!isRecording && !isPaused
                ? "Ready to record"
                : isPaused
                  ? "Recording paused"
                  : "Denoising in Real-time"}
            </Text>

            {!isRecording && !isPaused ? (
              <View style={styles.sliderContainer}>
                <ModelSelector
                  value={selectedModelId}
                  onChange={setSelectedModelId}
                  disabled={isRecording || isFinalizing}
                />

                {micSourceControl}

                <View style={styles.settingsDivider} />

                <CustomSlider
                  label="Denoising strength"
                  value={strength}
                  onValueChange={setStrength}
                  min={0}
                  max={100}
                  steps={STRENGTH_STEPS}
                  info={`How strongly the selected model removes noise.\n100% = full model effect.\n0% = original audio, unprocessed.\nLower it if speech sounds thin or artefacts appear.`}
                />

                <View style={styles.settingsDivider} />

                <SilenceTrimSettingsBlock
                  settings={silenceTrim}
                  onChange={setSilenceTrim}
                />
              </View>
            ) : null}

            {(isRecording || isPaused) && (
              <View style={styles.micSourceRecording}>{micSourceControl}</View>
            )}

          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Feather
                  name="volume-2"
                  size={20}
                  color={theme.COLORS.subtext}
                />
                <Text style={styles.resultTitle}>Original Audio</Text>
              </View>
              <AudioPlayer
                uri={finalOriginalWav.uri}
                name="Original recording"
              />
              <View style={styles.resultActions}>
                <SaveButton
                  file={finalOriginalWav}
                  label="Save Original"
                  savedLabel="Saved"
                  albumName="DeepDenoiser/Recordings"
                  saveCategory={{ kind: "Original", media: "Audio" }}
                  style={[theme.Styles.button, styles.saveSubButton]}
                  onError={(err) => {
                    setError(err);
                    setIsErrorModalVisible(true);
                  }}
                />
                <ShareBtn uri={finalOriginalWav.uri} />
              </View>
            </View>

            <View
              style={[
                styles.resultCard,
                {
                  borderColor: theme.COLORS.success,
                  borderWidth: 1,
                  marginTop: 24,
                },
              ]}
            >
              <View style={styles.resultHeader}>
                <View style={styles.zapIcon}>
                  <Feather
                    name="zap"
                    size={16}
                    color={theme.COLORS.background}
                  />
                </View>
                <Text
                  style={[styles.resultTitle, { color: theme.COLORS.success }]}
                >
                  Denoised Audio
                </Text>
              </View>
              <AudioPlayer
                uri={finalDenoisedWav!.uri}
                name="Denoised recording"
              />
              <View style={styles.resultActions}>
                <SaveButton
                  file={finalDenoisedWav}
                  label="Save Denoised"
                  savedLabel="Saved"
                  albumName="DeepDenoiser/Recordings"
                  saveCategory={{ kind: "Denoised", media: "Audio" }}
                  style={[
                    theme.Styles.button,
                    styles.saveSubButton,
                    { backgroundColor: theme.COLORS.success },
                  ]}
                  savedBg={theme.COLORS.success}
                  onError={(err) => {
                    setError(err);
                    setIsErrorModalVisible(true);
                  }}
                />
                <ShareBtn uri={finalDenoisedWav!.uri} />
              </View>
            </View>

            <TouchableOpacity
              style={[theme.Styles.button, styles.newRecordButton]}
              onPress={() => {
                setFinalOriginalWav(null);
                setFinalDenoisedWav(null);
              }}
            >
              <Feather
                name="refresh-cw"
                size={18}
                color={theme.COLORS.primary}
              />
              <Text
                style={[
                  theme.Styles.buttonText,
                  { color: theme.COLORS.primary },
                ]}
              >
                Record New
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <DonationReminderModal
        visible={isDonationReminderVisible}
        onClose={() => setIsDonationReminderVisible(false)}
        onOpenDonation={() => setIsDonationModalVisible(true)}
      />
      <DonationModal
        visible={isDonationModalVisible}
        onClose={() => setIsDonationModalVisible(false)}
      />
      <ErrorModal
        visible={isErrorModalVisible}
        error={error}
        onClose={() => setIsErrorModalVisible(false)}
      />
      <Modal
        visible={micPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMicPickerVisible(false)}
      >
        <Pressable
          style={styles.micModalOverlay}
          onPress={() => setMicPickerVisible(false)}
        >
          <Pressable style={styles.micModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.micModalHeader}>
              <Text style={styles.micModalTitle}>Microphone source</Text>
              <TouchableOpacity
                style={styles.micModalRefresh}
                onPress={() => {
                  void refreshDevices();
                }}
                disabled={devicesLoading}
              >
                {devicesLoading ? (
                  <ActivityIndicator size="small" color={theme.COLORS.primary} />
                ) : (
                  <Feather
                    name="refresh-cw"
                    size={16}
                    color={theme.COLORS.primary}
                  />
                )}
                <Text style={styles.micModalRefreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.micModalList}>
              <TouchableOpacity
                style={styles.micModalRow}
                onPress={() => void chooseAudioDevice(null)}
              >
                <Feather
                  name={defaultMicSelected ? "check" : "circle"}
                  size={18}
                  color={theme.COLORS.primary}
                />
                <Feather name="mic" size={18} color={theme.COLORS.subtext} />
                <Text style={styles.micModalRowText}>System default</Text>
                {defaultMicSelected && (
                  <View style={styles.connectedBadge}>
                    <Text style={styles.connectedBadgeText}>Connected</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.micModalRowDivider} />

              {groupedDevices.length === 0 ? (
                <View style={styles.micModalEmpty}>
                  <Feather name="mic-off" size={28} color={theme.COLORS.subtext} />
                  <Text style={styles.micModalEmptyTitle}>No microphones found</Text>
                  <Text style={styles.micModalEmptyHint}>
                    Connect a microphone or tap Refresh to look again.
                  </Text>
                </View>
              ) : (
                groupedDevices.map((group) => (
                  <View key={group.key} style={styles.micModalGroup}>
                    <View style={styles.micModalGroupHeader}>
                      <Feather
                        name={group.icon}
                        size={15}
                        color={theme.COLORS.subtext}
                      />
                      <Text style={styles.micModalGroupTitle}>{group.label}</Text>
                    </View>
                    {group.devices.map((device) => {
                      const active = effectiveMicId === device.id;
                      return (
                        <TouchableOpacity
                          key={device.id}
                          style={styles.micModalRow}
                          onPress={() => void chooseAudioDevice(device.id)}
                        >
                          <Feather
                            name={active ? "check" : "circle"}
                            size={18}
                            color={theme.COLORS.primary}
                          />
                          <Text style={styles.micModalRowText} numberOfLines={1}>
                            {device.name}
                          </Text>
                          {active && (
                            <View style={styles.connectedBadge}>
                              <Text style={styles.connectedBadgeText}>Connected</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.micModalClose}
              onPress={() => setMicPickerVisible(false)}
            >
              <Text style={styles.micModalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.SPACING.medium,
    justifyContent: "center",
    height: 60,
  },
  headerTitle: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "800",
  },
  backButton: {
    position: "absolute",
    left: theme.SPACING.medium,
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 100,
    // paddingHorizontal: theme.SPACING.medium,
  },
  topControls: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 8,
    height: 100,
  },
  timerText: {
    fontSize: 72,
    fontWeight: "200",
    color: theme.COLORS.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -2,
  },
  recordingIndicator: {
    marginLeft: 20,
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
  },
  pulseCircle: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.COLORS.error,
    opacity: 0.3,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.COLORS.error,
  },
  statusText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.body,
    marginBottom: 40,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  controlsContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  finalizingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    gap: 20,
  },
  sliderContainer: {
    width: "100%",
    paddingHorizontal: theme.SPACING.medium,
    marginBottom: 40,
  },

  settingsDivider: {
    height: 1,
    backgroundColor: theme.COLORS.outlineVariant,
    marginVertical: 15,
  },
  recordButton: {
    alignItems: "center",
  },
  recordButtonInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.COLORS.error,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.COLORS.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonLabel: {
    color: theme.COLORS.subtext,
    marginTop: 24,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
  },
  activeControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 40,
  },
  controlCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  stopButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.COLORS.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.COLORS.error,
  },
  stopButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.COLORS.error,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsContainer: {
    width: "100%",
    marginTop: 20,
  },
  resultCard: {
    backgroundColor: theme.COLORS.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "800",
    color: theme.COLORS.subtext,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  resultActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  zapIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.COLORS.success,
    alignItems: "center",
    justifyContent: "center",
  },
  saveSubButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newRecordButton: {
    marginTop: 48,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
  },
  micSourceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.COLORS.surface,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  micSourceText: {
    flex: 1,
  },
  micSourceLabel: {
    fontSize: theme.FONT_SIZE.small,
    color: theme.COLORS.subtext,
  },
  micSourceValue: {
    fontSize: theme.FONT_SIZE.body,
    color: theme.COLORS.text,
    fontWeight: "600",
  },
  micSwitchHint: {
    fontSize: theme.FONT_SIZE.xsmall,
    color: theme.COLORS.subtext,
    marginTop: 6,
  },
  micSourceRecording: {
    width: "100%",
    paddingHorizontal: theme.SPACING.medium,
    marginBottom: 24,
  },
  micModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  micModalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "75%",
    backgroundColor: theme.COLORS.surface,
    borderRadius: 20,
    padding: 20,
  },
  micModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  micModalTitle: {
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "700",
    color: theme.COLORS.text,
  },
  micModalRefresh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  micModalRefreshText: {
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "600",
    color: theme.COLORS.primary,
  },
  micModalList: {
    maxHeight: 380,
  },
  micModalGroup: {
    marginTop: 14,
  },
  micModalGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  micModalGroupTitle: {
    fontSize: theme.FONT_SIZE.xsmall,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: theme.COLORS.subtext,
  },
  connectedBadge: {
    backgroundColor: theme.COLORS.primaryContainer,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  connectedBadgeText: {
    fontSize: theme.FONT_SIZE.xsmall,
    fontWeight: "700",
    color: theme.COLORS.onPrimaryContainer,
  },
  micModalEmpty: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  micModalEmptyTitle: {
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
    color: theme.COLORS.text,
  },
  micModalEmptyHint: {
    fontSize: theme.FONT_SIZE.xsmall,
    color: theme.COLORS.subtext,
    textAlign: "center",
  },
  micModalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  micModalRowText: {
    flex: 1,
    fontSize: theme.FONT_SIZE.body,
    color: theme.COLORS.text,
  },
  micModalRowDivider: {
    height: 1,
    backgroundColor: theme.COLORS.outlineVariant,
  },
  micModalClose: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.COLORS.primary,
  },
  micModalCloseText: {
    color: theme.COLORS.background,
    fontWeight: "700",
  },
});
