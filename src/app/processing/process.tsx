import AdvanceSettings from "@/src/components/advanceSettings";
import ModelSelector from "@/src/components/ModelSelector";
import AudioPlayer from "@/src/components/audioPlayer";
import DonationModal from "@/src/components/DonationModal";
import DonationReminderModal from "@/src/components/DonationReminderModal";
import ErrorModal from "@/src/components/ErrorModal";
import SaveButton from "@/src/components/SaveButton";
import ShareBtn from "@/src/components/shareBtn";
import VideoPlayer from "@/src/components/videoPlayer";
import * as theme from "@/src/constants/theme";
import {
  acquireBackgroundProcessing,
  type BackgroundRelease,
} from "@/src/scripts/backgroundProcessing";
import { trackAppEvent } from "@/src/scripts/analytics";
import { MODELS } from "@/src/scripts/models/registry";
import { getEngine } from "@/src/scripts/models/runtime";
import { isVideoFile } from "@/src/scripts/mediaFormats";
import { DEFAULT_STRENGTH } from "@/src/scripts/models/strength";
import {
  DEFAULT_MODEL_ID,
  getModel,
  type ModelId,
} from "@/src/scripts/models/registry";
import {
  buildCacheKey,
  buildDecodeKey,
  buildDenoiseKey,
  lookupCachedOutput,
  lookupDecodedPCM,
  lookupDenoisedPCM,
  placeOutput,
  stagePcmPath,
  storeCachedOutput,
  storeDecodedPCM,
  storeDenoisedPCM,
} from "@/src/scripts/denoiseCache";
import {
  alignPCMToSampleCount,
  decodeToPCMFile,
  mergeAudioVideo,
  PCMtoWav,
  readPCMChunks,
  sanitizeFileName,
  writePCMChunk,
} from "@/src/scripts/formatHandler";
import {
  getSettings,
  incrementDenoiseCount,
  markDonationPromptShown,
  shouldShowDonationReminder,
} from "@/src/scripts/settings";
import {
  DEFAULT_SILENCE_TRIM,
  SilenceTrimSettings,
} from "@/src/scripts/silenceTrim";
import Feather from "@expo/vector-icons/Feather";
import * as fs from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Host, LoadingIndicator } from "@expo/ui/jetpack-compose";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import { useStyles } from "@/src/hooks/useStyles";

// Outputs cached by older builds can carry model-alignment padding that the
// new mux cannot see, so both cache layers are re-namespaced once.
const AV_SYNC_CACHE_TAG = ":avsync1";

