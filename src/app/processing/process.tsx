import AdvanceSettings from "@/src/components/advanceSettings";
import AudioPlayer from "@/src/components/audioPlayer";
import ErrorModal from "@/src/components/ErrorModal";
import ShareBtn from "@/src/components/shareBtn";
import VideoPlayer from "@/src/components/videoPlayer";
import * as theme from "@/src/constants/theme";
import { trackAppError, trackAppEvent } from "@/src/scripts/analytics";
import { DeepFilterNet } from "@/src/scripts/Denoiser";
import {
  decodeToPCMFile,
  mergeAudioVideo,
  PCMtoWav,
  readPCMChunks,
  renameFile,
  sanitizeFileName,
  saveToDevice,
  writePCMChunk,
} from "@/src/scripts/formatHandler";
import Feather from "@expo/vector-icons/Feather";
import { Asset } from "expo-asset";
import * as fs from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProcessScreen() {
  const router = useRouter();
  const { fileuri: rawFileUri, filename: rawFilename } = useLocalSearchParams<{ fileuri: string, filename: string }>();
  const fileuri = decodeURIComponent(rawFileUri || "");
  const filename = decodeURIComponent(rawFilename || "");

  const [originalFile, setOriginalFile] = useState<fs.File | null>(null);
  const [isFileTypeVideo, setIsFileTypeVideo] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [denoising, setDenoising] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [denoisedFile, setDenoisedFile] = useState<fs.File | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [attenLimDb, setAttenLimDb] = useState(0);
  const [normalize, setNormalize] = useState<{
    toggle: boolean;
    targetRMS: number;
    maxPeakDb: number;
  }>({
    toggle: false,
    targetRMS: -14.0,
    maxPeakDb: -1.0,
  });

  const [error, setError] = useState<Error | null>(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

  const timeHandler = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    if (h > 0) return `${h}h:${m}m:${s}s`;
    if (m > 0) return `${m}m:${s}s`;
    return `${s}s`;
  };

  useEffect(() => {
    if (!fileuri) {
      router.navigate("/");
      return;
    }

    const processFile = () => {
      try {
        setIsLoading(true);
        const inputFile = new fs.File(fileuri);
        setOriginalFile(inputFile);
        const isVideo = !!inputFile.type?.startsWith("video") ||
          filename.toLowerCase().endsWith(".mp4") ||
          filename.toLowerCase().endsWith(".mov") ||
          filename.toLowerCase().endsWith(".mkv") ||
          filename.toLowerCase().endsWith(".avi") ||
          filename.toLowerCase().endsWith(".m4v") ||
          filename.toLowerCase().endsWith(".webm");
        setIsFileTypeVideo(isVideo);
      } catch (error) {
        console.error("Error preparing file:", error);
        setError(error instanceof Error ? error : new Error(String(error)));
        setIsErrorModalVisible(true);
      } finally {
        setIsLoading(false);
      }
    };

    processFile();
  }, [fileuri, filename, router]);

  const handleDenoise = async () => {
    if (!originalFile) return;

    setDenoising(true);
    setProgress(0);
    setProgressText("Initializing...");
    setEta(null);
    setDenoisedFile(null);
    try {
      const startTime = Date.now();
      setProgressText("Extracting audio...");
      const { file: pcmFile, sampleRate } = await decodeToPCMFile(originalFile);
      const totalSamples = pcmFile.size / 2;

      let globalGain = 1.0;
      if (normalize.toggle) {
        setProgressText("Analyzing loudness...");
        let maxPeak = 0;
        let sumSquares = 0;
        let analyzedSamples = 0;
        await readPCMChunks(pcmFile, 1024 * 1024, async (chunk, inputSamples) => {
          for (let i = 0; i < chunk.length; i++) {
            const val = chunk[i];
            sumSquares += val * val;
            const abs = Math.abs(val);
            if (abs > maxPeak) maxPeak = abs;
          }
          analyzedSamples += inputSamples;
          setProgress(Math.min(Math.round((analyzedSamples / totalSamples) * 100), 100));
        });

        const currentRms = Math.sqrt(sumSquares / totalSamples);
        const targetRms = Math.pow(10, normalize.targetRMS / 20);
        const targetPeak = Math.pow(10, normalize.maxPeakDb / 20);

        const rmsGain = currentRms > 1e-8 ? targetRms / currentRms : 1.0;
        const peakGain = maxPeak > 1e-8 ? targetPeak / maxPeak : 1.0;

        globalGain = Math.min(rmsGain, peakGain);
        if (globalGain > 5.0) globalGain = 5.0;
      }

      setProgressText("Optimizing AI model...");
      const denoiser = new DeepFilterNet();
      const modelAsset = Asset.fromModule(require("@/assets/model/denoiser_model.ort"));
      await modelAsset.downloadAsync();
      await denoiser.loadModel(modelAsset.localUri!);

      setProgressText("Removing noise...");
      setProgress(0);
      const model_startTime = Date.now();

      const targetRate = 48000;
      const hopSize = 512;
      const fftSize = 960;
      denoiser.setupStreaming(attenLimDb);

      const denoisedPcmFile = new fs.File(fs.Paths.cache, `denoised_${Date.now()}.pcm`);
      if (denoisedPcmFile.exists) denoisedPcmFile.delete();

      let inputBuffer = new Float32Array(fftSize);
      let processedInputSamples = 0;
      let firstWrite = true;
      let outputSamplesSkipped = 0;
      const samplesPerChunk = sampleRate * 5; // 5s chunks for better responsiveness

      await readPCMChunks(pcmFile, samplesPerChunk, async (chunk, inputSamples) => {
        if (normalize.toggle) {
          for (let i = 0; i < chunk.length; i++) chunk[i] *= globalGain;
        }

        const combined = new Float32Array(inputBuffer.length + chunk.length);
        combined.set(inputBuffer);
        combined.set(chunk, inputBuffer.length);

        const numFrames = Math.floor(combined.length / hopSize);
        const processLen = numFrames * hopSize;
        const toProcess = combined.subarray(0, processLen);
        inputBuffer = combined.slice(processLen);

        const denoisedOutput = new Float32Array(processLen);
        for (let i = 0; i < processLen; i += hopSize) {
          const frame = toProcess.subarray(i, i + hopSize);
          const outFrame = await denoiser.processFrame(frame);
          denoisedOutput.set(outFrame, i);
        }

        let finalOutputChunk = denoisedOutput;
        if (outputSamplesSkipped < fftSize) {
          const skip = Math.min(fftSize - outputSamplesSkipped, finalOutputChunk.length);
          finalOutputChunk = finalOutputChunk.subarray(skip);
          outputSamplesSkipped += skip;
        }

        if (finalOutputChunk.length > 0) {
          await writePCMChunk(denoisedPcmFile, finalOutputChunk, !firstWrite);
          firstWrite = false;
        }

        processedInputSamples += inputSamples;
        const p = Math.min(Math.round((processedInputSamples / totalSamples) * 100), 100);
        setProgress(p);

        if (p > 0 && Number.isFinite(p)) {
          const elapsed = (Date.now() - model_startTime) / 1000;
          const remaining = (elapsed / (p / 100)) - elapsed;
          if (remaining > 0 && Number.isFinite(remaining)) {
            setEta(`${timeHandler(Math.ceil(remaining))} left`);
          }
        }
      }, sampleRate, targetRate);

      if (inputBuffer.length > 0) {
        const padded = new Float32Array(hopSize);
        padded.set(inputBuffer);
        const outFrame = await denoiser.processFrame(padded);
        let finalFrame = outFrame.subarray(0, inputBuffer.length);
        if (outputSamplesSkipped < fftSize) {
          const skip = Math.min(fftSize - outputSamplesSkipped, finalFrame.length);
          finalFrame = finalFrame.subarray(skip);
        }
        if (finalFrame.length > 0) {
          await writePCMChunk(denoisedPcmFile, finalFrame, !firstWrite);
        }
      }

      setEta(null);
      setProgressText("Finalizing media...");

      const originalBase = filename.split('.').slice(0, -1).join('.');
      const finalWavFile = await PCMtoWav(denoisedPcmFile);
      renameFile(finalWavFile, `${sanitizeFileName(originalBase)}_denoised.wav`);
      if (isFileTypeVideo) {
        setProgressText("Merging audio with video...");
        const finalVideoFile = await mergeAudioVideo(originalFile, finalWavFile);
        renameFile(finalVideoFile, `${sanitizeFileName(originalBase)}_denoised.mp4`);
        setDenoisedFile(finalVideoFile);
      } else {
        setDenoisedFile(finalWavFile);
      }

      const duration = (Date.now() - startTime) / 1000;
      setProcessingTime(duration);

      trackAppEvent("denoise_complete", {
        duration: duration,
        file_type: isFileTypeVideo ? "video" : "audio",
      });

      if (pcmFile.exists) pcmFile.delete();
      if (denoisedPcmFile.exists) denoisedPcmFile.delete();

    } catch (error) {
      console.error("Error during denoising:", error);
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err);
      setIsErrorModalVisible(true);
      trackAppError(err, { context: "handleDenoise" });
    } finally {
      setDenoising(false);
      setProgressText("");
      setEta(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[theme.Styles.container, theme.Styles.centered]}>
        <ActivityIndicator size="large" color={theme.COLORS.primary} />
        <Text style={styles.loadingText}>Loading media...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={theme.Styles.container}>
      <StatusBar style="light" />
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.navigate('/(tabs)')}
          disabled={denoising}
        >
          <Feather name="arrow-left" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Denoise {isFileTypeVideo ? 'Video' : 'Audio'}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="file" size={16} color={theme.COLORS.subtext} />
            <Text style={styles.sectionTitle}>Original File</Text>
          </View>
          <View style={styles.playerWrapper}>
            {originalFile && (
              isFileTypeVideo ? (
                <VideoPlayer uri={originalFile.uri} name={filename} />
              ) : (
                <AudioPlayer uri={originalFile.uri} name={filename} />
              )
            )}
          </View>
        </View>

        <AdvanceSettings
          attenLimDb={attenLimDb}
          onAttenLimDbChange={setAttenLimDb}
          normalize={normalize}
          onNormalizeChange={setNormalize}
        />

        {denoising && (
          <View style={[theme.Styles.card, styles.progressCard]}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{progressText}</Text>
              {eta && <Text style={styles.etaText}>{eta}</Text>}
            </View>
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
          </View>
        )}

        {denoisedFile && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultBadge}>
                <Feather name="check" size={12} color={theme.COLORS.white} />
                <Text style={styles.resultBadgeText}>Cleaned</Text>
              </View>
              <View style={styles.timeStats}>
                <Feather name="clock" size={14} color={theme.COLORS.subtext} />
                <Text style={styles.timeText}>{timeHandler(processingTime)}</Text>
              </View>
            </View>

            <View style={styles.playerWrapper}>
              {isFileTypeVideo ? (
                <VideoPlayer uri={denoisedFile.uri} name={denoisedFile.name} />
              ) : (
                <AudioPlayer uri={denoisedFile.uri} name={denoisedFile.name} />
              )}
            </View>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={async () => {
                  if (!denoisedFile) return;
                  const saved = await saveToDevice(denoisedFile);
                  if (!saved) {
                    setError(new Error("Media library access is required to save files. Grant storage permission in Settings."));
                    setIsErrorModalVisible(true);
                  }
                }}
              >
                <Feather name="download" size={18} color={theme.COLORS.background} />
                <Text style={styles.saveBtnText}>Save to Gallery</Text>
              </TouchableOpacity>
              <ShareBtn uri={denoisedFile?.uri || ""} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!denoisedFile ? (
          <TouchableOpacity
            style={[
              theme.Styles.button,
              denoising && theme.Styles.disabledButton,
              styles.mainActionBtn
            ]}
            onPress={handleDenoise}
            disabled={denoising}
          >
            {denoising ? (
              <ActivityIndicator color={theme.COLORS.background} style={{ marginRight: 10 }} />
            ) : (
              <Feather name="zap" size={20} color={theme.COLORS.background} style={{ marginRight: 10 }} />
            )}
            <Text style={theme.Styles.buttonText}>
              {denoising ? "Processing..." : "Start Deep Denoising"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.postProcessActions}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => { setDenoisedFile(null); handleDenoise(); }}
            >
              <Feather name="refresh-cw" size={20} color={theme.COLORS.primary} style={{ marginRight: 10 }} />
              <Text style={[theme.Styles.buttonText, { color: theme.COLORS.primary }]}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[theme.Styles.button, styles.mainActionBtn, { flex: 1.2 }]}
              onPress={() => router.replace("/")}
            >
              <Feather name="plus" size={20} color={theme.COLORS.background} style={{ marginRight: 10 }} />
              <Text style={theme.Styles.buttonText}>New File</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <ErrorModal visible={isErrorModalVisible} error={error} onClose={() => setIsErrorModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 10,
  },
  backButton: {
    position: "absolute",
    left: 0,
    padding: 8,
  },
  headerTitle: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.heading,
    fontWeight: "800",
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: theme.COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.COLORS.subtext,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: theme.FONT_SIZE.body,
    color: theme.COLORS.subtext,
    fontWeight: "600",
  },
  playerWrapper: {
    padding: 0,
  },
  progressCard: {
    marginTop: 20,
    padding: 20,
    borderColor: "rgba(0, 229, 255, 0.3)",
    backgroundColor: theme.COLORS.surface, // "rgba(0, 229, 255, 0.02)",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressLabel: {
    color: theme.COLORS.text,
    fontSize: theme.FONT_SIZE.body,
    fontWeight: "700",
  },
  progressBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: theme.COLORS.border,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.COLORS.primary,
  },
  progressPercent: {
    color: theme.COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
    width: 45,
    textAlign: "right",
  },
  etaText: {
    color: theme.COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  resultCard: {
    backgroundColor: theme.COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.COLORS.success,
    shadowColor: theme.COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  resultBadge: {
    flexDirection: "row",
    backgroundColor: theme.COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: "center",
    gap: 6,
  },
  resultBadgeText: {
    color: theme.COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  resultActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  saveBtn: {
    backgroundColor: theme.COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    flex: 1,
    gap: 10,
  },
  saveBtnText: {
    color: theme.COLORS.background,
    fontWeight: "800",
    fontSize: 14,
  },
  timeStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    color: theme.COLORS.subtext,
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.SPACING.medium,
    paddingBottom: theme.SPACING.xlarge,
    backgroundColor: theme.COLORS.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  mainActionBtn: {
    borderRadius: 20,
    height: 60,
  },
  postProcessActions: {
    flexDirection: "row",
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: theme.COLORS.primary,
    borderRadius: 20,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  }
});
