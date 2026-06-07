import AudioPlayer from "@/src/components/audioPlayer";
import DonationModal from "@/src/components/DonationModal";
import DonationReminderModal from "@/src/components/DonationReminderModal";
import ErrorModal from "@/src/components/ErrorModal";
import SaveButton from "@/src/components/SaveButton";
import ShareBtn from "@/src/components/shareBtn";
import CustomSlider from "@/src/components/customSlider";
import * as theme from "@/src/constants/theme";
import { trackAppError, trackAppEvent } from "@/src/scripts/analytics";
import {
  incrementDenoiseCount,
  markDonationPromptShown,
  shouldShowDonationReminder,
} from "@/src/scripts/settings";
import { DeepFilterNet } from "@/src/scripts/Denoiser";
import { PCMtoWav, writePCMChunk } from "@/src/scripts/formatHandler";
import Feather from "@expo/vector-icons/Feather";
import {
  AudioDataEvent,
  RecordingConfig,
  useAudioRecorder
} from "@siteed/audio-studio";
import { Asset } from "expo-asset";
import * as fs from "expo-file-system";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SAMPLE_RATE = 48000;
const HOP_SIZE = 512;
const ALSTEPS = [0, 5, 10, 15, 20, 30, 40];

export default function RecordingScreen() {
  const router = useRouter();
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    isPaused,
    durationMs
  } = useAudioRecorder();

  const [isProcessing, setIsProcessing] = useState(false);
  const [denoiserReady, setDenoiserReady] = useState(false);

  // We use refs for files to ensure the callback has immediate access to them
  // without waiting for a re-render or being trapped in a stale closure.
  const originalPcmFileRef = useRef<fs.File | null>(null);
  const denoisedPcmFileRef = useRef<fs.File | null>(null);

  const [finalOriginalWav, setFinalOriginalWav] = useState<fs.File | null>(null);
  const [finalDenoisedWav, setFinalDenoisedWav] = useState<fs.File | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [isDonationReminderVisible, setIsDonationReminderVisible] = useState(false);
  const [isDonationModalVisible, setIsDonationModalVisible] = useState(false);
  const [attenLimDb, setAttenLimDb] = useState(0);

  const denoiserRef = useRef<DeepFilterNet | null>(null);
  const audioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const processingQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isStoppingRef = useRef(false);
  const pausedDurationRef = useRef(0);
  const isPausedRef = useRef(isPaused);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  useEffect(() => {
    if (isPaused) {
      pausedDurationRef.current = durationMs;
    }
  }, [isPaused, durationMs]);

  useEffect(() => {
    const initDenoiser = async () => {
      try {
        const denoiser = new DeepFilterNet();
        const modelAsset = Asset.fromModule(require("@/assets/model/denoiser_model.ort"));
        await modelAsset.downloadAsync();
        await denoiser.loadModel(modelAsset.localUri!);
        denoiserRef.current = denoiser;
        setDenoiserReady(true);
      } catch (err) {
        console.error("Failed to init denoiser:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsErrorModalVisible(true);
      }
    };
    initDenoiser();

    return () => {
      (async () => {
        if (isRecording) await stopAudioRecording();
        await denoiserRef.current?.release();
      })();
    };
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
        ])
      );
      animRef.current = anim;
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => animRef.current?.stop();
  }, [isRecording, isPaused]);

  const handleAudioStream = async (event: AudioDataEvent) => {
    if (isPausedRef.current || !denoiserRef.current || isStoppingRef.current) return;

    // Copy buffer immediately — the source may reuse the underlying ArrayBuffer
    const eventData = event.data as Float32Array;
    if (!eventData || eventData.length === 0) return;
    const float32Data = new Float32Array(eventData);

    processingQueueRef.current = processingQueueRef.current.then(async () => {
      try {
        const denoiser = denoiserRef.current;
        if (!denoiser) return;

        // 1. Save original PCM
        const origFile = originalPcmFileRef.current;
        if (origFile) {
          await writePCMChunk(origFile, float32Data, true);
        }

        // 2. Denoise and save
        const denFile = denoisedPcmFileRef.current;
        if (denFile) {
          // Combine with previous leftovers
          const combined = new Float32Array(audioBufferRef.current.length + float32Data.length);
          combined.set(audioBufferRef.current);
          combined.set(float32Data, audioBufferRef.current.length);

          const numFrames = Math.floor(combined.length / HOP_SIZE);
          const processableLength = numFrames * HOP_SIZE;
          const leftovers = combined.subarray(processableLength);

          if (numFrames > 0) {
            const processData = combined.subarray(0, processableLength);
            const denoisedOutput = new Float32Array(processableLength);

            for (let i = 0; i < processableLength; i += HOP_SIZE) {
              const frame = processData.subarray(i, i + HOP_SIZE);
              const outFrame = await denoiser.processFrame(frame);
              denoisedOutput.set(outFrame, i);
            }
            await writePCMChunk(denFile, denoisedOutput, true);
          }

          // Store leftovers for next chunk
          audioBufferRef.current = new Float32Array(leftovers);
        }
      } catch (err) {
        console.error("Error in audio stream processing:", err);
      }
    }).catch((err) => {
      console.error("Fatal error in processing queue (chain poisoned):", err);
      processingQueueRef.current = Promise.resolve();
    });
  };

  const startRecording = async () => {
    try {
      if (!denoiserReady) {
        Alert.alert("Wait", "Denoiser is still initializing...");
        return;
      }
      trackAppEvent("start_recording");
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
      isStoppingRef.current = false;
      audioBufferRef.current = new Float32Array(0);
      processingQueueRef.current = Promise.resolve();

      // Reset denoiser states for new recording
      denoiserRef.current?.setupStreaming(attenLimDb);

      const config: RecordingConfig = {
        sampleRate: SAMPLE_RATE,
        channels: 1,
        encoding: 'pcm_16bit',
        interval: 100, // Emit data every 100ms
        streamFormat: 'float32',
        onAudioStream: handleAudioStream,
        keepAwake: true,
        showNotification: false,
      };

      await startAudioRecording(config);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackAppError(err, { context: "startRecording" });
      setError(err);
      setIsErrorModalVisible(true);
    }
  };

  const stopRecording = async () => {
    try {
      setIsFinalizing(true);
      isStoppingRef.current = true;
      const result = await stopAudioRecording();

      // Wait for all background processing to finish
      await processingQueueRef.current;

      const origPcm = originalPcmFileRef.current;
      const denPcm = denoisedPcmFileRef.current;

      if (origPcm && denPcm) {
        // Handle any remaining samples in the buffer
        if (audioBufferRef.current.length > 0 && denoiserRef.current) {
          const leftovers = audioBufferRef.current;
          const paddedFrame = new Float32Array(HOP_SIZE);
          paddedFrame.set(leftovers);
          const outFrame = await denoiserRef.current.processFrame(paddedFrame);
          await writePCMChunk(denPcm, outFrame.subarray(0, leftovers.length), true);
          audioBufferRef.current = new Float32Array(0);
        }

        // Ensure files exist before wrapping
        if (!origPcm.exists || !denPcm.exists) {
          throw new Error("PCM files missing after recording.");
        }

        const origWav = result && result.fileUri ? new fs.File(result.fileUri) : await PCMtoWav(origPcm, SAMPLE_RATE);
        const denWav = await PCMtoWav(denPcm, SAMPLE_RATE);

        setFinalOriginalWav(origWav);
        setFinalDenoisedWav(denWav);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackAppError(err, { context: "stopRecording" });
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

  return (
    <SafeAreaView style={theme.Styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.7 : 1 }
          ]} 
          disabled={isRecording}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.1)', borderless: true, radius: 24 }}
        >
          <Feather name="arrow-left" size={24} color={theme.COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Voice Recorder</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {!finalOriginalWav && !isFinalizing && (
          <View style={styles.timerContainer}>

            <Text style={styles.timerText}>{formatTime(isPaused ? pausedDurationRef.current : durationMs)}</Text>
            {isRecording && !isPaused && (
              <View style={styles.recordingIndicator}>
                <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.recordingDot} />
              </View>
            )}
          </View>
        )}

        {isFinalizing ? (
          <View style={styles.finalizingContainer}>
            <ActivityIndicator size="large" color={theme.COLORS.primary} />
            <Text style={styles.statusText}>Finalizing Audio...</Text>
          </View>
        ) : !finalOriginalWav ? (
          <View style={styles.controlsContainer}>
            <Text style={styles.statusText}>
              {!isRecording && !isPaused ? "Ready to record" : isPaused ? "Recording paused" : "Denoising in Real-time"}
            </Text>

            {!isRecording && !isPaused ? (
              <View style={styles.sliderContainer}>
                <CustomSlider
                  label="Attenuation Limit"
                  value={attenLimDb}
                  onValueChange={setAttenLimDb}
                  min={0}
                  max={40}
                  steps={ALSTEPS}
                  info={`Limits how aggressively the AI removes noise.\n0dB = most aggressive (quietest background).\n40dB = preserves nearly all ambient sound.\nStart at 0dB and increase if audio sounds too processed.`}
                />
              </View>
            ) : null}

            {!isRecording && !isPaused ? (
              <Pressable 
                style={({ pressed }) => [
                  styles.recordButton,
                  { opacity: pressed ? 0.9 : 1 }
                ]} 
                onPress={startRecording}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true, radius: 70 }}
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
                    { backgroundColor: "rgba(255, 255, 255, 0.1)", opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={isPaused ? resumeRecording : pauseRecording}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true, radius: 32 }}
                >
                  <Feather name={isPaused ? "play" : "pause"} size={28} color={theme.COLORS.text} />
                </Pressable>

                <Pressable 
                  style={({ pressed }) => [
                    styles.stopButton,
                    { opacity: pressed ? 0.8 : 1 }
                  ]} 
                  onPress={stopRecording}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.2)', borderless: true, radius: 50 }}
                >
                  <View style={styles.stopButtonInner}>
                    <Feather name="square" size={32} color={theme.COLORS.white} />
                  </View>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Feather name="volume-2" size={20} color={theme.COLORS.subtext} />
                <Text style={styles.resultTitle}>Original Audio</Text>
              </View>
              <AudioPlayer uri={finalOriginalWav.uri} name="Original recording" />
              <View style={styles.resultActions}>
                <SaveButton
                  file={finalOriginalWav}
                  label="Save Original"
                  savedLabel="Saved"
                  albumName="DeepDenoiser/Recordings"
                  style={[theme.Styles.button, styles.saveSubButton]}
                  onError={(err) => { setError(err); setIsErrorModalVisible(true); }}
                />
                <ShareBtn uri={finalOriginalWav.uri} />
              </View>
            </View>

            <View style={[styles.resultCard, { borderColor: theme.COLORS.success, borderWidth: 1, marginTop: 24 }]}>
              <View style={styles.resultHeader}>
                <View style={styles.zapIcon}>
                  <Feather name="zap" size={16} color={theme.COLORS.background} />
                </View>
                <Text style={[styles.resultTitle, { color: theme.COLORS.success }]}>Denoised Audio</Text>
              </View>
              <AudioPlayer uri={finalDenoisedWav!.uri} name="Denoised recording" />
              <View style={styles.resultActions}>
                <SaveButton
                  file={finalDenoisedWav}
                  label="Save Denoised"
                  savedLabel="Saved"
                  albumName="DeepDenoiser/Recordings"
                  style={[theme.Styles.button, styles.saveSubButton, { backgroundColor: theme.COLORS.success }]}
                  savedBg={theme.COLORS.success}
                  onError={(err) => { setError(err); setIsErrorModalVisible(true); }}
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
              <Feather name="refresh-cw" size={18} color={theme.COLORS.primary} />
              <Text style={[theme.Styles.buttonText, { color: theme.COLORS.primary }]}>Record New</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'center',
    paddingBottom: 100,
    // paddingHorizontal: theme.SPACING.medium,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    marginBottom: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  pulseCircle: {
    position: 'absolute',
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSubButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newRecordButton: {
    marginTop: 48,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 12,
  }
});
