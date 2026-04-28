import AudioPlayer from "@/src/components/audioPlayer";
import ErrorModal from "@/src/components/ErrorModal";
import * as theme from "@/src/constants/theme";
import { DeepFilterNet } from "@/src/scripts/Denoiser";
import { PCMtoWav, saveToDevice, writePCMChunk } from "@/src/scripts/formatHandler";
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SAMPLE_RATE = 48000;
const HOP_SIZE = 512;

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

  const [error, setError] = useState<Error | null>(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

  const denoiserRef = useRef<DeepFilterNet | null>(null);
  const audioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const processingQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isStoppingRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
      if (isRecording) stopAudioRecording();
      denoiserRef.current?.release();
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      Animated.loop(
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
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused]);

  const handleAudioStream = async (event: AudioDataEvent) => {
    if (isPaused || !denoiserRef.current || isStoppingRef.current) return;

    const float32Data = event.data as Float32Array;
    if (!float32Data || float32Data.length === 0) return;

    // Use a processing queue to ensure audio chunks are handled sequentially
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
          setIsProcessing(true);

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
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("Error in audio stream processing:", err);
      }
    });
  };

  const startRecording = async () => {
    try {
      if (!denoiserReady) {
        Alert.alert("Wait", "Denoiser is still initializing...");
        return;
      }

      // Initialize files
      const timestamp = Date.now();
      const origPcm = new fs.File(fs.Paths.cache, `orig_${timestamp}.pcm`);
      const denPcm = new fs.File(fs.Paths.cache, `den_${timestamp}.pcm`);

      // We must create the files explicitly for expo-file-system File API if we want to write/append
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
      denoiserRef.current?.setupStreaming(0);

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
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsErrorModalVisible(true);
    }
  };

  const stopRecording = async () => {
    try {
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
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsErrorModalVisible(true);
    } finally {
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

  return (
    <SafeAreaView style={theme.Styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={isRecording}>
          <Feather name="arrow-left" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Recorder</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(durationMs)}</Text>
          {isRecording && !isPaused && (
            <View style={styles.recordingIndicator}>
              <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.recordingDot} />
            </View>
          )}
        </View>

        {!finalOriginalWav ? (
          <View style={styles.controlsContainer}>
            <Text style={styles.statusText}>
              {!isRecording ? "Ready to record" : isPaused ? "Recording paused" : "Denoising in Real-time"}
            </Text>

            {!isRecording ? (
              <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                <View style={styles.recordButtonInner}>
                  <Feather name="mic" size={40} color={theme.COLORS.white} />
                </View>
                <Text style={styles.buttonLabel}>Tap to Start</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.activeControls}>
                <TouchableOpacity
                  style={[styles.controlCircle, { backgroundColor: "rgba(255, 255, 255, 0.1)" }]}
                  onPress={isPaused ? resumeRecording : pauseRecording}
                >
                  <Feather name={isPaused ? "play" : "pause"} size={28} color={theme.COLORS.text} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <View style={styles.stopButtonInner}>
                    <Feather name="square" size={32} color={theme.COLORS.white} />
                  </View>
                </TouchableOpacity>

                <View style={styles.processingWrapper}>
                  {isProcessing && <ActivityIndicator size="small" color={theme.COLORS.primary} />}
                </View>
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
              <TouchableOpacity
                style={[theme.Styles.button, styles.saveSubButton]}
                onPress={() => saveToDevice(finalOriginalWav)}
              >
                <Feather name="download" size={18} color={theme.COLORS.background} />
                <Text style={theme.Styles.buttonText}>Save Original</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.resultCard, { borderColor: theme.COLORS.success, borderWidth: 1, marginTop: 24 }]}>
              <View style={styles.resultHeader}>
                <View style={styles.zapIcon}>
                  <Feather name="zap" size={16} color={theme.COLORS.background} />
                </View>
                <Text style={[styles.resultTitle, { color: theme.COLORS.success }]}>Denoised Audio</Text>
              </View>
              <AudioPlayer uri={finalDenoisedWav!.uri} name="Denoised recording" />
              <TouchableOpacity
                style={[theme.Styles.button, styles.saveSubButton, { backgroundColor: theme.COLORS.success }]}
                onPress={() => saveToDevice(finalDenoisedWav!)}
              >
                <Feather name="download" size={18} color={theme.COLORS.background} />
                <Text style={theme.Styles.buttonText}>Save Denoised</Text>
              </TouchableOpacity>
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
    paddingHorizontal: theme.SPACING.medium,
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
  processingWrapper: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center'
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
  zapIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSubButton: {
    marginTop: 24,
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
