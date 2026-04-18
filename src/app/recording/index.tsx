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

  const [originalPcmFile, setOriginalPcmFile] = useState<fs.File | null>(null);
  const [denoisedPcmFile, setDenoisedPcmFile] = useState<fs.File | null>(null);
  const [finalOriginalWav, setFinalOriginalWav] = useState<fs.File | null>(null);
  const [finalDenoisedWav, setFinalDenoisedWav] = useState<fs.File | null>(null);

  const [error, setError] = useState<Error | null>(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

  const denoiserRef = useRef<DeepFilterNet | null>(null);
  const isStoppingRef = useRef(false);

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
    };
  }, []);

  const handleAudioStream = async (event: AudioDataEvent) => {
    if (isPaused || !denoiserRef.current || isStoppingRef.current) return;

    const float32Data = event.data as Float32Array;
    if (!float32Data || float32Data.length === 0) return;

    try {
      // 1. Save original PCM
      if (originalPcmFile) {
        await writePCMChunk(originalPcmFile, float32Data, true);
      }

      // 2. Denoise and save
      if (denoisedPcmFile) {
        setIsProcessing(true);
        const denoiser = denoiserRef.current;

        // Ensure denoiser is setup for streaming if it wasn't
        // Note: setupStreaming resets states, so we should only call it once per recording session
        // or handle it carefully. The original code called setupStreaming(0) in processChunk.
        // We'll call it once when starting.

        const denoisedOutput = new Float32Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i += HOP_SIZE) {
          const frame = float32Data.subarray(i, i + HOP_SIZE);
          // If the last frame is shorter than HOP_SIZE, we might need padding
          if (frame.length < HOP_SIZE) {
            const paddedFrame = new Float32Array(HOP_SIZE);
            paddedFrame.set(frame);
            const outFrame = await denoiser.processFrame(paddedFrame);
            denoisedOutput.set(outFrame.subarray(0, frame.length), i);
          } else {
            const outFrame = await denoiser.processFrame(frame);
            denoisedOutput.set(outFrame, i);
          }
        }
        await writePCMChunk(denoisedPcmFile, denoisedOutput, true);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Error in audio stream processing:", err);
    }
  };

  const startRecording = async () => {
    try {
      if (!denoiserReady) {
        Alert.alert("Wait", "Denoiser is still initializing...");
        return;
      }

      const origPcm = new fs.File(fs.Paths.cache, `orig_${Date.now()}.pcm`);
      const denPcm = new fs.File(fs.Paths.cache, `den_${Date.now()}.pcm`);
      setOriginalPcmFile(origPcm);
      setDenoisedPcmFile(denPcm);
      setFinalOriginalWav(null);
      setFinalDenoisedWav(null);
      isStoppingRef.current = false;

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

      if (originalPcmFile && denoisedPcmFile) {
        // Use our PCMtoWav for consistency, or use the result.fileUri if it's correct
        // Note: result.fileUri from audio-studio is a WAV file of the original audio.
        const origWav = result ? new fs.File(result.fileUri) : await PCMtoWav(originalPcmFile, SAMPLE_RATE);
        const denWav = await PCMtoWav(denoisedPcmFile, SAMPLE_RATE);

        setFinalOriginalWav(origWav);
        setFinalDenoisedWav(denWav);
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsErrorModalVisible(true);
    } finally {
      isStoppingRef.current = false;
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
        <Text style={theme.Styles.title}>Voice Recorder</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(durationMs)}</Text>
          {isRecording && !isPaused && (
            <View style={styles.recordingDot} />
          )}
        </View>

        {!finalOriginalWav ? (
          <View style={styles.controlsContainer}>
            <Text style={styles.statusText}>
              {!isRecording ? "Ready to record" : isPaused ? "Recording paused" : "Recording..."}
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

            <View style={[styles.resultCard, { borderColor: theme.COLORS.success, borderWidth: 1, marginTop: 20 }]}>
              <View style={styles.resultHeader}>
                <Feather name="zap" size={20} color={theme.COLORS.success} />
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
  },
  timerText: {
    fontSize: 72,
    fontWeight: "200",
    color: theme.COLORS.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -2,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.COLORS.error,
    marginLeft: 15,
  },
  statusText: {
    color: theme.COLORS.subtext,
    fontSize: theme.FONT_SIZE.body,
    marginBottom: 40,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
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
    marginTop: 20,
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
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: theme.FONT_SIZE.small,
    fontWeight: "800",
    color: theme.COLORS.subtext,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  saveSubButton: {
    marginTop: 20,
    height: 50,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 10
  },
  newRecordButton: {
    marginTop: 40,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.COLORS.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10
  }
});