export default function ProcessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fileuri: rawFileUri, filename: rawFilename } = useLocalSearchParams<{
    fileuri: string;
    filename: string;
  }>();
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
  const [strength, setStrength] = useState(DEFAULT_STRENGTH);
  const [silenceTrim, setSilenceTrim] =
    useState<SilenceTrimSettings>(DEFAULT_SILENCE_TRIM);
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
  const [isDonationReminderVisible, setIsDonationReminderVisible] =
    useState(false);
  const [isDonationModalVisible, setIsDonationModalVisible] = useState(false);
  // Model chosen in Settings; both screens read the same persisted value.
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(DEFAULT_MODEL_ID);
  const { colorScheme } = useTheme();
  const styles = useStyles(makeStyles);

  const timeHandler = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    if (h > 0) return `${h}h:${m}m:${s}s`;
    if (m > 0) return `${m}m:${s}s`;
    return `${s}s`;
  };

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((settings) => {
        if (cancelled) return;
        const stored = settings.selectedModel as ModelId;
        setSelectedModelId(stored in MODELS ? stored : DEFAULT_MODEL_ID);
      })
      .catch(() => {
        // Fall back to the bundled default; processing must never be blocked
        // by a settings read failure.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        setIsFileTypeVideo(isVideoFile(filename, inputFile.type));
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

    // Silence trim is not available for video files (internal cuts would
    // desync the video track), so it is forcibly disabled for them.
    const effectiveSilenceTrim: SilenceTrimSettings = isFileTypeVideo
      ? { ...silenceTrim, enabled: false }
      : silenceTrim;

    // Reuse a previously denoised result for the same input + settings
    // instead of re-running the whole pipeline from scratch.
    const cacheKey =
      buildCacheKey(originalFile, {
        strength,
        modelId: selectedModelId,
        normalize,
        silenceTrim: effectiveSilenceTrim,
      }) + AV_SYNC_CACHE_TAG;
    try {
      const cached = await lookupCachedOutput(cacheKey);
      if (cached) {
        setDenoisedFile(cached);
        setProcessingTime(0);
        return;
      }
    } catch (err) {
      console.warn("Denoise cache lookup failed, proceeding fresh:", err);
    }

    setDenoising(true);
    setProgress(0);
    setProgressText("Initializing...");
    setEta(null);
    setDenoisedFile(null);
    // One shared foreground service for every in-flight pass. Released in the
    // finally block below, so leaving the app mid-denoise keeps the JS thread
    // alive until the output is cached and written.
    let releaseBackground: BackgroundRelease | null = null;
    try {
      releaseBackground = await acquireBackgroundProcessing();
      const startTime = Date.now();

      // ---- Layer 1: decoded PCM (input identity only) ----
      // Re-denosing the same file reuses the extracted+decoded PCM instead of
      // re-running the native decode (expensive MediaCodec pass).
      const decodeKey = buildDecodeKey(originalFile);
      let pcmFile: fs.File;
      let sampleRate: number;
      const cachedDecode = await lookupDecodedPCM(decodeKey);
      if (cachedDecode) {
        pcmFile = cachedDecode.file;
        sampleRate = cachedDecode.sampleRate;
        setProgressText("Reusing cached audio...");
      } else {
        setProgressText("Extracting audio...");
        const decoded = await decodeToPCMFile(
          originalFile,
          new fs.File(fs.Paths.cache, stagePcmPath("stage_dec")).uri,
        );
        pcmFile = decoded.file;
        sampleRate = decoded.sampleRate;
        try {
          await storeDecodedPCM(decodeKey, pcmFile, sampleRate);
        } catch (err) {
          console.warn("Failed to store decoded PCM cache:", err);
        }
      }
      const totalSamples = pcmFile.size / 2;

      let globalGain = 1.0;
      if (normalize.toggle) {
        setProgressText("Analyzing loudness...");
        let maxPeak = 0;
        let sumSquares = 0;
        let analyzedSamples = 0;
        await readPCMChunks(
          pcmFile,
          1024 * 1024,
          async (chunk, inputSamples) => {
            for (let i = 0; i < chunk.length; i++) {
              const val = chunk[i];
              sumSquares += val * val;
              const abs = Math.abs(val);
              if (abs > maxPeak) maxPeak = abs;
            }
            analyzedSamples += inputSamples;
            setProgress(
              Math.min(Math.round((analyzedSamples / totalSamples) * 100), 100),
            );
          },
        );

        const currentRms = Math.sqrt(sumSquares / totalSamples);
        const targetRms = Math.pow(10, normalize.targetRMS / 20);
        const targetPeak = Math.pow(10, normalize.maxPeakDb / 20);

        const rmsGain = currentRms > 1e-8 ? targetRms / currentRms : 1.0;
        const peakGain = maxPeak > 1e-8 ? targetPeak / maxPeak : 1.0;

        globalGain = Math.min(rmsGain, peakGain);
        if (globalGain > 5.0) globalGain = 5.0;
      }

      // ---- Layer 2: denoised PCM (input + denoise settings) ----
      // Only the silence-trim settings changed? Reuse the previously denoised
      // PCM and just re-apply the (cheap) WAV wrap + trim — no ONNX pass at
      // all. Trim off = re-wrap the denoised audio at full length.
      const denoiseKey =
        buildDenoiseKey(originalFile, {
          strength,
          modelId: selectedModelId,
          normalize,
        }) + AV_SYNC_CACHE_TAG;
      let denoisedPcmFile: fs.File;
      // Rate of the denoised PCM. Equals the model's native rate, which is not
      // always 48 kHz (the 16 kHz model would otherwise be written as a 3x
      // fast WAV).
      let denoisedRate = getModel(selectedModelId).sampleRate;
      const cachedDenoise = await lookupDenoisedPCM(denoiseKey);
      if (cachedDenoise) {
        denoisedPcmFile = cachedDenoise;
        setProgressText("Reusing denoised audio...");
      } else {
        setProgressText("Optimizing AI model...");
        const engine = await getEngine(selectedModelId);
        const model = getModel(selectedModelId);
        // Engines are cached process-wide. Clear recurrent/overlap state so a
        // new file never inherits the tail of the previous one.
        engine.resetStream?.();

        setProgressText("Removing noise...");
        setProgress(0);
        const model_startTime = Date.now();

        // Resample to the selected model's native rate; a 16 kHz model must not
        // be fed 48 kHz audio, and the reverse would silently lose bandwidth.
        const targetRate = engine.sampleRate;
        denoisedRate = targetRate;
        // Models impose an algorithmic delay; trim it once so the written PCM
        // lines up with the source instead of drifting ahead of the video.
        const alignmentDelay = engine.alignmentDelaySamples;

        denoisedPcmFile = new fs.File(fs.Paths.cache, stagePcmPath("stage_dn"));

        // Recurrent models need real input silence to absorb their delay;
        // a streaming STFT carries its own leading zeros in the output.
        let inputBuffer: Float32Array = new Float32Array(
          engine.alignmentPrefixSamples ?? alignmentDelay,
        );
        let processedInputSamples = 0;
        // `totalSamples` above counts SOURCE-rate samples; this counts samples
        // at the model rate, i.e. exactly what the source becomes after the
        // per-chunk resampling below.
        let expectedSamplesAtModelRate = 0;
        let firstWrite = true;
        let outputSamplesSkipped = 0;
        let gainPending = normalize.toggle;
        const samplesPerChunk = sampleRate * 5; // 5s chunks for better responsiveness

        await readPCMChunks(
          pcmFile,
          samplesPerChunk,
          async (chunk, inputSamples) => {
            if (gainPending) {
              for (let i = 0; i < chunk.length; i++) chunk[i] *= globalGain;
            }

            const combined: Float32Array = new Float32Array(
              inputBuffer.length + chunk.length,
            );
            combined.set(inputBuffer);
            combined.set(chunk, inputBuffer.length);

            // The engine consumes whole model chunks and returns exactly as
            // many samples as it was given, so the leftover tail carries over.
            const streamStep = await engine.denoiseStream(combined);
            expectedSamplesAtModelRate += chunk.length;
            inputBuffer = streamStep.rest;

            let finalOutputChunk = streamStep.pcm;
            if (outputSamplesSkipped < alignmentDelay) {
              const skip = Math.min(
                alignmentDelay - outputSamplesSkipped,
                finalOutputChunk.length,
              );
              finalOutputChunk = finalOutputChunk.subarray(skip);
              outputSamplesSkipped += skip;
            }

            if (finalOutputChunk.length > 0) {
              await writePCMChunk(denoisedPcmFile, finalOutputChunk, !firstWrite);
              firstWrite = false;
            }

            processedInputSamples += inputSamples;
            const p = Math.min(
              Math.round((processedInputSamples / totalSamples) * 100),
              100,
            );
            setProgress(p);

            if (p > 0 && Number.isFinite(p)) {
              const elapsed = (Date.now() - model_startTime) / 1000;
              const remaining = elapsed / (p / 100) - elapsed;
              if (remaining > 0 && Number.isFinite(remaining)) {
                setEta(`${timeHandler(Math.ceil(remaining))} left`);
              }
            }
          },
          sampleRate,
          targetRate,
        );

        // Always flush, even with no carry-over: a one-hop-delayed model still
        // owes the last hop's output before the PCM file is complete.
        const finalStep = await engine.denoiseFinal(inputBuffer);
        let finalFrame = finalStep.pcm;
        if (outputSamplesSkipped < alignmentDelay) {
          const skip = Math.min(alignmentDelay - outputSamplesSkipped, finalFrame.length);
          finalFrame = finalFrame.subarray(skip);
        }
        if (finalFrame.length > 0) {
          await writePCMChunk(denoisedPcmFile, finalFrame, !firstWrite);
        }

        // The flush may emit a few samples more or fewer than the source had.
        // Force sample-exact length so the audio timeline matches the decoded
        // source — and therefore the video — instead of starting late.
        await alignPCMToSampleCount(denoisedPcmFile, expectedSamplesAtModelRate);

        void model;

        try {
          await storeDenoisedPCM(denoiseKey, denoisedPcmFile);
        } catch (err) {
          console.warn("Failed to store denoised PCM cache:", err);
        }
      }

      setEta(null);
      setProgressText("Finalizing media...");

      const originalBase = filename.split(".").slice(0, -1).join(".");
      const wavResult = await PCMtoWav(
        denoisedPcmFile,
        denoisedRate,
        effectiveSilenceTrim,
      );
      let outputFile: fs.File;
      if (isFileTypeVideo) {
        // Mux against the cache temp WAV, then discard it — only the final MP4
        // is worth keeping in persistent storage (indexed by the cache).
        // The silence-trim offsets are passed through so the video track is
        // cut by the same window and stays in sync with the trimmed audio.
        setProgressText("Merging audio with video...");
        const finalVideoFile = await mergeAudioVideo(originalFile, wavResult.file, {
          startUs: wavResult.trimStartUs,
          endUs: wavResult.trimEndUs,
          trimmed: wavResult.trimmed,
        });
        try {
          if (wavResult.file.exists) wavResult.file.delete();
        } catch (err) {
          console.warn("Failed to delete intermediate WAV:", err);
        }
        outputFile = await placeOutput(
          finalVideoFile,
          `${sanitizeFileName(originalBase)}_denoised.mp4`,
        );
        setDenoisedFile(outputFile);
      } else {
        outputFile = await placeOutput(
          wavResult.file,
          `${sanitizeFileName(originalBase)}_denoised.wav`,
        );
        setDenoisedFile(outputFile);
      }

      // Persist the result so re-denoising the same file is instant.
      try {
        await storeCachedOutput(cacheKey, outputFile);
      } catch (err) {
        console.warn("Failed to store denoise cache entry:", err);
      }

      const duration = (Date.now() - startTime) / 1000;
      setProcessingTime(duration);

      trackAppEvent("denoise_complete", {
        duration: duration,
        file_type: isFileTypeVideo ? "video" : "audio",
      });
    } catch (error) {
      console.error("Error during denoising:", error);
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err);
      setIsErrorModalVisible(true);
    } finally {
      await releaseBackground?.();
      setDenoising(false);
      setProgressText("");
      setEta(null);
    }
  };

  useEffect(() => {
    if (!denoisedFile) return;
    (async () => {
      await incrementDenoiseCount();
      const shouldShow = await shouldShowDonationReminder();
      if (shouldShow) {
        await markDonationPromptShown();
        setIsDonationReminderVisible(true);
      }
    })();
  }, [denoisedFile]);

  if (isLoading) {
    return (
      <SafeAreaView style={[theme.Styles.container, theme.Styles.centered]}>
        <Host matchContents colorScheme={colorScheme}>
          <LoadingIndicator color={theme.COLORS.primary} />
        </Host>
        <Text style={styles.loadingText}>Loading media...</Text>
      </SafeAreaView>
    );
  }

  return (
    // <SafeAreaView>
    <SafeAreaView style={theme.Styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.navigate("/(tabs)")}
          disabled={denoising}
        >
          <Feather name="arrow-left" size={24} color={theme.COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Denoise {isFileTypeVideo ? "Video" : "Audio"}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="file" size={16} color={theme.COLORS.subtext} />
            <Text style={styles.sectionTitle}>Original File</Text>
          </View>
          <View style={styles.playerWrapper}>
            {originalFile &&
              (isFileTypeVideo ? (
                <VideoPlayer uri={originalFile.uri} name={filename} />
              ) : (
                <AudioPlayer uri={originalFile.uri} name={filename} />
              ))}
          </View>
        </View>

        <ModelSelector
          value={selectedModelId}
          onChange={setSelectedModelId}
          disabled={denoising}
        />

        <AdvanceSettings
          strength={strength}
          onStrengthChange={setStrength}
          normalize={normalize}
          onNormalizeChange={setNormalize}
          silenceTrim={silenceTrim}
          onSilenceTrimChange={setSilenceTrim}
          showSilenceTrim={!isFileTypeVideo}
        />

        {denoising && (
          <View style={[theme.Styles.card, styles.progressCard]}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{progressText}</Text>
              {eta && <Text style={styles.etaText}>{eta}</Text>}
            </View>
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
          </View>
        )}

        {denoisedFile && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultBadge}>
                <Feather name="check" size={12} color={theme.COLORS.background} />
                <Text style={styles.resultBadgeText}>Cleaned</Text>
              </View>
              <View style={styles.timeStats}>
                <Feather name="clock" size={14} color={theme.COLORS.subtext} />
                <Text style={styles.timeText}>
                  {timeHandler(processingTime)}
                </Text>
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
              <SaveButton
                file={denoisedFile}
                label="Save to Gallery"
                saveCategory={{
                  kind: "Denoised",
                  media: isFileTypeVideo ? "Video" : "Audio",
                }}
                style={styles.saveBtn}
                onError={(err) => {
                  setError(err);
                  setIsErrorModalVisible(true);
                }}
              />
              <ShareBtn uri={denoisedFile?.uri || ""} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { bottom: insets.bottom }]}>
        {!denoisedFile ? (
          <TouchableOpacity
            style={[
              theme.Styles.button,
              styles.mainActionBtn,
              denoising && styles.processingActionBtn,
            ]}
            onPress={handleDenoise}
            disabled={denoising}
            accessibilityRole="button"
            accessibilityLabel={
              denoising ? `Processing, ${progress}% complete` : "Start Deep Denoising"
            }
            accessibilityState={{ disabled: denoising, busy: denoising }}
          >
            {denoising && (
              <View
                pointerEvents="none"
                style={[styles.processingFill, { width: `${progress}%` }]}
              />
            )}
            <View style={styles.mainActionContent}>
            {denoising ? (
              <Host
                matchContents
                style={styles.processingIndicator}
                colorScheme={colorScheme}
              >
                <LoadingIndicator
                  color={theme.COLORS.background}
                />
              </Host>
            ) : (
              <Feather
                name="zap"
                size={20}
                color={theme.COLORS.background}
                style={{ marginRight: 10 }}
              />
            )}
            <Text style={theme.Styles.buttonText}>
              {denoising ? `${progressText || "Processing..."}  ${progress}%` : "Start Deep Denoising"}
            </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.postProcessActions}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setDenoisedFile(null);
                handleDenoise();
              }}
            >
              <Feather
                name="refresh-cw"
                size={20}
                color={theme.COLORS.primary}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[
                  theme.Styles.buttonText,
                  { color: theme.COLORS.primary },
                ]}
              >
                Try Again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[theme.Styles.button, styles.mainActionBtn, { flex: 1.2 }]}
              onPress={() => router.replace("/")}
            >
              <Feather
                name="plus"
                size={20}
                color={theme.COLORS.background}
                style={{ marginRight: 10 }}
              />
              <Text style={theme.Styles.buttonText}>New File</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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

const makeStyles = () => StyleSheet.create({
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
    borderColor: `${theme.COLORS.primary}4D`,
    backgroundColor: theme.COLORS.surface,
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
    color: theme.COLORS.background,
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    flex: 1,
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
    // bottom: insets.bottom,
    left: 0,
    right: 0,
    padding: theme.SPACING.medium,
    paddingBottom: theme.SPACING.xlarge,
    backgroundColor: theme.COLORS.background,
    borderTopWidth: 1,
    borderTopColor: theme.COLORS.outlineVariant,
  },
  mainActionBtn: {
    borderRadius: 20,
    height: 60,
    overflow: "hidden",
    position: "relative",
  },
  processingActionBtn: {
    backgroundColor: theme.COLORS.border,
  },
  processingFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.COLORS.primary,
  },
  mainActionContent: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  processingIndicator: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
  },
});
